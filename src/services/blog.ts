import { createClient } from "@/services/supabase";
import { BLOG_IMAGES_BUCKET, blogImageStoragePath } from "@/utils/blog";

export type BlogImageUploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Uploads a featured image straight from the admin browser client. The bucket
 * policies require an admin, so an author never needs a developer to place a
 * file for them.
 *
 * `postId` scopes the path so a post's images can be found and removed later.
 */
export async function uploadBlogImage(
  postId: string,
  file: File
): Promise<BlogImageUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, WebP or GIF image." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }

  const path = blogImageStoragePath(postId || "unassigned", file.name);
  const { error } = await createClient()
    .storage.from(BLOG_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}
