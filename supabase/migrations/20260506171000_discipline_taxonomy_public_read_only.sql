-- Ensure discipline reference tables are publicly readable (SELECT only).

ALTER TABLE public.discipline_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.discipline_families;
DROP POLICY IF EXISTS "Public read access" ON public.discipline_subcategories;
DROP POLICY IF EXISTS discipline_families_authenticated_all
  ON public.discipline_families;
DROP POLICY IF EXISTS discipline_subcategories_authenticated_all
  ON public.discipline_subcategories;

CREATE POLICY "Public read access" ON public.discipline_families
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access" ON public.discipline_subcategories
  FOR SELECT
  USING (true);

GRANT SELECT ON public.discipline_families TO anon, authenticated;
GRANT SELECT ON public.discipline_subcategories TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.discipline_families FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.discipline_subcategories FROM anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.discipline_families TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.discipline_subcategories TO service_role;
