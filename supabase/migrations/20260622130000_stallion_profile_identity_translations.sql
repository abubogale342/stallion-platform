-- Per-locale identity field overrides (coat colour, breed label, discipline coverage).

ALTER TABLE public.stallion_profile_translations
  ADD COLUMN IF NOT EXISTS coat_colour text NULL,
  ADD COLUMN IF NOT EXISTS breed_label text NULL,
  ADD COLUMN IF NOT EXISTS discipline_coverage text NULL,
  ADD COLUMN IF NOT EXISTS breeding_method_labels jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.stallion_profile_translations.coat_colour IS
  'pt-BR coat colour display; English source on public.stallions.coat_colour.';
COMMENT ON COLUMN public.stallion_profile_translations.breed_label IS
  'Optional pt-BR breed label override; falls back to i18n from stallions.breed when empty.';
COMMENT ON COLUMN public.stallion_profile_translations.discipline_coverage IS
  'pt-BR discipline coverage text; English source is joined discipline family names.';
COMMENT ON COLUMN public.stallion_profile_translations.breeding_method_labels IS
  'pt-BR semen/breeding method labels keyed by English enum (e.g. Fresh → Fresco). Falls back to site i18n when a key is missing.';
