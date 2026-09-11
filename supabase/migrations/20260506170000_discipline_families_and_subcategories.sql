-- =============================================================================
-- discipline_families and discipline_subcategories
-- Reference tables for discipline taxonomy.
-- Idempotent creation, public read RLS, authenticated CRUD, and API grants.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discipline_families (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NULL,
  CONSTRAINT discipline_families_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discipline_families_name_key'
      AND conrelid = 'public.discipline_families'::regclass
  ) THEN
    ALTER TABLE public.discipline_families
      ADD CONSTRAINT discipline_families_name_key UNIQUE (name);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.discipline_subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer NULL,
  CONSTRAINT discipline_subcategories_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discipline_subcategories_family_id_name_key'
      AND conrelid = 'public.discipline_subcategories'::regclass
  ) THEN
    ALTER TABLE public.discipline_subcategories
      ADD CONSTRAINT discipline_subcategories_family_id_name_key
      UNIQUE (family_id, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discipline_subcategories_family_id_fkey'
      AND conrelid = 'public.discipline_subcategories'::regclass
  ) THEN
    ALTER TABLE public.discipline_subcategories
      ADD CONSTRAINT discipline_subcategories_family_id_fkey
      FOREIGN KEY (family_id)
      REFERENCES public.discipline_families (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_discipline_subcategories_family_id
  ON public.discipline_subcategories USING btree (family_id) TABLESPACE pg_default;

-- ----------------------------------------------------------------------------
-- Row level security
--   * Public read for reference data.
--   * Authenticated role: full CRUD for dashboard usage.
-- ----------------------------------------------------------------------------

ALTER TABLE public.discipline_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.discipline_families;
DROP POLICY IF EXISTS "Public read access" ON public.discipline_subcategories;

CREATE POLICY "Public read access" ON public.discipline_families
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access" ON public.discipline_subcategories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS discipline_families_authenticated_all
  ON public.discipline_families;
DROP POLICY IF EXISTS discipline_subcategories_authenticated_all
  ON public.discipline_subcategories;

CREATE POLICY discipline_families_authenticated_all
  ON public.discipline_families
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY discipline_subcategories_authenticated_all
  ON public.discipline_subcategories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- API role grants (required alongside RLS for PostgREST access).
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.discipline_families TO anon, authenticated;
GRANT SELECT ON public.discipline_subcategories TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.discipline_families
  TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.discipline_subcategories
  TO authenticated, service_role;
