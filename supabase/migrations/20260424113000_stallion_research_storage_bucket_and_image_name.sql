-- Ensure storage and metadata support for research image uploads.
-- Safe to rerun.

ALTER TABLE IF EXISTS public.stallion_research_snippets_images
  ADD COLUMN IF NOT EXISTS name text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stallion-research',
  'stallion-research',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = false
WHERE id = 'stallion-research';

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON TABLE storage.objects TO authenticated;

DROP POLICY IF EXISTS "stallion_research_authenticated_select" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'stallion-research');

DROP POLICY IF EXISTS "stallion_research_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-research'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_research_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'stallion-research')
  WITH CHECK (
    bucket_id = 'stallion-research'
    AND name NOT LIKE '%..%'
  );

DROP POLICY IF EXISTS "stallion_research_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'stallion-research');
