-- Optional structured breeding manager (person + org + contact); breeding_manager remains the primary name line.
ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS breeding_manager_organization text,
  ADD COLUMN IF NOT EXISTS breeding_manager_email text,
  ADD COLUMN IF NOT EXISTS breeding_manager_phone text;

COMMENT ON COLUMN public.stallions.breeding_manager IS
  'Breeding manager — person name (primary line).';
COMMENT ON COLUMN public.stallions.breeding_manager_organization IS
  'Optional farm / business name.';
COMMENT ON COLUMN public.stallions.breeding_manager_email IS
  'Optional breeding manager email.';
COMMENT ON COLUMN public.stallions.breeding_manager_phone IS
  'Optional breeding manager phone.';

-- When true, stallion profile lists this owner by name only (no website/email/phone).
ALTER TABLE public.stallion_owners
  ADD COLUMN IF NOT EXISTS public_display_name_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stallion_owners.public_display_name_only IS
  'If true, public profile shows owner name only.';
