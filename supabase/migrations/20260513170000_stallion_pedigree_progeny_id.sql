-- =============================================================================
-- stallion_pedigree.progeny_id
-- Optional link to the immediate descendant pedigree node one generation closer
-- to the subject stallion (generation - 1 for the same stallion).
-- Backfill grandparent rows from legacy stallions columns.
-- =============================================================================

ALTER TABLE public.stallion_pedigree
  ADD COLUMN IF NOT EXISTS progeny_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stallion_pedigree_progeny_id_fkey'
      AND conrelid = 'public.stallion_pedigree'::regclass
  ) THEN
    ALTER TABLE public.stallion_pedigree
      ADD CONSTRAINT stallion_pedigree_progeny_id_fkey
      FOREIGN KEY (progeny_id) REFERENCES public.pedigree (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stallion_pedigree_progeny_id
  ON public.stallion_pedigree USING btree (progeny_id) TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION public.validate_stallion_pedigree_progeny_generation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.progeny_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.generation <= 1 THEN
    RAISE EXCEPTION
      'stallion_pedigree.progeny_id cannot be set when generation is %',
      NEW.generation;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stallion_pedigree sp
    WHERE sp.stallion_id = NEW.stallion_id
      AND sp.pedigree_id = NEW.progeny_id
      AND sp.generation = NEW.generation - 1
  ) THEN
    RAISE EXCEPTION
      'stallion_pedigree.progeny_id must reference the same stallion pedigree entry at generation %',
      NEW.generation - 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_stallion_pedigree_progeny_generation
  ON public.stallion_pedigree;
CREATE TRIGGER validate_stallion_pedigree_progeny_generation
BEFORE INSERT OR UPDATE OF progeny_id, generation, stallion_id
ON public.stallion_pedigree
FOR EACH ROW
EXECUTE FUNCTION public.validate_stallion_pedigree_progeny_generation();

WITH grandparent_links AS (
  SELECT
    s.id AS stallion_id,
    NULLIF(trim(COALESCE(s.sire_grandsire, s.sires_grandsire)), '') AS ancestor_name,
    'sire'::public.pedigree_type AS ancestor_type,
    3 AS generation,
    NULLIF(trim(s.sire), '') AS parent_name,
    'sire'::public.pedigree_type AS parent_type,
    2 AS parent_generation
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.sire_granddam, s.sires_granddam)), ''),
    'dam'::public.pedigree_type,
    3,
    NULLIF(trim(s.sire), ''),
    'sire'::public.pedigree_type,
    2
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_grandsire, s.dams_grandsire)), ''),
    'sire'::public.pedigree_type,
    3,
    NULLIF(trim(s.dam), ''),
    'dam'::public.pedigree_type,
    2
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_granddam, s.dams_granddam)), ''),
    'dam'::public.pedigree_type,
    3,
    NULLIF(trim(s.dam), ''),
    'dam'::public.pedigree_type,
    2
  FROM public.stallions s
)
UPDATE public.stallion_pedigree sp
SET progeny_id = parent_sp.pedigree_id
FROM grandparent_links link
JOIN public.pedigree ancestor_pedigree
  ON ancestor_pedigree.type = link.ancestor_type
 AND lower(trim(ancestor_pedigree.name)) = lower(link.ancestor_name)
JOIN public.stallion_pedigree ancestor_sp
  ON ancestor_sp.stallion_id = link.stallion_id
 AND ancestor_sp.pedigree_id = ancestor_pedigree.id
 AND ancestor_sp.generation = link.generation
JOIN public.pedigree parent_pedigree
  ON parent_pedigree.type = link.parent_type
 AND lower(trim(parent_pedigree.name)) = lower(link.parent_name)
JOIN public.stallion_pedigree parent_sp
  ON parent_sp.stallion_id = link.stallion_id
 AND parent_sp.pedigree_id = parent_pedigree.id
 AND parent_sp.generation = link.parent_generation
WHERE sp.id = ancestor_sp.id
  AND link.ancestor_name IS NOT NULL
  AND link.parent_name IS NOT NULL
  AND sp.progeny_id IS DISTINCT FROM parent_sp.pedigree_id;
