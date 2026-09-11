"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import HelperText from "@/ui/HelperText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Textarea from "@/ui/Textarea";
import ConfirmRemoveDialog from "@/components/admin/stallions/form/ConfirmRemoveDialog";
import BlogBodyEditor from "./BlogBodyEditor";
import {
  deleteBlogPost,
  saveBlogPost,
  type BlogTranslationInput,
} from "@/app/dashboard/blog/actions";
import { uploadBlogImage } from "@/services/blog";
import { blogImagePublicUrl, isBlogBodyEmpty } from "@/utils/blog";
import {
  EMPTY_BLOG_BODY,
  slugifyBlogTitle,
  type BlogAdminPost,
  type BlogBody,
  type BlogStatus,
} from "@/types/blog";
import { cn } from "@/utils/common";

type BlogPostEditorProps = {
  post: BlogAdminPost | null;
  /** Every locale the app routes, in routing order. Never hard-coded. */
  locales: readonly string[];
  defaultLocale: string;
  /** Display names for each locale, resolved from the messages files. */
  localeLabels: Record<string, string>;
};

type DraftTranslation = {
  title: string;
  excerpt: string;
  body: BlogBody;
  status: BlogStatus;
  publishedAt: string | null;
};

function emptyTranslation(): DraftTranslation {
  return {
    title: "",
    excerpt: "",
    body: EMPTY_BLOG_BODY,
    status: "draft",
    publishedAt: null,
  };
}

