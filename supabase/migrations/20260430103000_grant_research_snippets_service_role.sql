-- Fix 42501 when Edge Functions or service_role JWT access these tables.
--
-- Your baseline migration revokes PUBLIC schema usage and only does:
--   GRANT ALL ON SCHEMA public TO service_role;
-- That grants USAGE/CREATE on the schema, not SELECT/INSERT/UPDATE/DELETE on tables.
-- Tables created later (e.g. stallion_research_snippets) need explicit table grants.
--
-- Idempotent — safe to rerun.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets_images
TO service_role;

-- Ensure dashboard / anon+JWT users still have DML (in case earlier grants missed prod).
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets_images
TO authenticated;
