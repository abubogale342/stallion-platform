ALTER TABLE public.stallion_breeding_service_providers
  ADD COLUMN IF NOT EXISTS contact_name text NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NULL;
