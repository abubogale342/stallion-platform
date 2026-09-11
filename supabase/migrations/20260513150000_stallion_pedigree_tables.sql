-- =============================================================================
-- pedigree + stallion_pedigree
-- Normalized pedigree nodes and stallion tree links by generation.
-- Public read when the parent stallion is published.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'pedigree_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.pedigree_type AS ENUM ('sire', 'dam');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pedigree (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.pedigree_type NOT NULL,
  birth_year integer NULL,
  association_name text NULL,
  height text NULL,
  registration_number text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedigree_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.stallion_pedigree (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  pedigree_id uuid NOT NULL,
  generation integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stallion_pedigree_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_pedigree_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE,
  CONSTRAINT stallion_pedigree_pedigree_id_fkey
    FOREIGN KEY (pedigree_id) REFERENCES public.pedigree (id) ON DELETE CASCADE,
  CONSTRAINT stallion_pedigree_generation_check
    CHECK (generation >= 1),
  CONSTRAINT stallion_pedigree_stallion_id_pedigree_id_generation_key
    UNIQUE (stallion_id, pedigree_id, generation)
) TABLESPACE pg_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stallion_pedigree_stallion_id_pedigree_id_generation_key'
      AND conrelid = 'public.stallion_pedigree'::regclass
  ) THEN
    ALTER TABLE public.stallion_pedigree
      ADD CONSTRAINT stallion_pedigree_stallion_id_pedigree_id_generation_key
      UNIQUE (stallion_id, pedigree_id, generation);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigree_stallion_id
  ON public.stallion_pedigree USING btree (stallion_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigree_pedigree_id
  ON public.stallion_pedigree USING btree (pedigree_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigree_stallion_generation
  ON public.stallion_pedigree USING btree (stallion_id, generation) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.pedigree;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.pedigree
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_pedigree;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_pedigree
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_pedigree_publicly_accessible(_pedigree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stallion_pedigree sp
    WHERE sp.pedigree_id = _pedigree_id
      AND public.is_published_stallion(sp.stallion_id)
  );
$$;

ALTER TABLE public.pedigree ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stallion_pedigree ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.stallion_pedigree;
CREATE POLICY "Public read access" ON public.stallion_pedigree
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS stallion_pedigree_authenticated_all
  ON public.stallion_pedigree;
CREATE POLICY stallion_pedigree_authenticated_all
  ON public.stallion_pedigree
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access" ON public.pedigree;
CREATE POLICY "Public read access" ON public.pedigree
  FOR SELECT
  USING (public.is_pedigree_publicly_accessible(id));

DROP POLICY IF EXISTS pedigree_authenticated_all ON public.pedigree;
CREATE POLICY pedigree_authenticated_all
  ON public.pedigree
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.pedigree TO anon, authenticated;
GRANT SELECT ON public.stallion_pedigree TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.pedigree
  TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.stallion_pedigree
  TO authenticated, service_role;
