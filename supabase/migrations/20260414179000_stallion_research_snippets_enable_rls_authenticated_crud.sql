-- Enable RLS on research snippet tables and allow authenticated CRUD.
-- Safe to rerun.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'stallion_research_snippets'
  ) THEN
    ALTER TABLE public.stallion_research_snippets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS stallion_research_snippets_authenticated_crud
      ON public.stallion_research_snippets;

    CREATE POLICY stallion_research_snippets_authenticated_crud
      ON public.stallion_research_snippets
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'stallion_research_snippets_images'
  ) THEN
    ALTER TABLE public.stallion_research_snippets_images ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS stallion_research_snippets_images_authenticated_crud
      ON public.stallion_research_snippets_images;

    CREATE POLICY stallion_research_snippets_images_authenticated_crud
      ON public.stallion_research_snippets_images
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
