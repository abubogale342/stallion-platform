-- Tag each research snippet image with the language of the material it contains,
-- so the AI agent knows how to process it.
--
-- Shape follows the house locale pattern (text + CHECK) established by
-- public.stallion_profile_translations rather than a Postgres ENUM. The schema
-- documentation reserves ENUMs for closed, developer-owned domains and prefers
-- TEXT + CHECK for values that back an admin dropdown; extending this column
-- later means editing the constraint below, with no ALTER TYPE.
--
-- Unlike stallion_profile_translations, 'en' IS an allowed value here: that
-- table stores translations away from an English source of truth, whereas this
-- column records the language of source material, which is usually English.
--
-- RLS: no policy change is required. stallion_research_snippets_images_admin_all
-- is row-level and column-agnostic, so a new column is covered by it unchanged.
-- The upload path also writes through an edge function using the service-role
-- key, which bypasses RLS entirely.
--
-- Safe to rerun.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'stallion_research_snippets_images'
  ) THEN
    ALTER TABLE public.stallion_research_snippets_images
      ADD COLUMN IF NOT EXISTS locale text;

    UPDATE public.stallion_research_snippets_images
      SET locale = 'en'
      WHERE locale IS NULL;

    ALTER TABLE public.stallion_research_snippets_images
      ALTER COLUMN locale SET DEFAULT 'en';

    ALTER TABLE public.stallion_research_snippets_images
      ALTER COLUMN locale SET NOT NULL;

    ALTER TABLE public.stallion_research_snippets_images
      DROP CONSTRAINT IF EXISTS stallion_research_snippets_images_locale_check;

    ALTER TABLE public.stallion_research_snippets_images
      ADD CONSTRAINT stallion_research_snippets_images_locale_check
      CHECK (
        locale = ANY (
          ARRAY[
            'en'::text,
            'pt-BR'::text
          ]
        )
      );

    EXECUTE $c$
      COMMENT ON COLUMN public.stallion_research_snippets_images.locale IS
        'Language of the source material captured in this image (BCP 47 tag).
         Extend by editing stallion_research_snippets_images_locale_check.'
    $c$;
  END IF;
END
$$;
