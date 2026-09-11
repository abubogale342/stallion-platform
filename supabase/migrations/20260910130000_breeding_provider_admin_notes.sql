-- Milestone 17 canonical review: admin notes on breeding service providers.
--
-- Every other table the agent writes to already carries an `admin_notes`
-- column for staff-only provenance — genetic tests, colour tests, racing
-- summary, racing results, pedigrees. `stallion_breeding_service_providers`
-- was created without one and never caught up, so a provider row sourced by
-- the agent has nowhere to record where it came from or why it was kept.
--
-- This is the only column in the Milestone 17 canonical field list that does
-- not already exist; the other sixteen were added by earlier migrations and
-- simply never wired through to the admin.
--
-- Safe to rerun.

ALTER TABLE public.stallion_breeding_service_providers
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.stallion_breeding_service_providers.admin_notes IS
  'Staff-only notes; e.g. the source a provider was taken from when the agent added it.';
