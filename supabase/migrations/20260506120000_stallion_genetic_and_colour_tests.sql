-- =============================================================================
-- Idempotent creation of stallion_genetic_tests and stallion_colour_tests,
-- including RLS policies and API role grants.
-- Mirrors the pattern used for stallion_racing_results / stallion_racing_summary.
-- =============================================================================

-- Ensure the shared updated_at trigger function exists
-- (no-op if the racing migration already created it).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- stallion_genetic_tests
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stallion_genetic_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  test_type text NOT NULL,
  gene_code text NULL,
  result text NOT NULL,
  source text NULL,
  admin_notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stallion_genetic_tests_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_genetic_tests_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_genetic_tests_stallion_id
  ON public.stallion_genetic_tests USING btree (stallion_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_genetic_tests;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_genetic_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- stallion_colour_tests
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stallion_colour_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  colour_test text NOT NULL,
  gene_code text NULL,
  result text NOT NULL,
  source text NULL,
  admin_notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stallion_colour_tests_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_colour_tests_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_colour_tests_stallion_id
  ON public.stallion_colour_tests USING btree (stallion_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_colour_tests;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_colour_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Row level security
--   * Public read gated by is_published_stallion(stallion_id) (uuid overload).
--   * Authenticated role: full CRUD for dashboard usage.
-- ----------------------------------------------------------------------------

ALTER TABLE public.stallion_genetic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stallion_colour_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.stallion_genetic_tests;
DROP POLICY IF EXISTS "Public read access" ON public.stallion_colour_tests;

CREATE POLICY "Public read access" ON public.stallion_genetic_tests
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON public.stallion_colour_tests
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS stallion_genetic_tests_authenticated_all
  ON public.stallion_genetic_tests;
DROP POLICY IF EXISTS stallion_colour_tests_authenticated_all
  ON public.stallion_colour_tests;

CREATE POLICY stallion_genetic_tests_authenticated_all
  ON public.stallion_genetic_tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY stallion_colour_tests_authenticated_all
  ON public.stallion_colour_tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- API role grants (required alongside RLS for PostgREST access).
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.stallion_genetic_tests TO anon, authenticated;
GRANT SELECT ON public.stallion_colour_tests TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.stallion_genetic_tests
  TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.stallion_colour_tests
  TO authenticated, service_role;
