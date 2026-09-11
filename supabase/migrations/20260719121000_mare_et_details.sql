-- Milestone 14: embryo-transfer (donor mare) details, 1:1 with a mare row in stallions.
-- Patterned on pedigree_registrations (uuid PK, FK cascade, updated_at trigger,
-- public read gated by publish status, authenticated full access).
-- "Embryos available" is intentionally absent (explicit milestone exclusion).
-- Status/availability columns are text (not enums) so new values need no migration.

CREATE TABLE IF NOT EXISTS public.mare_et_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  et_status text NULL,
  clinic_name text NULL,
  clinic_location text NULL,
  flush_history text NULL,
  embryo_fee numeric NULL,
  embryo_fee_currency text NULL,
  embryo_availability text NULL,
  last_verified_at date NULL,
  international_availability boolean NULL,
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mare_et_details_pkey PRIMARY KEY (id),
  CONSTRAINT mare_et_details_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE,
  CONSTRAINT mare_et_details_stallion_id_key UNIQUE (stallion_id)
);

COMMENT ON COLUMN public.mare_et_details.et_status IS
  'Donor programme status shown as the profile badge (e.g. Donor, Seasonal, Deceased).';
COMMENT ON COLUMN public.mare_et_details.embryo_availability IS
  'Fresh, Frozen or Both.';
COMMENT ON COLUMN public.mare_et_details.last_verified_at IS
  'Listing data last confirmed with the owner; older than 12 months renders an unconfirmed flag.';
COMMENT ON COLUMN public.mare_et_details.admin_notes IS
  'Admin-only. Never publicly readable: anon has column-level SELECT grants that exclude this column.';

CREATE INDEX IF NOT EXISTS idx_mare_et_details_et_status
  ON public.mare_et_details USING btree (et_status);
CREATE INDEX IF NOT EXISTS idx_mare_et_details_embryo_availability
  ON public.mare_et_details USING btree (embryo_availability);

DROP TRIGGER IF EXISTS set_updated_at ON public.mare_et_details;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mare_et_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mare_et_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mare_et_details_public_read ON public.mare_et_details;
CREATE POLICY mare_et_details_public_read
  ON public.mare_et_details
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS mare_et_details_authenticated_all ON public.mare_et_details;
CREATE POLICY mare_et_details_authenticated_all
  ON public.mare_et_details
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Column-level grants: anon may read everything except admin_notes, so public
-- queries must enumerate columns (select("*") from anon fails by design).
REVOKE SELECT ON public.mare_et_details FROM anon;
GRANT SELECT (
  id,
  stallion_id,
  et_status,
  clinic_name,
  clinic_location,
  flush_history,
  embryo_fee,
  embryo_fee_currency,
  embryo_availability,
  last_verified_at,
  international_availability,
  created_at,
  updated_at
) ON public.mare_et_details TO anon;

GRANT SELECT ON public.mare_et_details TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mare_et_details TO authenticated, service_role;
