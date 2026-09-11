-- Mini CMS: editable marketing pages (landing, about, pricing)

CREATE TABLE IF NOT EXISTS public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text,
  published boolean NOT NULL DEFAULT true,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_pages_slug_allowed CHECK (slug IN ('landing', 'about', 'pricing'))
);

CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON public.cms_pages (slug);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_pages_anon_read_published" ON public.cms_pages;
DROP POLICY IF EXISTS "cms_pages_auth_all" ON public.cms_pages;

CREATE POLICY "cms_pages_anon_read_published"
  ON public.cms_pages FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "cms_pages_auth_all"
  ON public.cms_pages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.cms_pages (slug, title, published, blocks)
VALUES
  ('landing', 'Home', true, '[]'::jsonb),
  ('about', 'About', true, '[]'::jsonb),
  ('pricing', 'Pricing', true, '[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
