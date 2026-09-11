-- Fix PostgreSQL 42501 "permission denied for table stallion_research_snippets".
-- RLS policies do not grant table privileges; authenticated must have GRANT.
-- Idempotent — safe to rerun on prod.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.stallion_research_snippets_images
TO authenticated;
