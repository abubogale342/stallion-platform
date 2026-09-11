-- =============================================================================
-- Migration: Make stallion_images.url optional
-- =============================================================================

ALTER TABLE public.stallion_images
  ALTER COLUMN url DROP NOT NULL;