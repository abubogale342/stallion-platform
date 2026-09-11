-- =============================================================================
-- Migration: Align DB schema with frontend registration form
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add missing columns to `stallions`
-- ---------------------------------------------------------------------------

-- Official registry record URL (collected on form but not stored)
ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "official_registry_link" TEXT;

-- Video reference URL
ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "video_url" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Add missing columns to `stallion_performance_records`
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."stallion_performance_records"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "public"."stallion_performance_records"
  ADD COLUMN IF NOT EXISTS "judges" TEXT;

ALTER TABLE "public"."stallion_performance_records"
  ADD COLUMN IF NOT EXISTS "level_earnings" NUMERIC;

ALTER TABLE "public"."stallion_performance_records"
  ADD COLUMN IF NOT EXISTS "level_earnings_currency" TEXT;

-- ---------------------------------------------------------------------------
-- 3. Make `registration_number` NOT NULL (form requires it)
--    NOTE: ensure no NULL registration_numbers exist before running.
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."stallions"
  ALTER COLUMN "registration_number" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Make `breed` NOT NULL
--    NOTE: ensure no NULL breeds exist before running.
--    country_of_residence intentionally remains nullable (historic/deceased).
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."stallions"
  ALTER COLUMN "breed" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Convert `publish_status` from TEXT to ENUM with default 'draft'
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "public"."publish_status_type" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Backfill: map existing values to the enum; anything unrecognised → 'draft'
UPDATE "public"."stallions"
  SET "publish_status" = CASE
    WHEN lower("publish_status") = 'published' THEN 'published'
    ELSE 'draft'
  END;

-- Convert column from TEXT to the new enum
ALTER TABLE "public"."stallions"
  ALTER COLUMN "publish_status" SET DATA TYPE "public"."publish_status_type"
  USING "publish_status"::"public"."publish_status_type";

-- Set default and NOT NULL
ALTER TABLE "public"."stallions"
  ALTER COLUMN "publish_status" SET DEFAULT 'draft'::"public"."publish_status_type";

ALTER TABLE "public"."stallions"
  ALTER COLUMN "publish_status" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Create `resources_directory` table (commercial directory, informational)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."resources_directory" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT "resources_directory_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 7. Create `associations_registries` table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."associations_registries" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed_focus" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT "associations_registries_pkey" PRIMARY KEY ("id")
);

