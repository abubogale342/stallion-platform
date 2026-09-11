-- Admin flows update stallions directly (performance summary save, video URL on
-- the media page) in addition to the SECURITY DEFINER form RPCs. The authenticated
-- role already holds the table-level UPDATE grant, but no RLS UPDATE policy existed
-- in migrations, so those updates matched zero rows on a migrations-built database
-- ("Cannot coerce the result to a single JSON object" from .single()).
-- Publish integrity is still enforced by stallions_published_required_fields_chk
-- and the set_stallion_publish_status RPC.

DROP POLICY IF EXISTS stallions_authenticated_update ON public.stallions;
CREATE POLICY stallions_authenticated_update
  ON public.stallions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON public.stallions TO authenticated;
