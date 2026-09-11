-- Site-wide header/footer layout content (EN + pt-BR) in cms_pages.layout

ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS layout jsonb;

ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_slug_allowed;

ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_slug_allowed
  CHECK (slug IN ('landing', 'about', 'pricing', 'header', 'footer'));

INSERT INTO public.cms_pages (slug, title, published, blocks, layout)
VALUES
  (
    'header',
    '{"en":"Header","pt-BR":"Cabeçalho"}'::jsonb,
    true,
    '[]'::jsonb,
    '{
      "brand": {"en": "Leading Sires", "pt-BR": "Leading Sires"},
      "registry": {"en": "Registry", "pt-BR": "Registro"},
      "stallionDirectory": {"en": "Stallion Directory", "pt-BR": "Diretório de Garanhões"},
      "about": {"en": "About", "pt-BR": "Sobre"},
      "pricing": {"en": "Pricing", "pt-BR": "Preços"},
      "resources": {"en": "Resources", "pt-BR": "Recursos"},
      "commercialDirectory": {"en": "Commercial Directory", "pt-BR": "Diretório Comercial"},
      "associationsRegistries": {"en": "Associations & Registries", "pt-BR": "Associações e Registros"},
      "login": {"en": "Login", "pt-BR": "Entrar"}
    }'::jsonb
  ),
  (
    'footer',
    '{"en":"Footer","pt-BR":"Rodapé"}'::jsonb,
    true,
    '[]'::jsonb,
    '{
      "brandTitle": {"en": "Leading Sires Registry", "pt-BR": "Leading Sires Registry"},
      "tagline": {"en": "Performance stallion reference platform", "pt-BR": "Plataforma de referência de garanhões de performance"},
      "breeds": {"en": "Quarter Horses | Paints | Appaloosas", "pt-BR": "Quarter Horses | Paints | Appaloosas"},
      "regionsLine1": {"en": "Australia | New Zealand | Europe | Canada", "pt-BR": "Austrália | Nova Zelândia | Europa | Canadá"},
      "regionsLine2": {"en": "North & South America", "pt-BR": "América do Norte e do Sul"},
      "linksHeading": {"en": "Links", "pt-BR": "Links úteis"},
      "submitListing": {"en": "Submit a Listing", "pt-BR": "Enviar um Anúncio"},
      "contactHeading": {"en": "Contacts Us", "pt-BR": "Fale Conosco"},
      "contactEmail": "info@leadingsiresregistry.com",
      "copyright": {"en": "© 2026 Leading Sires Registry | Records may include active, historical, or deceased stallions for pedigree and reference purposes.", "pt-BR": "© 2026 Leading Sires Registry | Os registros podem incluir garanhões ativos, históricos ou falecidos para fins de pedigree e referência."},
      "termsOfUse": {"en": "Terms of Use", "pt-BR": "Termos de Uso"},
      "privacyPolicy": {"en": "Privacy Policy", "pt-BR": "Política de Privacidade"}
    }'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
