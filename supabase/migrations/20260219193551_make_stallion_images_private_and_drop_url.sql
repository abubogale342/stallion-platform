-- =============================================================================
-- Migration: Make stallion-images private and drop stallion_images.url
-- =============================================================================

-- Make the storage bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'stallion-images';

-- Remove public-read object policy for this bucket if present
DROP POLICY IF EXISTS "Public read access for stallion images"
  ON storage.objects;

-- Drop url-dependent uniqueness first, then remove the url column
ALTER TABLE public.stallion_images
  DROP CONSTRAINT IF EXISTS stallion_images_unique_url;

ALTER TABLE public.stallion_images
  DROP COLUMN IF EXISTS url;
