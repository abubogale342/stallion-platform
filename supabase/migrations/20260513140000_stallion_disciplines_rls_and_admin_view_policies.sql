-- =============================================================================
-- stallion_disciplines RLS (table was created after the original RLS migration).
-- Admin views: no view-level RLS in PostgreSQL; restrict via grants and
-- security_invoker so underlying table policies apply.
-- =============================================================================

ALTER TABLE public.stallion_disciplines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.stallion_disciplines;
CREATE POLICY "Public read access" ON public.stallion_disciplines
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS stallion_disciplines_authenticated_all
  ON public.stallion_disciplines;
CREATE POLICY stallion_disciplines_authenticated_all
  ON public.stallion_disciplines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.stallion_disciplines TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stallion_disciplines
  TO authenticated, service_role;

ALTER VIEW public.admin_stallion_colour_tests SET (security_invoker = true);
ALTER VIEW public.admin_stallion_genetic_tests SET (security_invoker = true);
ALTER VIEW public.admin_stallion_racing_summary SET (security_invoker = true);

REVOKE ALL ON public.admin_stallion_colour_tests FROM PUBLIC, anon;
REVOKE ALL ON public.admin_stallion_genetic_tests FROM PUBLIC, anon;
REVOKE ALL ON public.admin_stallion_racing_summary FROM PUBLIC, anon;

GRANT SELECT ON public.admin_stallion_colour_tests TO authenticated, service_role;
GRANT SELECT ON public.admin_stallion_genetic_tests TO authenticated, service_role;
GRANT SELECT ON public.admin_stallion_racing_summary TO authenticated, service_role;