/** `datetime-local` needs `YYYY-MM-DDTHH:mm`, not a full ISO string. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function BlogPostEditor({
  post,
  locales,
  defaultLocale,
  localeLabels,
}: BlogPostEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [slug, setSlug] = useState(post?.slug ?? "");
  // Once an author edits the slug by hand, the title stops overwriting it.
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage ?? "");
  const [activeLocale, setActiveLocale] = useState(defaultLocale);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, DraftTranslation>>(() => {
    const initial: Record<string, DraftTranslation> = {};
    for (const locale of locales) {
      const existing = post?.translations[locale];
      initial[locale] = existing
        ? {
            title: existing.title,
            excerpt: existing.excerpt ?? "",
            body: existing.body,
            status: existing.status,
            publishedAt: existing.published_at,
          }
        : emptyTranslation();
    }
    return initial;
  });

  const active = drafts[activeLocale] ?? emptyTranslation();
  // The date only means something once this language is going live: on a
  // draft that has never been published there is nothing to edit, and an
  // empty field invites the misreading that a future date would schedule it.
  const showPublishedAt =
    active.status === "published" || active.publishedAt !== null;
  // Publishing a language with no article is never intended, so the option is
  // withheld rather than validated after the fact.
  const activeBodyEmpty = isBlogBodyEmpty(active.body);
  const featuredImageUrl = useMemo(
    () => blogImagePublicUrl(featuredImage),
    [featuredImage]
  );

  const patchActive = (patch: Partial<DraftTranslation>) => {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...(current[activeLocale] ?? emptyTranslation()), ...patch },
    }));
  };

  const handleTitleChange = (value: string) => {
    patchActive({ title: value });
    // The brief specifies the slug is generated from the English title.
    if (!slugTouched && activeLocale === defaultLocale) {
      setSlug(slugifyBlogTitle(value));
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const result = await uploadBlogImage(post?.id ?? "new", file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeaturedImage(result.path);
    setNotice("Image uploaded. Save to attach it to the post.");
  };

  const handleSave = () => {
    setError(null);
    setNotice(null);

    // Keep the field in step with what the server will store. An empty slug is
    // left alone here: the action derives it from the title.
    const normalizedSlug = slugifyBlogTitle(slug);
    if (normalizedSlug !== slug) setSlug(normalizedSlug);

    const translations: BlogTranslationInput[] = locales.map((locale) => {
      const draft = drafts[locale] ?? emptyTranslation();
      return {
        locale,
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        status: draft.status,
        publishedAt: draft.publishedAt,
      };
    });

    startTransition(async () => {
      const result = await saveBlogPost({
        ...(post?.id ? { id: post.id } : {}),
        slug: normalizedSlug,
        featuredImage: featuredImage || null,
        translations,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNotice("Saved.");
      if (!post?.id) {
        router.replace(`/dashboard/blog/${result.id}/edit`);
      }
      router.refresh();
    });
  };

  const handleDelete = async () => {
    if (!post?.id) return;
    setDeleting(true);
    setError(null);
    const result = await deleteBlogPost(post.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmDelete(false);
    router.push("/dashboard/blog");
    router.refresh();
  };

  const busy = isPending || uploading || deleting;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-white">
          {post ? "Edit post" : "New post"}
        </h1>
        <div className="flex items-center gap-2">
          {post ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={isPending}
            disabled={busy}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      {/* Shared across every language */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Shared across languages
        </p>

        <div>
          <Label htmlFor="blog-slug">Slug</Label>
          <Input
            id="blog-slug"
            value={slug}
            onChange={(e) => {
              const next = e.target.value;
              // Clearing the field hands control back to the title.
              setSlugTouched(next.trim().length > 0);
              setSlug(next);
            }}
            onBlur={() => setSlug((current) => slugifyBlogTitle(current))}
            placeholder="2026-stallion-season"
          />
          <HelperText>
            Taken from the {localeLabels[defaultLocale] ?? defaultLocale} title
            until you edit it, and used for every language&apos;s URL. Spaces
            and punctuation are converted automatically, so
            &ldquo;The Secret Life of Horses&rdquo; becomes
            &ldquo;the-secret-life-of-horses&rdquo;.
          </HelperText>
        </div>

        <div>
          <Label>Featured image</Label>
          <div className="mt-1.5 flex flex-wrap items-start gap-4">
            {featuredImageUrl ? (
              <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                <Image
                  src={featuredImageUrl}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={uploading}
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {featuredImage ? "Replace image" : "Upload image"}
                </Button>
                {featuredImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setFeaturedImage("")}
                    className="text-slate-400"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <HelperText>JPEG, PNG, WebP or GIF, up to 5 MB.</HelperText>
            </div>
          </div>
        </div>
      </section>

      {/* Per-language content */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/40">
        <div className="flex flex-wrap gap-1 border-b border-slate-800 p-2">
          {locales.map((locale) => {
            const draft = drafts[locale];
            const isActive = locale === activeLocale;
            const published = draft?.status === "published";
            const hasContent = Boolean(draft?.title.trim());

            return (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900"
                )}
              >
                {localeLabels[locale] ?? locale}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                    published
                      ? "bg-emerald-500/15 text-emerald-300"
                      : hasContent
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-slate-700/40 text-slate-500"
                  )}
                >
                  {published ? "Live" : hasContent ? "Draft" : "Empty"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="blog-title">Title</Label>
            <Input
              id="blog-title"
              value={active.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Post title"
            />
            <HelperText>
              Leave empty to remove this language from the post entirely.
            </HelperText>
          </div>

          <div>
            <Label htmlFor="blog-excerpt">Excerpt</Label>
            <Textarea
              id="blog-excerpt"
              rows={2}
              value={active.excerpt}
              onChange={(e) => patchActive({ excerpt: e.target.value })}
              placeholder="Short summary shown on the blog list"
            />
          </div>

          <div>
            <Label>Body</Label>
            <div className="mt-1.5">
              <BlogBodyEditor
                documentKey={`${post?.id ?? "new"}-${activeLocale}`}
                postId={post?.id ?? ""}
                value={active.body}
                onChange={(body: BlogBody) => patchActive({ body })}
                disabled={busy}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <div className="mt-1.5 flex gap-2">
                {(["draft", "published"] as const).map((status) => {
                  const blocked = status === "published" && activeBodyEmpty;
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || blocked}
                      title={
                        blocked
                          ? "Write the article before publishing this language."
                          : undefined
                      }
                      onClick={() => patchActive({ status })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm capitalize transition disabled:cursor-not-allowed disabled:opacity-40",
                        active.status === status
                          ? "border-sky-500/50 bg-sky-950/30 text-slate-100"
                          : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                      )}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
              <HelperText>
                {activeBodyEmpty
                  ? "Write the article before publishing this language. Each language publishes on its own."
                  : "Each language publishes on its own — this does not affect the others."}
              </HelperText>
            </div>

            <div>
              <Label htmlFor="blog-published-at">Publication date</Label>
              {showPublishedAt ? (
                <>
                  <Input
                    id="blog-published-at"
                    type="datetime-local"
                    value={toLocalInputValue(active.publishedAt)}
                    onChange={(e) =>
                      patchActive({
                        publishedAt: fromLocalInputValue(e.target.value),
                      })
                    }
                  />
                  <HelperText>
                    Shown on the public post. Leave empty to stamp the moment
                    this language goes live; set it to backdate an older
                    article. It does not schedule publishing — Status alone
                    controls what is visible.
                  </HelperText>
                </>
              ) : (
                <p className="mt-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-500">
                  Set automatically when this language is first published.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <ConfirmRemoveDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this post?"
        message="Every language version is deleted. This cannot be undone."
        confirmLabel="Delete post"
        loading={deleting}
      />
    </div>
  );
}
