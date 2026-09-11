-- =============================================================================
-- Standardized private storage buckets for stallion media.
-- Path/filename rules are enforced by application uploads; existing objects are
-- not migrated.
--
-- stallion-videos — object key shape (bucket is NOT repeated in the key):
--   {stallion_id}/{video_name}.{ext}
--   Use a standardized video_name that includes a human-readable stallion name
--   (e.g. slug), not only the stallion UUID.
--
-- stallion-photos — object key shape:
--   stallions/{stallion_id}/images/{primary|gallery}/{image_name}.{ext}
--   Use standardized image_name values (e.g. slug-type-sequence), not random
--   original filenames.
--
-- Authenticated users may upload/read/update/delete per storage RLS below.
-- Anonymous clients have no storage policies here — use signed URLs for reads.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stallion-videos',
  'stallion-videos',
  false,
  104857600, -- 100 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stallion-photos',
  'stallion-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Private buckets (no anonymous public URLs); use signed URLs or authenticated access.
UPDATE storage.buckets
SET public = false
WHERE id IN ('stallion-videos', 'stallion-photos');

-- ---------------------------------------------------------------------------
-- Storage RLS: authenticated upload / manage (path checks match conventions above)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON TABLE storage.objects TO authenticated;

-- stallion-photos: stallions/{stallion_id}/images/{primary|gallery}/...
DROP POLICY IF EXISTS "stallion_photos_authenticated_select" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stallion-photos');

DROP POLICY IF EXISTS "stallion_videos_authenticated_select" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stallion-videos');

DROP POLICY IF EXISTS "stallion_photos_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-photos'
    AND name LIKE 'stallions/%/images/%'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_photos_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stallion-photos')
  WITH CHECK (
    bucket_id = 'stallion-photos'
    AND name LIKE 'stallions/%/images/%'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stallion-photos');

-- stallion-videos: {stallion_id}/{video_name}.{ext}
DROP POLICY IF EXISTS "stallion_videos_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-videos'
    AND name ~ '^[^/]+/[^/]+$'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_videos_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stallion-videos')
  WITH CHECK (
    bucket_id = 'stallion-videos'
    AND name ~ '^[^/]+/[^/]+$'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_videos_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stallion-videos');
