-- =============================================================================
-- Admin/dashboard: authenticated users can read all owner links and owner rows.
-- (Public policies remain published-stallion-only.)
-- Required for edit wizard step 7 on draft stallions and owner name search.
-- =============================================================================

DROP POLICY IF EXISTS stallion_owners_authenticated_select_all
  ON public.stallion_owners;
CREATE POLICY stallion_owners_authenticated_select_all
  ON public.stallion_owners
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS owners_authenticated_select_all ON public.owners;
CREATE POLICY owners_authenticated_select_all
  ON public.owners
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS owners_authenticated_all ON public.owners;
CREATE POLICY owners_authenticated_all
  ON public.owners
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS stallion_owners_authenticated_all ON public.stallion_owners;
CREATE POLICY stallion_owners_authenticated_all
  ON public.stallion_owners
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT INSERT, UPDATE, DELETE ON public.owners TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.stallion_owners TO authenticated, service_role;
