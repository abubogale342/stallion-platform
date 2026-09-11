-- =============================================================================
-- Public storage bucket for PUBLISHED stallion/mare photos.
--
-- `stallion-photos` (private) remains the bucket every upload lands in first,
-- regardless of publish status. When a stallion/mare is published, its photos
-- are copied (server-side, service-role only) into `stallion-photos-public`
-- under the same path shape, so public pages can reference a stable,
-- unauthenticated, CDN/browser-cacheable URL instead of a signed one.
-- Unpublishing removes the copies from the public bucket.
--
-- No `authenticated` RLS policies are added here: only server-side code using
-- the service-role client (which bypasses RLS) writes to this bucket. Reads
-- are served unauthenticated automatically because the bucket is public.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stallion-photos-public',
  'stallion-photos-public',
  true,
  5242880, -- 5 MB, matches stallion-photos
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = true
WHERE id = 'stallion-photos-public';

-- Informational/audit column: last time this row's file was confirmed present
-- in the public bucket. Not load-bearing for correctness — reconciliation
-- compares desired paths against what's actually listed in the public
-- bucket, since `syncStallionImagesFromForm` deletes/reinserts rows on every
-- media edit (so a per-row flag alone can't be trusted across saves).
ALTER TABLE public.stallion_images
  ADD COLUMN IF NOT EXISTS public_synced_at timestamptz;
