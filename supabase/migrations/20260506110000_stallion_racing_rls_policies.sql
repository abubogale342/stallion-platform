-- =============================================================================
-- RLS + grants for stallion_racing_results and stallion_racing_summary.
-- Mirrors the pattern used by other stallion child tables:
--   * public read gated by is_published_stallion(stallion_id)
--   * authenticated role: full access (dashboard CRUD)
--   * GRANTs to anon, authenticated, service_role
-- =============================================================================

ALTER TABLE public.stallion_racing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stallion_racing_summary ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Public (anon + authenticated) read: only when the parent stallion is published.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access" ON public.stallion_racing_results;
DROP POLICY IF EXISTS "Public read access" ON public.stallion_racing_summary;

CREATE POLICY "Public read access" ON public.stallion_racing_results
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

CREATE POLICY "Public read access" ON public.stallion_racing_summary
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

-- ----------------------------------------------------------------------------
-- Authenticated (admin/dashboard): full read + write on every row,
-- regardless of publish status.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS stallion_racing_results_authenticated_all
  ON public.stallion_racing_results;
DROP POLICY IF EXISTS stallion_racing_summary_authenticated_all
  ON public.stallion_racing_summary;

CREATE POLICY stallion_racing_results_authenticated_all
  ON public.stallion_racing_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY stallion_racing_summary_authenticated_all
  ON public.stallion_racing_summary
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- API role grants (separate from RLS — required for PostgREST to even attempt
-- the query).
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.stallion_racing_results TO anon, authenticated;
GRANT SELECT ON public.stallion_racing_summary TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.stallion_racing_results
  TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.stallion_racing_summary
  TO authenticated, service_role;
