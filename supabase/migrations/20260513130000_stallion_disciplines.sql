-- =============================================================================
-- stallion_disciplines
-- Links stallions to discipline taxonomy (family and optional subcategory).
-- RLS and grants: 20260506172000_stallion_disciplines_rls.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stallion_disciplines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  family_id uuid NULL,
  subcategory_id uuid NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT stallion_disciplines_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_disciplines_family_id_fkey
    FOREIGN KEY (family_id) REFERENCES public.discipline_families (id),
  CONSTRAINT stallion_disciplines_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE,
  CONSTRAINT stallion_disciplines_subcategory_id_fkey
    FOREIGN KEY (subcategory_id) REFERENCES public.discipline_subcategories (id)
) TABLESPACE pg_default;

-- ----------------------------------------------------------------------------
-- admin_stallion_colour_tests
-- Admin-facing read model over stallion_colour_tests (includes admin_notes).
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.admin_stallion_colour_tests;

CREATE VIEW public.admin_stallion_colour_tests AS
SELECT
  id,
  stallion_id,
  colour_test,
  gene_code,
  result,
  source,
  admin_notes,
  created_at,
  updated_at
FROM public.stallion_colour_tests;

GRANT SELECT ON public.admin_stallion_colour_tests TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- admin_stallion_genetic_tests
-- Admin-facing read model over stallion_genetic_tests with stallion name.
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.admin_stallion_genetic_tests;

CREATE VIEW public.admin_stallion_genetic_tests AS
SELECT
  gt.id,
  gt.stallion_id,
  s.stallion_name,
  gt.test_type,
  gt.gene_code,
  gt.result,
  gt.source,
  gt.admin_notes,
  gt.created_at,
  gt.updated_at
FROM public.stallion_genetic_tests gt
JOIN public.stallions s ON s.id = gt.stallion_id;

GRANT SELECT ON public.admin_stallion_genetic_tests TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- admin_stallion_racing_summary
-- Admin-facing read model over stallion_racing_summary with stallion name.
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.admin_stallion_racing_summary;

CREATE VIEW public.admin_stallion_racing_summary AS
SELECT
  rs.id,
  rs.stallion_id,
  s.stallion_name,
  rs.career_starts,
  rs.career_firsts,
  rs.career_seconds,
  rs.career_thirds,
  rs.career_earnings,
  rs.highest_rating,
  rs.earnings_per_start,
  rs.source,
  rs.admin_notes,
  rs.updated_at
FROM public.stallion_racing_summary rs
JOIN public.stallions s ON s.id = rs.stallion_id;

GRANT SELECT ON public.admin_stallion_racing_summary TO authenticated, service_role;
