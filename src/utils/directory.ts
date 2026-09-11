import type { DirectoryKind } from "@/types/directory";

export const DIRECTORY_LOGOS_BUCKET = "directory-logos";

/** Matches the bucket's `allowed_mime_types`. SVG is excluded deliberately. */
export const DIRECTORY_LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Matches the bucket's `file_size_limit`. */
export const DIRECTORY_LOGO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Public URL for a directory entry's logo. The bucket is public, so this is a
 * stable, browser-cacheable URL — no signing round-trip on a public page.
 * Absolute URLs are passed through so an externally hosted mark still works.
 */
export function directoryLogoPublicUrl(
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
  return `${supabaseUrl}/storage/v1/object/public/${DIRECTORY_LOGOS_BUCKET}/${normalized}`;
}

/**
 * Storage object path for an entry's logo.
 *
 * The `directory/` prefix is what the bucket's INSERT policy checks, so it is
 * not cosmetic. `Date.now()` keeps a replacement from colliding with the file
 * it supersedes, which also sidesteps CDN caching of the old image.
 */
export function directoryLogoStoragePath(
  kind: DirectoryKind,
  entryId: string,
  fileName: string
): string {
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return `directory/${kind}/${entryId}/${Date.now()}-${safeName || "logo"}`;
}
