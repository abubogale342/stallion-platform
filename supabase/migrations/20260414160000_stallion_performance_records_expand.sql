-- =============================================================================
-- Performance records: association_event → association + event; discipline + class;
-- public field names (Performance Achievement … Highest Rating).
-- Handles fresh DBs and legacy shapes (racing_* columns, notes, level_earnings).
-- Earnings/currency paired null rules. Rebuilds perf_unique_idx.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop unique index (rebuilt at end)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.perf_unique_idx;

-- ---------------------------------------------------------------------------
-- 2. Add columns that do not overlap with legacy renames below
-- ---------------------------------------------------------------------------
ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS discipline text;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS association text;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS event text;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS performance_summary text;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS score numeric;

-- ---------------------------------------------------------------------------
-- 3. Legacy: racing_* → starts, firsts, seconds, thirds, highest_rating
--    (must run before ADD starts/… so we do not duplicate columns)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'racing_starts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'starts'
  ) THEN
    ALTER TABLE public.stallion_performance_records RENAME COLUMN racing_starts TO starts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'racing_firsts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'firsts'
  ) THEN
    ALTER TABLE public.stallion_performance_records RENAME COLUMN racing_firsts TO firsts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'racing_seconds'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'seconds'
  ) THEN
    ALTER TABLE public.stallion_performance_records RENAME COLUMN racing_seconds TO seconds;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'racing_thirds'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'thirds'
  ) THEN
    ALTER TABLE public.stallion_performance_records RENAME COLUMN racing_thirds TO thirds;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'racing_highest_rating'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stallion_performance_records'
      AND column_name = 'highest_rating'
  ) THEN
    ALTER TABLE public.stallion_performance_records RENAME COLUMN racing_highest_rating TO highest_rating;
  END IF;
END $$;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS starts integer;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS firsts integer;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS seconds integer;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS thirds integer;

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS highest_rating numeric;

-- Legacy UI column "notes" → "comments"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'notes'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'comments'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      RENAME COLUMN notes TO comments;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Column comments — public field labels (snake_case storage)
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.stallion_performance_records.achievement IS 'Performance Achievement';
COMMENT ON COLUMN public.stallion_performance_records.year IS 'Year';
COMMENT ON COLUMN public.stallion_performance_records.discipline IS 'Discipline';
COMMENT ON COLUMN public.stallion_performance_records.class IS 'Class';
COMMENT ON COLUMN public.stallion_performance_records.association IS 'Association';
COMMENT ON COLUMN public.stallion_performance_records.event IS 'Event';
COMMENT ON COLUMN public.stallion_performance_records.reference IS 'Reference';
COMMENT ON COLUMN public.stallion_performance_records.created_at IS 'Created at';
COMMENT ON COLUMN public.stallion_performance_records.comments IS 'Comments';
COMMENT ON COLUMN public.stallion_performance_records.judges IS 'Judges';
COMMENT ON COLUMN public.stallion_performance_records.month IS 'Month';
COMMENT ON COLUMN public.stallion_performance_records.performance_summary IS 'Performance Summary';
COMMENT ON COLUMN public.stallion_performance_records.score IS 'Score';
COMMENT ON COLUMN public.stallion_performance_records.starts IS 'Starts';
COMMENT ON COLUMN public.stallion_performance_records.firsts IS 'Firsts';
COMMENT ON COLUMN public.stallion_performance_records.seconds IS 'Seconds';
COMMENT ON COLUMN public.stallion_performance_records.thirds IS 'Thirds';
COMMENT ON COLUMN public.stallion_performance_records.highest_rating IS 'Highest Rating';

