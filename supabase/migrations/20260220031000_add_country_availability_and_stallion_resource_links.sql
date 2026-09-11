-- =============================================================================
-- Migration: Add country_availability and breeding provider resource FK
-- =============================================================================

-- 1) Add structured country availability to stallions
ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "country_availability" text[] NOT NULL DEFAULT '{}';

-- 2) Add breeding service provider FK on stallions -> resources_directory
ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "breeding_service_provider" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stallions_breeding_service_provider_fkey'
  ) THEN
    ALTER TABLE "public"."stallions"
      ADD CONSTRAINT "stallions_breeding_service_provider_fkey"
      FOREIGN KEY ("breeding_service_provider")
      REFERENCES "public"."resources_directory"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "stallions_breeding_service_provider_idx"
  ON "public"."stallions" USING btree ("breeding_service_provider");

