-- =============================================================================
-- Migration: Enable RLS on all tables + public read for non-staging tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: check whether a stallion is published (single source of truth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_published_stallion(_stallion_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stallions
    WHERE id = _stallion_id
      AND publish_status = 'published'::public.publish_status_type
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on all tables
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_breeding_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_foal_crops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_performance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stallion_progeny" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resources_directory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."associations_registries" ENABLE ROW LEVEL SECURITY;

-- Staging tables (RLS enabled, no public access)
ALTER TABLE "public"."stg_owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stg_stallions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stg_stallion_owners" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Drop existing policies (idempotent re-run safety)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access" ON "public"."resources_directory";
DROP POLICY IF EXISTS "Public read access" ON "public"."associations_registries";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallions";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_performance_records";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_images";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_progeny";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_breeding_stats";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_foal_crops";
DROP POLICY IF EXISTS "Public read access" ON "public"."stallion_owners";
DROP POLICY IF EXISTS "Public read access" ON "public"."owners";

-- ---------------------------------------------------------------------------
-- 3. Public read policies for non-staging tables
-- ---------------------------------------------------------------------------

-- Resources and associations are freely readable
CREATE POLICY "Public read access" ON "public"."resources_directory"
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON "public"."associations_registries"
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Stallions: only published stallions are visible
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access" ON "public"."stallions"
  FOR SELECT USING (publish_status = 'published'::public.publish_status_type);

-- ---------------------------------------------------------------------------
-- Child tables: explicit published gating via helper function
-- ---------------------------------------------------------------------------

CREATE POLICY "Public read access" ON "public"."stallion_performance_records"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON "public"."stallion_images"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON "public"."stallion_progeny"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON "public"."stallion_breeding_stats"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON "public"."stallion_foal_crops"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON "public"."stallion_owners"
  FOR SELECT USING (public.is_published_stallion(stallion_id));

-- Owners: visible if linked to at least one published stallion
CREATE POLICY "Public read access" ON "public"."owners"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stallion_owners so
      WHERE so.owner_id = id
        AND public.is_published_stallion(so.stallion_id)
    )
  );
