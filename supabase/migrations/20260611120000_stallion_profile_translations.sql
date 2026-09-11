-- Language-agnostic stallion profile narrative translations (non-English locales).

CREATE TABLE IF NOT EXISTS public.stallion_profile_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  locale text NOT NULL,
  summary text NULL,
  performance_summary text NULL,
  breeding_summary text NULL,
  publish_status public.publish_status_type NOT NULL DEFAULT 'draft'::public.publish_status_type,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stallion_profile_translations_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_profile_translations_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE,
  CONSTRAINT stallion_profile_translations_stallion_locale_unique
    UNIQUE (stallion_id, locale),
  CONSTRAINT stallion_profile_translations_locale_check
    CHECK (
      locale = ANY (
        ARRAY[
          'pt-BR'::text,
          'es'::text,
          'it'::text,
          'fr'::text,
          'de'::text,
          'pl'::text
        ]
      )
    )
) TABLESPACE pg_default;  

CREATE INDEX IF NOT EXISTS idx_stallion_profile_translations_stallion_locale
  ON public.stallion_profile_translations USING btree (stallion_id, locale);

CREATE INDEX IF NOT EXISTS idx_stallion_profile_translations_locale_publish
  ON public.stallion_profile_translations USING btree (locale, publish_status);

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_profile_translations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.stallion_profile_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.stallion_profile_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stallion_profile_translations_public_read
  ON public.stallion_profile_translations;
CREATE POLICY stallion_profile_translations_public_read
  ON public.stallion_profile_translations
  FOR SELECT
  USING (
    publish_status = 'published'::public.publish_status_type
    AND public.is_published_stallion(stallion_id)
  );

DROP POLICY IF EXISTS stallion_profile_translations_authenticated_all
  ON public.stallion_profile_translations;
CREATE POLICY stallion_profile_translations_authenticated_all
  ON public.stallion_profile_translations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.stallion_profile_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stallion_profile_translations
  TO authenticated, service_role;

COMMENT ON TABLE public.stallion_profile_translations IS
  'Translated stallion narrative fields per locale. English source of truth remains on public.stallions.';
