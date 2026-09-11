-- =============================================================================
-- Admin read/write for child tables on draft stallions (RLS was publish-only).
-- Racing tables already have stallion_racing_*_authenticated_all policies.
-- =============================================================================

DROP POLICY IF EXISTS stallion_performance_records_authenticated_all
  ON public.stallion_performance_records;
CREATE POLICY stallion_performance_records_authenticated_all
  ON public.stallion_performance_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stallion_performance_records
  TO authenticated, service_role;

DROP POLICY IF EXISTS stallion_progeny_authenticated_all ON public.stallion_progeny;
CREATE POLICY stallion_progeny_authenticated_all
  ON public.stallion_progeny
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS stallion_foal_crops_authenticated_all ON public.stallion_foal_crops;
CREATE POLICY stallion_foal_crops_authenticated_all
  ON public.stallion_foal_crops
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stallion_progeny TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stallion_foal_crops TO authenticated, service_role;
