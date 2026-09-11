-- =============================================================================
-- stallion_breeding_service_providers
-- Normalizes breeding service provider details per stallion.
-- Links to resources_directory via breeding_service_provider (same as stallions).
-- Includes RLS (published stallions only for public read), grants, and backfill.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.stallion_breeding_service_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  breeding_service_provider uuid NULL,
  name text NULL,
  website text NULL,
  country text NULL,
  email text NULL,
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stallion_breeding_service_providers_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_breeding_service_providers_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'resource_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'breeding_service_provider'
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      RENAME COLUMN resource_id TO breeding_service_provider;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      RENAME COLUMN provider_name TO name;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_website'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'website'
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      RENAME COLUMN provider_website TO website;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_country'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'country'
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      RENAME COLUMN provider_country TO country;
  END IF;

  ALTER TABLE public.stallion_breeding_service_providers
    ADD COLUMN IF NOT EXISTS breeding_service_provider uuid NULL,
    ADD COLUMN IF NOT EXISTS name text NULL,
    ADD COLUMN IF NOT EXISTS website text NULL,
    ADD COLUMN IF NOT EXISTS country text NULL,
    ADD COLUMN IF NOT EXISTS email text NULL,
    ADD COLUMN IF NOT EXISTS phone text NULL,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_name'
  ) THEN
    UPDATE public.stallion_breeding_service_providers
    SET name = COALESCE(
      NULLIF(trim(name), ''),
      NULLIF(trim(provider_name), '')
    )
    WHERE name IS NULL OR trim(name) = '';

    ALTER TABLE public.stallion_breeding_service_providers
      DROP COLUMN provider_name;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_website'
  ) THEN
    UPDATE public.stallion_breeding_service_providers
    SET website = COALESCE(
      NULLIF(trim(website), ''),
      NULLIF(trim(provider_website), '')
    )
    WHERE website IS NULL OR trim(website) = '';

    ALTER TABLE public.stallion_breeding_service_providers
      DROP COLUMN provider_website;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'provider_country'
  ) THEN
    UPDATE public.stallion_breeding_service_providers
    SET country = COALESCE(
      NULLIF(trim(country), ''),
      NULLIF(trim(provider_country), '')
    )
    WHERE country IS NULL OR trim(country) = '';

    ALTER TABLE public.stallion_breeding_service_providers
      DROP COLUMN provider_country;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallion_breeding_service_providers'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      ALTER COLUMN name DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.stallion_breeding_service_providers'::regclass
      AND contype = 'f'
      AND conname IN (
        'sbs_providers_bsp_fkey',
        'stallion_breeding_service_providers_breeding_service_provider_fkey',
        'stallion_breeding_service_providers_breeding_service_provider_f'
      )
  ) THEN
    ALTER TABLE public.stallion_breeding_service_providers
      ADD CONSTRAINT sbs_providers_bsp_fkey
      FOREIGN KEY (breeding_service_provider)
      REFERENCES public.resources_directory (id) ON DELETE SET NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_stallion_breeding_service_providers_resource_id;

CREATE INDEX IF NOT EXISTS idx_stallion_breeding_service_providers_stallion_id
  ON public.stallion_breeding_service_providers USING btree (stallion_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sbs_providers_bsp
  ON public.stallion_breeding_service_providers USING btree (breeding_service_provider) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_breeding_service_providers;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_breeding_service_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Row level security
--   * Public read gated by is_published_stallion(stallion_id).
--   * Authenticated role: full CRUD for dashboard usage.
-- ----------------------------------------------------------------------------

ALTER TABLE public.stallion_breeding_service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.stallion_breeding_service_providers;
CREATE POLICY "Public read access" ON public.stallion_breeding_service_providers
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS stallion_breeding_service_providers_authenticated_all
  ON public.stallion_breeding_service_providers;
CREATE POLICY stallion_breeding_service_providers_authenticated_all
  ON public.stallion_breeding_service_providers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- API role grants (required alongside RLS for PostgREST access).
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.stallion_breeding_service_providers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stallion_breeding_service_providers
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Backfill from legacy stallions columns.
-- When a stallion links to resources_directory, resource details take priority.
-- ----------------------------------------------------------------------------

INSERT INTO public.stallion_breeding_service_providers (
  stallion_id,
  breeding_service_provider,
  name,
  website,
  country,
  email,
  phone
)
SELECT
  s.id,
  s.breeding_service_provider,
  COALESCE(
    NULLIF(trim(rd.name), ''),
    NULLIF(trim(s.breeding_service_provider_name), '')
  ),
  COALESCE(
    NULLIF(trim(rd.website), ''),
    NULLIF(trim(s.breeding_service_provider_website), '')
  ),
  COALESCE(
    NULLIF(trim(rd.country), ''),
    NULLIF(trim(s.breeding_service_provider_country), '')
  ),
  NULLIF(trim(s.breeding_service_provider_email), ''),
  NULLIF(trim(s.breeding_service_provider_phone), '')
FROM public.stallions s
LEFT JOIN public.resources_directory rd
  ON rd.id = s.breeding_service_provider
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stallion_breeding_service_providers existing
  WHERE existing.stallion_id = s.id
)
AND (
  s.breeding_service_provider IS NOT NULL
  OR NULLIF(trim(s.breeding_service_provider_name), '') IS NOT NULL
  OR NULLIF(trim(s.breeding_service_provider_website), '') IS NOT NULL
  OR NULLIF(trim(s.breeding_service_provider_country), '') IS NOT NULL
  OR NULLIF(trim(s.breeding_service_provider_email), '') IS NOT NULL
  OR NULLIF(trim(s.breeding_service_provider_phone), '') IS NOT NULL
);
