import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabase.server";
import {
  blogImagePublicUrl,
  parseBlogBody,
  parseBlogStatus,
} from "@/utils/blog";
import type {
  BlogAdminPost,
  BlogListItem,
  BlogPostDetail,
  BlogTranslation,
} from "@/types/blog";

/**
 * Embedded selects are typed as plain strings and mapped by hand, matching
 * how `stallion.ts` handles relations: the hand-maintained database types
 * declare no relationships, so supabase-js cannot infer embedded shapes.
 */
const PUBLIC_LIST_SELECT = `
  title,
  excerpt,
  published_at,
  updated_at,
  blog_posts!inner (slug, featured_image)
`;

const PUBLIC_DETAIL_SELECT = `
  title,
  excerpt,
  body,
  published_at,
  updated_at,
  blog_posts!inner (slug, featured_image)
`;

type EmbeddedPost = { slug?: unknown; featured_image?: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** PostgREST returns an embedded to-one as an object, but arrays appear too. */
function embeddedPost(value: unknown): EmbeddedPost {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

function mapListItem(row: unknown): BlogListItem | null {
  const r = asRecord(row);
  const post = embeddedPost(r.blog_posts);
  const slug = text(post.slug).trim();
  const title = text(r.title).trim();
  if (!slug || !title) return null;

  return {
    slug,
    title,
    excerpt: nullableText(r.excerpt),
    featuredImageUrl: blogImagePublicUrl(
      typeof post.featured_image === "string" ? post.featured_image : null
    ),
    publishedAt: nullableText(r.published_at),
  };
}

export type BlogListPage = {
  rows: BlogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * A page of published posts for one locale, newest first.
 *
 * Paged rather than fetching everything: the list is a public, uncached-per-
 * request query, and an archive that grows for years should not be loaded in
 * full on every visit. Mirrors `fetchResourcesDirectoryPage`.
 */
export async function fetchPublishedBlogListPage(
  locale: string,
  params?: { page?: number; pageSize?: number }
): Promise<BlogListPage> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 9);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("blog_post_translations")
    .select(PUBLIC_LIST_SELECT, { count: "exact" })
    .eq("locale", locale)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const rows = ((data ?? []) as unknown[])
    .map(mapListItem)
    .filter((item): item is BlogListItem => item != null);
  const total = count ?? 0;

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** One published post in one locale, or null when that locale has no live version. */
export async function fetchPublishedBlogPost(
  locale: string,
  slug: string
): Promise<BlogPostDetail | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  const { data, error } = await supabase
    .from("blog_post_translations")
    .select(PUBLIC_DETAIL_SELECT)
    .eq("locale", locale)
    .eq("status", "published")
    .eq("blog_posts.slug", cleanSlug)
    .maybeSingle();

  if (error || !data) return null;

  const base = mapListItem(data);
  if (!base) return null;

  const row = asRecord(data);
  return {
    ...base,
    body: parseBlogBody(row.body),
    updatedAt: text(row.updated_at) || text(row.published_at),
  };
}

export type PublishedBlogEntry = {
  slug: string;
  locale: string;
  updatedAt: string | null;
};

/**
 * Every published (slug, locale) pair. Drives `generateStaticParams` and the
 * sitemap, both of which must treat locales independently — a post live only
 * in English must not produce a Portuguese URL.
 */
export async function fetchPublishedBlogEntries(): Promise<
  PublishedBlogEntry[]
> {
  const { data, error } = await supabase
    .from("blog_post_translations")
    .select("locale, updated_at, published_at, blog_posts!inner (slug)")
    .eq("status", "published");

  if (error || !data) return [];

  return (data as unknown[])
    .map((row) => {
      const r = asRecord(row);
      const slug = text(embeddedPost(r.blog_posts).slug).trim();
      const locale = text(r.locale).trim();
      if (!slug || !locale) return null;
      return {
        slug,
        locale,
        updatedAt: nullableText(r.updated_at) ?? nullableText(r.published_at),
      };
    })
    .filter((entry): entry is PublishedBlogEntry => entry != null);
}

// ---------------------------------------------------------------------------
// Admin reads (RLS restricts these to owner/admin; the queries do not filter
// by status, so drafts are visible here and only here).
// ---------------------------------------------------------------------------

const ADMIN_SELECT = `
  id,
  slug,
  featured_image,
  created_at,
  updated_at,
  blog_post_translations (locale, title, excerpt, body, status, published_at)
`;

function mapTranslation(row: unknown): BlogTranslation | null {
  const r = asRecord(row);
  const locale = text(r.locale).trim();
  if (!locale) return null;
  return {
    locale,
    title: text(r.title),
    excerpt: nullableText(r.excerpt),
    body: parseBlogBody(r.body),
    status: parseBlogStatus(r.status),
    published_at: nullableText(r.published_at),
  };
}

function mapAdminPost(row: unknown): BlogAdminPost | null {
  const r = asRecord(row);
  const id = text(r.id).trim();
  if (!id) return null;

  const featuredImage = nullableText(r.featured_image);
  const translations: Record<string, BlogTranslation> = {};
  const raw = Array.isArray(r.blog_post_translations)
    ? r.blog_post_translations
    : [];
  for (const entry of raw) {
    const mapped = mapTranslation(entry);
    if (mapped) translations[mapped.locale] = mapped;
  }

  return {
    id,
    slug: text(r.slug),
    featuredImage,
    featuredImageUrl: blogImagePublicUrl(featuredImage),
    createdAt: text(r.created_at),
    updatedAt: text(r.updated_at),
    translations,
  };
}

export async function fetchBlogAdminList(): Promise<{
  posts: BlogAdminPost[];
  error: string | null;
}> {
  const client: SupabaseClient = await createServerClient();
  const { data, error } = await client
    .from("blog_posts")
    .select(ADMIN_SELECT)
    .order("updated_at", { ascending: false });

  if (error) return { posts: [], error: error.message };

  return {
    posts: (data as unknown[] | null ?? [])
      .map(mapAdminPost)
      .filter((post): post is BlogAdminPost => post != null),
    error: null,
  };
}

export async function fetchBlogAdminPost(
  id: string
): Promise<BlogAdminPost | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;

  const client: SupabaseClient = await createServerClient();
  const { data, error } = await client
    .from("blog_posts")
    .select(ADMIN_SELECT)
    .eq("id", cleanId)
    .maybeSingle();

  if (error || !data) return null;
  return mapAdminPost(data);
}

/**
 * Which locales a slug is published in. Feeds hreflang alternates so a post
 * live only in English does not advertise a Portuguese URL that would 404.
 */
export async function fetchPublishedLocalesForSlug(
  slug: string
): Promise<string[]> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return [];

  const { data, error } = await supabase
    .from("blog_post_translations")
    .select("locale, blog_posts!inner (slug)")
    .eq("status", "published")
    .eq("blog_posts.slug", cleanSlug);

  if (error || !data) return [];

  return (data as unknown[])
    .map((row) => text(asRecord(row).locale).trim())
    .filter((locale) => locale.length > 0);
}
