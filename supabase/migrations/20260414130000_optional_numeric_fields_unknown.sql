-- =============================================================================
-- Optional numeric / unknown facts: DROP NOT NULL only when still enforced.
-- Uses information_schema so already-nullable columns are skipped (no error).
--
-- Audit — other numeric columns intentionally unchanged:
--
-- • stallion_foal_crops.foal_crop_year — NOT NULL by design (identifies the row).
-- • stallion_images.position — NOT NULL (ordering slot, not an optional “fact”).
-- • resources_directory / associations_registries — is_active defaults; out of scope.
--
-- Already nullable in canonical schema (no-op here unless DB was altered):
-- stallions: stud_fee, total_reported_earnings, total_registered_progeny,
--   total_reported_offspring_earnings, performance_earners;
-- stallion_performance_records: year, level_earnings;
-- stallion_progeny: year, total_earnings;
-- stallion_foal_crops: number_of_foals;
-- stallion_breeding_stats: mares_covered, foals_born, sort_order.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'year'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      ALTER COLUMN year DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_progeny'
      AND column_name = 'year'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_progeny
      ALTER COLUMN year DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_foal_crops'
      AND column_name = 'number_of_foals'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_foal_crops
      ALTER COLUMN number_of_foals DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'level_earnings'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      ALTER COLUMN level_earnings DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_progeny'
      AND column_name = 'total_earnings'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_progeny
      ALTER COLUMN total_earnings DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'stud_fee'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN stud_fee DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'total_reported_earnings'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN total_reported_earnings DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'total_registered_progeny'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN total_registered_progeny DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'total_reported_offspring_earnings'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN total_reported_offspring_earnings DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'performance_earners'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallions
      ALTER COLUMN performance_earners DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_stats'
      AND column_name = 'mares_covered'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_breeding_stats
      ALTER COLUMN mares_covered DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_stats'
      AND column_name = 'foals_born'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_breeding_stats
      ALTER COLUMN foals_born DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_stats'
      AND column_name = 'sort_order'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_breeding_stats
      ALTER COLUMN sort_order DROP NOT NULL;
  END IF;
END $$;
