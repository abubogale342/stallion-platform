import {
  EMPTY_BLOG_BODY,
  isBlogStatus,
  type BlogBody,
  type BlogStatus,
} from "@/types/blog";

export const BLOG_IMAGES_BUCKET = "blog-images";

/**
 * Public URL for a featured image. The bucket is public, so this is a stable
 * CDN/browser-cacheable URL — no signing round-trip on a public page.
 * Absolute URLs are passed through so an externally hosted image still works.
 */
export function blogImagePublicUrl(
  path: string | null | undefined
): string | null {
  const trimmed = path?.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const normalized = trimmed.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${normalized}`;
}

/** Storage object path for a post's featured image. */
export function blogImageStoragePath(postId: string, fileName: string): string {
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return `blog/${postId}/${Date.now()}-${safeName || "image"}`;
}

/**
 * Narrow an unknown jsonb value to a BlockNote document.
 *
 * Rows written before the editor swap hold a Tiptap `{type:"doc"}` object
 * rather than an array; those are treated as empty rather than crashing the
 * renderer.
 */
export function parseBlogBody(value: unknown): BlogBody {
  if (!Array.isArray(value)) return EMPTY_BLOG_BODY;
  return value.filter(
    (block): block is BlogBody[number] =>
      Boolean(block) &&
      typeof block === "object" &&
      typeof (block as { type?: unknown }).type === "string"
  );
}

export function parseBlogStatus(value: unknown): BlogStatus {
  return isBlogStatus(value) ? value : "draft";
}

/** True when a document has no renderable content. */
export function isBlogBodyEmpty(body: BlogBody): boolean {
  if (!Array.isArray(body) || body.length === 0) return true;
  return body.every((block) => {
    const content = block.content;
    const children = block.children;
    const hasChildren = Array.isArray(children) && children.length > 0;
    if (hasChildren) return false;
    // Image and other media blocks carry their payload in props, not content.
    if (block.type !== "paragraph" && block.type !== "heading") return false;
    if (typeof content === "string") return content.trim().length === 0;
    if (Array.isArray(content)) return content.length === 0;
    return true;
  });
}

/**
 * Human-readable language names, resolved by the platform rather than a
 * hand-written map: a locale added to `routing.locales` gets a label with no
 * code change. Falls back to the tag itself where Intl has no name.
 */
export function localeDisplayLabels(
  locales: readonly string[]
): Record<string, string> {
  const labels: Record<string, string> = {};
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames(["en"], { type: "language" });
  } catch {
    display = null;
  }

  for (const locale of locales) {
    let label = locale;
    try {
      label = display?.of(locale) ?? locale;
    } catch {
      label = locale;
    }
    labels[locale] = label;
  }
  return labels;
}

/**
 * Reverse of `blogImagePublicUrl`: recover the storage object path from a
 * public URL. Body images store a full URL in the block, while the featured
 * image stores a bare path, so orphan detection has to compare both forms.
 * Returns null for anything not in this bucket — an externally hosted image
 * must never be mistaken for one of ours.
 */
export function blogImagePathFromUrl(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const marker = `/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/`;
  const index = trimmed.indexOf(marker);
  if (index >= 0) {
    const path = trimmed.slice(index + marker.length).split(/[?#]/)[0];
    return path ? decodeURIComponent(path) : null;
  }

  // Already a bare storage path.
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("data:")) {
    return trimmed.replace(/^\/+/, "");
  }
  return null;
}

/** Every storage path referenced by a document's image blocks. */
export function collectBodyImagePaths(body: BlogBody): string[] {
  const paths: string[] = [];
  const walk = (blocks: unknown[]) => {
    for (const raw of blocks) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as {
        props?: { url?: unknown };
        children?: unknown;
      };
      const url = block.props?.url;
      if (typeof url === "string") {
        const path = blogImagePathFromUrl(url);
        if (path) paths.push(path);
      }
      if (Array.isArray(block.children)) walk(block.children);
    }
  };
  walk(Array.isArray(body) ? body : []);
  return paths;
}
