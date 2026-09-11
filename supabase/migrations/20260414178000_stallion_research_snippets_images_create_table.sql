-- Create images table for stallion research snippets.
-- Includes FK to stallion_research_snippets(id) and storage bucket path.
DO $$
BEGIN
  IF EXISTS(
    SELECT
      1
    FROM
      information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_name = 'stallion_research_snippets') THEN
  ALTER TABLE public.stallion_research_snippets
    ADD COLUMN IF NOT EXISTS description text;
END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.stallion_research_snippets_images(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id uuid NOT NULL,
  image_bucket_path text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stallion_research_snippets_images_snippet_id_fkey FOREIGN KEY (snippet_id) REFERENCES public.stallion_research_snippets(id) ON DELETE CASCADE)
