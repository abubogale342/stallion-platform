"use server";

import { requireRole } from "@/services/auth.server";
import { createServerClient } from "@/services/supabase.server";
import { routing } from "@/i18n/routing";
import {
  BLOG_IMAGES_BUCKET,
  blogImagePathFromUrl,
  collectBodyImagePaths,
  isBlogBodyEmpty,
  localeDisplayLabels,
  parseBlogBody,
} from "@/utils/blog";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_BLOG_BODY,
  slugifyBlogTitle,
  type BlogBody,
  type BlogStatus,
} from "@/types/blog";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Json } from "@/types/database.types";

export type BlogActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type BlogTranslationInput = {
  locale: string;
  title: string;
  excerpt: string;
  body: BlogBody;
  status: BlogStatus;
  /** ISO string, or null to let the database stamp it on first publish. */
  publishedAt: string | null;
};

export type SaveBlogPostInput = {
  id?: string;
  slug: string;
  featuredImage: string | null;
  translations: BlogTranslationInput[];
};

/** Blog access is the platform's existing "is an admin" definition. */
const BLOG_ROLES = ["owner", "admin"] as const;

/**
 * Turn database constraint failures into sentences an author can act on.
 * The uniqueness of a slug is enforced by the database, so this is where the
 * brief's "duplicate slug rejected at save" becomes visible to the user.
 */
function friendlyError(error: PostgrestError): string {
  if (error.code === "23505" && error.message.includes("slug")) {
    return "A post with this slug already exists. Choose a different slug.";
  }
  if (error.code === "23514") {
    if (error.message.includes("slug_format")) {
      return "The slug can only contain lowercase letters, numbers and hyphens.";
    }
    if (error.message.includes("title_present")) {
      return "Every language you publish needs a title.";
    }
    if (error.message.includes("locale_format")) {
      return "That language code is not valid.";
    }
    if (error.message.includes("status")) {
      return "Status must be either draft or published.";
    }
  }
  return error.message;
}

