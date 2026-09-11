-- =============================================================================
-- Migration: Move semen_availability to enum array (backward compatible names)
-- =============================================================================
--
-- Goal:
-- 1) Add new enum type for atomic semen availability options.
-- 2) Add temporary array column and backfill from legacy enum values.
-- 3) Rename columns so new array column becomes `semen_availability`.
--

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'semen_availability_option_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."semen_availability_option_type" AS ENUM ('Fresh', 'Chilled', 'Frozen');
  END IF;
END $$;

ALTER TYPE "public"."semen_availability_option_type"
  ADD VALUE IF NOT EXISTS 'Fresh';

ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "semen_availability_types_tmp" "public"."semen_availability_option_type"[] NOT NULL DEFAULT '{}';

UPDATE "public"."stallions"
SET "semen_availability_types_tmp" = CASE "semen_availability"::text
  WHEN 'Chilled' THEN ARRAY['Chilled']::"public"."semen_availability_option_type"[]
  WHEN 'Frozen' THEN ARRAY['Frozen']::"public"."semen_availability_option_type"[]
  WHEN 'Both' THEN ARRAY['Chilled', 'Frozen']::"public"."semen_availability_option_type"[]
  ELSE ARRAY[]::"public"."semen_availability_option_type"[]
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'semen_availability'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'semen_availability_legacy'
  ) THEN
    ALTER TABLE "public"."stallions" RENAME COLUMN "semen_availability" TO "semen_availability_legacy";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'semen_availability_types_tmp'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'semen_availability'
  ) THEN
    ALTER TABLE "public"."stallions" RENAME COLUMN "semen_availability_types_tmp" TO "semen_availability";
  END IF;
END $$;

-- Replace old index if present; new type benefits from a GIN index.
DROP INDEX IF EXISTS "public"."stallions_filters_idx";

CREATE INDEX IF NOT EXISTS "stallions_filters_idx"
  ON "public"."stallions" USING btree ("country_of_residence", "breed");

CREATE INDEX IF NOT EXISTS "stallions_semen_availability_gin_idx"
  ON "public"."stallions" USING gin ("semen_availability");

-- Compatibility cast so existing SQL/functions that still emit
-- public.semen_availability_type continue to work during transition.
CREATE OR REPLACE FUNCTION "public"."legacy_semen_availability_to_array"(
  "legacy" "public"."semen_availability_type"
) RETURNS "public"."semen_availability_option_type"[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE "legacy"::text
    WHEN 'Chilled' THEN ARRAY['Chilled']::"public"."semen_availability_option_type"[]
    WHEN 'Frozen' THEN ARRAY['Frozen']::"public"."semen_availability_option_type"[]
    WHEN 'Both' THEN ARRAY['Chilled', 'Frozen']::"public"."semen_availability_option_type"[]
    ELSE ARRAY[]::"public"."semen_availability_option_type"[]
  END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_cast
    WHERE castsource = 'public.semen_availability_type'::regtype
      AND casttarget = 'public.semen_availability_option_type[]'::regtype
  ) THEN
    CREATE CAST ("public"."semen_availability_type" AS "public"."semen_availability_option_type"[])
      WITH FUNCTION "public"."legacy_semen_availability_to_array"("public"."semen_availability_type")
      AS ASSIGNMENT;
  END IF;
END $$;

