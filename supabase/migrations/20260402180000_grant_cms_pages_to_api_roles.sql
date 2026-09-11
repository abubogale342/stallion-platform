-- cms_pages was created with RLS policies but without table-level GRANTS.
-- PostgREST / the JS client need SELECT (etc.) on the table for anon/authenticated
-- or Postgres returns: permission denied for table cms_pages

GRANT SELECT ON TABLE public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cms_pages TO authenticated;