function revalidateBlog(slugs: string[]) {
  revalidatePath("/dashboard/blog");
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/blog`);
    for (const slug of slugs) {
      if (slug) revalidatePath(`/${locale}/blog/${slug}`);
    }
  }
  revalidatePath("/sitemap.xml");
}

/**
 * Delete images in the bucket that no post references any more.
 *
 * Every image in use is recorded either in `blog_posts.featured_image` (a bare
 * storage path) or in an image block's `props.url` (a full public URL), so the
 * set of live files is knowable and anything outside it is litter left by a
 * replaced image or a deleted post.
 *
 * Two deliberate safeguards:
 *  - Files younger than the grace period are never touched. An author may have
 *    just uploaded one into an editor they have not saved yet, and deleting it
 *    from under them would be far worse than leaving litter.
 *  - Best effort only. A failure here must never fail the author's save.
 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000; // 1 hour

async function cleanupOrphanBlogImages(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const referenced = new Set<string>();

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("featured_image");
    for (const row of (posts ?? []) as { featured_image: string | null }[]) {
      const path = blogImagePathFromUrl(row.featured_image);
      if (path) referenced.add(path);
    }

    const { data: translations } = await supabase
      .from("blog_post_translations")
      .select("body");
    for (const row of (translations ?? []) as { body: unknown }[]) {
      for (const path of collectBodyImagePaths(parseBlogBody(row.body))) {
        referenced.add(path);
      }
    }

    const storage = supabase.storage.from(BLOG_IMAGES_BUCKET);
    const { data: folders } = await storage.list("blog", { limit: 1000 });
    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    const stale: string[] = [];

    for (const folder of folders ?? []) {
      // Storage returns folders as entries with no id.
      if (folder.id) continue;
      const { data: files } = await storage.list(`blog/${folder.name}`, {
        limit: 1000,
      });
      for (const file of files ?? []) {
        if (!file.id) continue;
        const path = `blog/${folder.name}/${file.name}`;
        if (referenced.has(path)) continue;
        const created = Date.parse(file.created_at ?? "");
        if (Number.isFinite(created) && created > cutoff) continue;
        stale.push(path);
      }
    }

    if (stale.length === 0) return 0;
    const { error } = await storage.remove(stale);
    if (error) return 0;
    return stale.length;
  } catch {
    return 0;
  }
}

export async function saveBlogPost(
  input: SaveBlogPostInput
): Promise<BlogActionResult> {
  const auth = await requireRole(...BLOG_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };

  // Normalise rather than reject: "The Secret Life of Horses" becomes
  // "the-secret-life-of-horses". The database constraint stays as the last
  // line of defence, but an author should never be scolded for typing spaces.
  // An empty slug falls back to the title, so the field can simply be left be.
  const fallbackTitle =
    input.translations.find(
      (translation) => translation.title.trim().length > 0
    )?.title ?? "";
  const slug = slugifyBlogTitle(input.slug) || slugifyBlogTitle(fallbackTitle);

  if (!slug) {
    return {
      ok: false,
      error:
        "Add a title or a slug — the web address needs at least some letters or numbers.",
    };
  }

  // The editor withholds the Published option while a language has no article,
  // but the status survives if the body is emptied afterwards. Rejecting here
  // means an empty article can never reach the public site.
  const labels = localeDisplayLabels(routing.locales);
  const emptyPublished = input.translations.find(
    (translation) =>
      translation.status === "published" &&
      translation.title.trim().length > 0 &&
      isBlogBodyEmpty(translation.body)
  );

  if (emptyPublished) {
    const label = labels[emptyPublished.locale] ?? emptyPublished.locale;
    return {
      ok: false,
      error: `The ${label} version has no article yet — write it, or set that language back to draft before saving.`,
    };
  }

  const supabase = await createServerClient();
  const featuredImage = input.featuredImage?.trim() || null;

  // Keep the previous slug so its public URLs get revalidated when it changes.
  let previousSlug: string | null = null;
  if (input.id) {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", input.id)
      .maybeSingle();
    previousSlug =
      data && typeof data.slug === "string" ? data.slug : null;
  }

  let postId = input.id?.trim() ?? "";

  if (postId) {
    const { error } = await supabase
      .from("blog_posts")
      .update({ slug, featured_image: featuredImage })
      .eq("id", postId);
    if (error) return { ok: false, error: friendlyError(error) };
  } else {
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({ slug, featured_image: featuredImage })
      .select("id")
      .single();
    if (error) return { ok: false, error: friendlyError(error) };
    postId = String((data as { id: string }).id);
  }

  // A language with no title does not exist for this post. Removing the row
  // (rather than storing an empty one) is what makes "no fallback to another
  // language" true at the data level.
  const withTitle = input.translations.filter(
    (translation) => translation.title.trim().length > 0
  );
  const removable = input.translations
    .filter((translation) => translation.title.trim().length === 0)
    .map((translation) => translation.locale);

  if (removable.length > 0) {
    const { error } = await supabase
      .from("blog_post_translations")
      .delete()
      .eq("post_id", postId)
      .in("locale", removable);
    if (error) return { ok: false, error: friendlyError(error) };
  }

  if (withTitle.length > 0) {
    const rows = withTitle.map((translation) => ({
      post_id: postId,
      locale: translation.locale,
      title: translation.title.trim(),
      excerpt: translation.excerpt.trim() || null,
      body: (translation.body ?? EMPTY_BLOG_BODY) as unknown as Json,
      status: translation.status,
      // Null lets the database stamp the date the first time this locale is
      // published; an explicit value is an author override.
      published_at: translation.publishedAt,
    }));

    const { error } = await supabase
      .from("blog_post_translations")
      .upsert(rows, { onConflict: "post_id,locale" });
    if (error) return { ok: false, error: friendlyError(error) };
  }

  await cleanupOrphanBlogImages(supabase);
  revalidateBlog([slug, previousSlug ?? ""].filter(Boolean));
  return { ok: true, id: postId };
}

/** Deletes the post and every locale version (translations cascade). */
export async function deleteBlogPost(
  postId: string
): Promise<BlogActionResult> {
  const auth = await requireRole(...BLOG_ROLES);
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createServerClient();

  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", postId)
    .maybeSingle();
  const slug = data && typeof data.slug === "string" ? data.slug : "";

  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", postId);

  if (error) return { ok: false, error: friendlyError(error) };

  await cleanupOrphanBlogImages(supabase);
  revalidateBlog(slug ? [slug] : []);
  return { ok: true, id: postId };
}
