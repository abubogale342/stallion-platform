-- Allow minimal draft stallion rows while preserving publish-time requirements.
-- Draft: only existing NOT NULL columns apply (e.g. id, stallion_name).
-- Published: keep required fields that were previously enforced globally.

DO $$
BEGIN
  -- Previously global requirement from align_form migration.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'registration_number'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN registration_number DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  -- Previously global requirement from align_form migration.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'breed'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN breed DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  -- Allow draft rows to omit semen availability.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'semen_availability'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN semen_availability DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  -- Allow draft rows to omit live cover flag until publish time.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'live_cover_available'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN live_cover_available DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  -- Allow draft rows to omit country availability.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'country_availability'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN country_availability DROP NOT NULL;
  END IF;
END
$$;

ALTER TABLE public.stallions
  DROP CONSTRAINT IF EXISTS stallions_published_required_fields_chk;

ALTER TABLE public.stallions
  ADD CONSTRAINT stallions_published_required_fields_chk
  CHECK (
    publish_status <> 'published'::public.publish_status_type
    OR (
      breed IS NOT NULL
      AND semen_availability IS NOT NULL
      AND live_cover_available IS NOT NULL
      AND country_availability IS NOT NULL
      AND registration_number IS NOT NULL
      AND btrim(registration_number) <> ''
    )
  );
