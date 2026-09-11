import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { signStallionImageStorageUrl } from "@/services/stallion-image-sign.server";
import {
  bucketForStallionImagePath,
  normalizeStallionImageStoragePath,
  STALLION_PHOTOS_BUCKET,
  STALLION_PHOTOS_PUBLIC_BUCKET,
} from "@/utils/stallion";

type ServiceClient = SupabaseClient<Database>;

/**
 * Stable, unauthenticated URL for a photo already copied to the public
 * bucket. Pure string construction — no network call, no signing. Returns
 * the input unchanged if it's already absolute (http(s)/data). Returns
 * undefined for paths outside the managed `stallions/...` convention (e.g.
 * legacy pre-migration filenames living in the legacy bucket) — those are
 * never mirrored to the public bucket by reconcileStallionPublicPhotos, so
 * building a URL for them here would always 404. Use
 * resolvePublishedImageUrl() when you need a fallback for those.
 */
export function publicStallionImageUrl(
  path: string | undefined
): string | undefined {
  const normalized = normalizeStallionImageStoragePath(path);
  if (!normalized) return undefined;
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  if (bucketForStallionImagePath(normalized) !== STALLION_PHOTOS_BUCKET) {
    return undefined;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;
  return `${supabaseUrl}/storage/v1/object/public/${STALLION_PHOTOS_PUBLIC_BUCKET}/${normalized}`;
}

/**
 * Best display URL for a published stallion/mare's photo: the stable public
 * URL if this path was actually mirrored to the public bucket, otherwise a
 * signed URL from wherever it actually lives (e.g. the legacy bucket, which
 * publish/reconcile never touches). Covers photos that predate the
 * `stallions/...` path convention.
 */
export async function resolvePublishedImageUrl(
  path: string | undefined,
  expiresIn = 3600
): Promise<string | undefined> {
  const publicUrl = publicStallionImageUrl(path);
  if (publicUrl) return publicUrl;
  if (!path?.trim()) return undefined;
  return (
    (await signStallionImageStorageUrl({ filename: path, expiresIn })) ??
    undefined
  );
}

/** Destination already has this object — copy is a no-op, not a failure. */
function isCopyAlreadyDoneError(message: string | undefined): boolean {
  const text = (message ?? "").toLowerCase();
  return text.includes("already exists") || text.includes("duplicate");
}

async function listPublicBucketPaths(
  client: ServiceClient,
  stallionId: string
): Promise<Set<string>> {
  const prefixes = [
    `stallions/${stallionId}/images/primary`,
    `stallions/${stallionId}/images/gallery`,
  ];

  const paths = new Set<string>();
  for (const prefix of prefixes) {
    const { data, error } = await client.storage
      .from(STALLION_PHOTOS_PUBLIC_BUCKET)
      .list(prefix);
    if (error || !data) continue;
    for (const entry of data) {
      // Supabase Storage list() returns folder placeholders with id === null;
      // only real objects have an id.
      if (entry.id) paths.add(`${prefix}/${entry.name}`);
    }
  }
  return paths;
}

/**
 * Reconcile the public bucket for one stallion/mare against its current
 * `stallion_images` rows: copy anything desired-but-missing, remove
 * anything present-but-no-longer-desired. Used on publish AND whenever a
 * published stallion's photos are edited (media edits delete/reinsert all
 * `stallion_images` rows, so a per-row synced flag alone can't be trusted
 * across saves — desired state is always recomputed from scratch here).
 *
 * Idempotent and safe to re-run: an "already exists" error on copy means the
 * object is already correctly in place, so it's treated as success. A
 * "not found" error on copy means the *source* object is missing (an
 * orphaned `stallion_images` row) — a genuine failure, counted as such.
 */
export async function reconcileStallionPublicPhotos(
  stallionId: string,
  client: ServiceClient
): Promise<{ copied: number; removed: number; failed: number }> {
  const { data: rows, error } = await client
    .from("stallion_images")
    .select("id, filename")
    .eq("stallion_id", stallionId);

  if (error) {
    return { copied: 0, removed: 0, failed: 1 };
  }

  const desiredPaths = new Set(
    (rows ?? [])
      .map((row) => normalizeStallionImageStoragePath(row.filename ?? undefined))
      .filter(
        (path) => path && bucketForStallionImagePath(path) === STALLION_PHOTOS_BUCKET
      )
  );

  const existingPublicPaths = await listPublicBucketPaths(client, stallionId);

  let copied = 0;
  let failed = 0;

  for (const path of desiredPaths) {
    if (existingPublicPaths.has(path)) continue;
    const { error: copyError } = await client.storage
      .from(STALLION_PHOTOS_BUCKET)
      .copy(path, path, { destinationBucket: STALLION_PHOTOS_PUBLIC_BUCKET });
    if (copyError && !isCopyAlreadyDoneError(copyError.message)) {
      failed += 1;
      continue;
    }
    copied += 1;
  }

  const pathsToRemove = [...existingPublicPaths].filter(
    (path) => !desiredPaths.has(path)
  );

  let removed = 0;
  if (pathsToRemove.length > 0) {
    const { error: removeError } = await client.storage
      .from(STALLION_PHOTOS_PUBLIC_BUCKET)
      .remove(pathsToRemove);
    if (removeError) {
      failed += pathsToRemove.length;
    } else {
      removed = pathsToRemove.length;
    }
  }

  const syncedIds = (rows ?? [])
    .filter((row) =>
      desiredPaths.has(normalizeStallionImageStoragePath(row.filename ?? undefined))
    )
    .map((row) => row.id);
  if (syncedIds.length > 0) {
    await client
      .from("stallion_images")
      .update({ public_synced_at: new Date().toISOString() })
      .in("id", syncedIds);
  }

  return { copied, removed, failed };
}

/**
 * Remove every object under this stallion's prefixes from the public
 * bucket, regardless of current `stallion_images` rows. Used on unpublish,
 * where correctness must be airtight (a photo must not remain reachable at
 * a stable public URL once a stallion is no longer published) — belt and
 * suspenders vs. reconcile()'s DB-driven diff.
 */
export async function removeAllStallionPublicPhotos(
  stallionId: string,
  client: ServiceClient
): Promise<{ removed: number; failed: number }> {
  const existingPublicPaths = await listPublicBucketPaths(client, stallionId);
  if (existingPublicPaths.size === 0) return { removed: 0, failed: 0 };

  const { error } = await client.storage
    .from(STALLION_PHOTOS_PUBLIC_BUCKET)
    .remove([...existingPublicPaths]);

  if (error) {
    return { removed: 0, failed: existingPublicPaths.size };
  }

  await client
    .from("stallion_images")
    .update({ public_synced_at: null })
    .eq("stallion_id", stallionId);

  return { removed: existingPublicPaths.size, failed: 0 };
}
