/**
 * Blog domain types.
 *
 * `locale` is intentionally typed as `string` rather than `AppLocale` on
 * anything that mirrors a database row: the table accepts any well-formed
 * locale tag, so a row can exist for a language the app does not yet route.
 * Only UI that enumerates languages narrows to `AppLocale`, and it does so by
 * iterating `routing.locales` — never by naming a language.
 */

/**
 * BlockNote document: a flat array of blocks, each of which may nest children.
 *
 * Stored as structured blocks rather than HTML so rendering can only emit the
 * block types the editor knows about — sanitisation is structural, and no HTML
 * string from the browser is ever trusted.
 *
 * Typed structurally rather than importing BlockNote's `Block`, so the public
 * read path and the database types stay independent of the editor library.
 */
export type BlogBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown[];
};

export type BlogBody = BlogBlock[];

export const EMPTY_BLOG_BODY: BlogBody = [];

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export function isBlogStatus(value: unknown): value is BlogStatus {
  return (
    typeof value === "string" &&
    (BLOG_STATUSES as readonly string[]).includes(value)
  );
}

/** One locale's content for a post, as stored. */
export type BlogTranslation = {
  locale: string;
  title: string;
  excerpt: string | null;
  body: BlogBody;
  status: BlogStatus;
  published_at: string | null;
};

/** A card on the public list page — one locale, already resolved. */
export type BlogListItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
};

/** A public post page — one locale, already resolved. */
export type BlogPostDetail = BlogListItem & {
  body: BlogBody;
  updatedAt: string;
};

/** Admin view: the post plus every locale that exists for it. */
export type BlogAdminPost = {
  id: string;
  slug: string;
  featuredImage: string | null;
  featuredImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Keyed by locale. A missing key means that language has no row yet. */
  translations: Record<string, BlogTranslation>;
};

/**
 * Slug generation, mirroring the database's
 * `blog_posts_slug_format_chk` (lowercase kebab-case, ASCII only).
 * Accents are stripped rather than dropped so "Garanhão" yields "garanhao".
 */
export function slugifyBlogTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
}
