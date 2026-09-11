-- =============================================================================
-- Migration: Create Supabase Storage bucket for stallion images
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stallion-images',
  'stallion-images',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (anyone can view images)
CREATE POLICY "Public read access for stallion images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stallion-images');

