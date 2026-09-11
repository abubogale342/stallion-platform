-- Allow authenticated users (admin/dashboard) to read all stallions.
-- Keeps existing public policy (published-only) intact.

ALTER TABLE public.stallions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stallions_authenticated_select_all
  ON public.stallions;

CREATE POLICY stallions_authenticated_select_all
  ON public.stallions
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.stallions TO authenticated;
