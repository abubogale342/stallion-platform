-- =============================================================================
-- Introduce pedigrees + stallion_pedigrees, copy legacy rows, then drop pedigree
-- and stallion_pedigree.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pedigrees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.pedigree_type NOT NULL,
  birth_year integer NULL,
  association_name text NULL,
  height text NULL,
  registration_number text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedigrees_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

DO $$
BEGIN
  IF to_regclass('public.pedigree') IS NOT NULL THEN
    INSERT INTO public.pedigrees (
      id,
      name,
      type,
      birth_year,
      association_name,
      height,
      registration_number,
      created_at,
      updated_at
    )
    SELECT
      id,
      name,
      type,
      birth_year,
      association_name,
      height,
      registration_number,
      created_at,
      updated_at
    FROM public.pedigree
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at ON public.pedigrees;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.pedigrees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pedigrees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.pedigrees;
CREATE POLICY "Public read access" ON public.pedigrees
  FOR SELECT
  USING (public.is_pedigree_publicly_accessible(id));

DROP POLICY IF EXISTS pedigrees_authenticated_all ON public.pedigrees;
CREATE POLICY pedigrees_authenticated_all
  ON public.pedigrees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.pedigrees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pedigrees
  TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.stallion_pedigrees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  pedigree_id uuid NOT NULL,
  generation integer NOT NULL,
  progeny_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stallion_pedigrees_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_pedigrees_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE,
  CONSTRAINT stallion_pedigrees_pedigree_id_fkey
    FOREIGN KEY (pedigree_id) REFERENCES public.pedigrees (id) ON DELETE CASCADE,
  CONSTRAINT stallion_pedigrees_progeny_id_fkey
    FOREIGN KEY (progeny_id) REFERENCES public.pedigrees (id) ON DELETE SET NULL,
  CONSTRAINT stallion_pedigrees_generation_check
    CHECK (generation >= 1),
  CONSTRAINT stallion_pedigrees_stallion_id_pedigree_id_generation_key
    UNIQUE (stallion_id, pedigree_id, generation)
) TABLESPACE pg_default;

DO $$
BEGIN
  IF to_regclass('public.stallion_pedigree') IS NOT NULL THEN
    INSERT INTO public.stallion_pedigrees (
      id,
      stallion_id,
      pedigree_id,
      generation,
      progeny_id,
      created_at,
      updated_at
    )
    SELECT
      id,
      stallion_id,
      pedigree_id,
      generation,
      progeny_id,
      created_at,
      updated_at
    FROM public.stallion_pedigree
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigrees_stallion_id
  ON public.stallion_pedigrees USING btree (stallion_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigrees_pedigree_id
  ON public.stallion_pedigrees USING btree (pedigree_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigrees_stallion_generation
  ON public.stallion_pedigrees USING btree (stallion_id, generation) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigrees_progeny_id
  ON public.stallion_pedigrees USING btree (progeny_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_pedigrees;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_pedigrees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_stallion_pedigrees_progeny_generation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.progeny_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.generation <= 1 THEN
    RAISE EXCEPTION
      'stallion_pedigrees.progeny_id cannot be set when generation is %',
      NEW.generation;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stallion_pedigrees sp
    WHERE sp.stallion_id = NEW.stallion_id
      AND sp.pedigree_id = NEW.progeny_id
      AND sp.generation = NEW.generation - 1
  ) THEN
    RAISE EXCEPTION
      'stallion_pedigrees.progeny_id must reference the same stallion pedigree entry at generation %',
      NEW.generation - 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_stallion_pedigrees_progeny_generation
  ON public.stallion_pedigrees;
CREATE TRIGGER validate_stallion_pedigrees_progeny_generation
BEFORE INSERT OR UPDATE OF progeny_id, generation, stallion_id
ON public.stallion_pedigrees
FOR EACH ROW
EXECUTE FUNCTION public.validate_stallion_pedigrees_progeny_generation();

CREATE OR REPLACE FUNCTION public.is_pedigree_publicly_accessible(_pedigree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stallion_pedigrees sp
    WHERE sp.pedigree_id = _pedigree_id
      AND public.is_published_stallion(sp.stallion_id)
  );
$$;

ALTER TABLE public.stallion_pedigrees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.stallion_pedigrees;
CREATE POLICY "Public read access" ON public.stallion_pedigrees
  FOR SELECT
  USING (public.is_published_stallion(stallion_id));

DROP POLICY IF EXISTS stallion_pedigrees_authenticated_all
  ON public.stallion_pedigrees;
CREATE POLICY stallion_pedigrees_authenticated_all
  ON public.stallion_pedigrees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.stallion_pedigrees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stallion_pedigrees
  TO authenticated, service_role;

DROP TRIGGER IF EXISTS validate_stallion_pedigree_progeny_generation
  ON public.stallion_pedigree;
DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_pedigree;
DROP POLICY IF EXISTS "Public read access" ON public.stallion_pedigree;
DROP POLICY IF EXISTS stallion_pedigree_authenticated_all
  ON public.stallion_pedigree;
DROP TABLE IF EXISTS public.stallion_pedigree;

DROP FUNCTION IF EXISTS public.validate_stallion_pedigree_progeny_generation();

DROP TRIGGER IF EXISTS set_updated_at ON public.pedigree;
DROP POLICY IF EXISTS "Public read access" ON public.pedigree;
DROP POLICY IF EXISTS pedigree_authenticated_all ON public.pedigree;
DROP TABLE IF EXISTS public.pedigree;
