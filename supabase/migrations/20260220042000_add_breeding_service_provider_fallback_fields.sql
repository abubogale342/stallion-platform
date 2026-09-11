-- =============================================================================
-- Migration: Add fallback breeding_service_provider_* fields on stallions
-- =============================================================================

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_service_provider_name text;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_service_provider_website text;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_service_provider_country text;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_service_provider_email text;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_service_provider_phone text;
