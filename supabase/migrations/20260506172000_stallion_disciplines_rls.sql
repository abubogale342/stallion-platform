-- =============================================================================
-- RLS + grants for stallion_disciplines.
-- Public read only when the parent stallion is published.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'stallion_disciplines'
  ) THEN
    RETURN;
  END IF;

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
END $$;
