-- Milestone 14: distinguish stallion and donor mare records in the shared stallions table.
-- Existing rows backfill to 'stallion' via the column default.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'horse_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.horse_type AS ENUM ('stallion', 'mare');
  END IF;
END
$$;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS horse_type public.horse_type NOT NULL DEFAULT 'stallion';

COMMENT ON COLUMN public.stallions.horse_type IS
  'Record type: stallion (default) or donor mare. Mares share this table so pedigree, images, owners and translations infrastructure applies to both.';

CREATE INDEX IF NOT EXISTS stallions_horse_type_idx
  ON public.stallions USING btree (horse_type);

-- Publish-time requirements become type-conditional: stallions keep the previous
-- five required fields; mares only need breed and a registration number
-- (semen/live-cover/country availability do not apply to donor mares).
ALTER TABLE public.stallions
  DROP CONSTRAINT IF EXISTS stallions_published_required_fields_chk;

ALTER TABLE public.stallions
  ADD CONSTRAINT stallions_published_required_fields_chk
  CHECK (
    publish_status <> 'published'::public.publish_status_type
    OR (
      horse_type = 'stallion'::public.horse_type
      AND breed IS NOT NULL
      AND semen_availability IS NOT NULL
      AND live_cover_available IS NOT NULL
      AND country_availability IS NOT NULL
      AND registration_number IS NOT NULL
      AND btrim(registration_number) <> ''
    )
    OR (
      horse_type = 'mare'::public.horse_type
      AND breed IS NOT NULL
      AND registration_number IS NOT NULL
      AND btrim(registration_number) <> ''
    )
  );
