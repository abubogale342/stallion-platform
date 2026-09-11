-- Ensure authenticated role has table privileges for research snippets.
-- Safe to rerun.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets_images
TO authenticated;