-- ---------------------------------------------------------------------------
-- 5. Backfill association + event from legacy association_event, then drop it
-- ---------------------------------------------------------------------------
UPDATE public.stallion_performance_records
SET
  association = CASE
    WHEN association_event IS NULL OR trim(association_event) = '' THEN NULL
    WHEN strpos(association_event, ' — ') > 0 THEN
      NULLIF(trim(split_part(association_event, ' — ', 1)), '')
    WHEN strpos(association_event, ' - ') > 0 THEN
      NULLIF(trim(split_part(association_event, ' - ', 1)), '')
    ELSE NULL
  END,
  event = CASE
    WHEN association_event IS NULL OR trim(association_event) = '' THEN NULL
    WHEN strpos(association_event, ' — ') > 0 THEN
      COALESCE(
        NULLIF(trim(split_part(association_event, ' — ', 2)), ''),
        NULLIF(trim(association_event), '')
      )
    WHEN strpos(association_event, ' - ') > 0 THEN
      COALESCE(
        NULLIF(trim(split_part(association_event, ' - ', 2)), ''),
        NULLIF(trim(association_event), '')
      )
    ELSE NULLIF(trim(association_event), '')
  END;

ALTER TABLE public.stallion_performance_records
  DROP COLUMN IF EXISTS association_event;

-- ---------------------------------------------------------------------------
-- 6. level_earnings / level_earnings_currency → earnings / currency
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS stallion_performance_records_level_earnings_normalize
  ON public.stallion_performance_records;

DROP FUNCTION IF EXISTS public.stallion_performance_records_normalize_level_earnings();

ALTER TABLE public.stallion_performance_records
  DROP CONSTRAINT IF EXISTS stallion_performance_records_level_earnings_pair_chk;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'level_earnings'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'earnings'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      RENAME COLUMN level_earnings TO earnings;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'level_earnings_currency'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      RENAME COLUMN level_earnings_currency TO currency;
  END IF;
END $$;

COMMENT ON COLUMN public.stallion_performance_records.earnings IS 'Earnings';
COMMENT ON COLUMN public.stallion_performance_records.currency IS 'Currency';

-- ---------------------------------------------------------------------------
-- 7. Optional numerics
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_performance_records'
      AND column_name = 'score'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.stallion_performance_records
      ALTER COLUMN score DROP NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Earnings ↔ currency (paired / both null)
-- ---------------------------------------------------------------------------
UPDATE public.stallion_performance_records
SET currency = NULL
WHERE earnings IS NULL;

UPDATE public.stallion_performance_records
SET earnings = NULL,
    currency = NULL
WHERE earnings IS NOT NULL
  AND (
    currency IS NULL
    OR trim(currency) = ''
  );

ALTER TABLE public.stallion_performance_records
  ALTER COLUMN currency DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.stallion_performance_records_normalize_earnings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.earnings IS NULL THEN
    NEW.currency := NULL;
    RETURN NEW;
  END IF;

  IF NEW.currency IS NULL OR trim(NEW.currency) = '' THEN
    NEW.earnings := NULL;
    NEW.currency := NULL;
    RETURN NEW;
  END IF;

  NEW.currency := trim(NEW.currency);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stallion_performance_records_earnings_normalize
  ON public.stallion_performance_records;

CREATE TRIGGER stallion_performance_records_earnings_normalize
  BEFORE INSERT OR UPDATE OF earnings, currency
  ON public.stallion_performance_records
  FOR EACH ROW
  EXECUTE PROCEDURE public.stallion_performance_records_normalize_earnings();

ALTER TABLE public.stallion_performance_records
  DROP CONSTRAINT IF EXISTS stallion_performance_records_earnings_pair_chk;

ALTER TABLE public.stallion_performance_records
  ADD CONSTRAINT stallion_performance_records_earnings_pair_chk
  CHECK (
    (earnings IS NULL AND currency IS NULL)
    OR (
      earnings IS NOT NULL
      AND currency IS NOT NULL
      AND trim(currency) <> ''
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Rebuild uniqueness index (includes discipline)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS perf_unique_idx
  ON public.stallion_performance_records
  USING btree (
    stallion_id,
    achievement,
    COALESCE(year, -1),
    COALESCE(discipline, ''),
    COALESCE(class, ''),
    COALESCE(level, ''),
    COALESCE(association, ''),
    COALESCE(event, '')
  );
