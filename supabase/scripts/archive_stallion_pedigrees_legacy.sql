-- =============================================================================
-- Archive stallion_pedigrees in current (pre-restructure) shape.
-- Run ONCE before TRUNCATE in pedigree_schema_restructure migration.
--
-- Legacy semantics preserved in archive:
--   progeny_id → pedigrees.id of PARENT horse (child row at gen N points UP to gen N-1)
-- New semantics (after restructure):
--   progeny_id → stallion_pedigrees.id of CHILD row (parent at gen N points DOWN to gen N-1)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Archive table (one-time snapshot; no FKs so truncate cannot cascade)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stallion_pedigrees_legacy_archive (
  archive_batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  archived_at timestamptz NOT NULL DEFAULT now(),

  id uuid NOT NULL,
  stallion_id uuid NOT NULL,
  pedigree_id uuid NOT NULL,
  generation integer NOT NULL,
  progeny_id uuid NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  legacy_progeny_points_to text NOT NULL DEFAULT 'pedigrees.id_of_parent_at_generation_minus_1',

  PRIMARY KEY (archive_batch_id, id)
);

COMMENT ON TABLE public.stallion_pedigrees_legacy_archive IS
  'Pre-restructure snapshot of stallion_pedigrees. progeny_id is pedigrees.id (parent), not stallion_pedigrees.id. Use stallion_pedigrees_legacy_backfill_map for transform.';

CREATE INDEX IF NOT EXISTS idx_sp_legacy_archive_stallion
  ON public.stallion_pedigrees_legacy_archive (stallion_id);

CREATE INDEX IF NOT EXISTS idx_sp_legacy_archive_batch
  ON public.stallion_pedigrees_legacy_archive (archive_batch_id);

-- ---------------------------------------------------------------------------
-- 2. Capture current rows (skip if source is empty)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.stallion_pedigrees;

  IF v_count = 0 THEN
    RAISE NOTICE 'stallion_pedigrees is empty — nothing to archive.';
    RETURN;
  END IF;

  INSERT INTO public.stallion_pedigrees_legacy_archive (
    archive_batch_id,
    id,
    stallion_id,
    pedigree_id,
    generation,
    progeny_id,
    created_at,
    updated_at
  )
  SELECT
    v_batch,
    id,
    stallion_id,
    pedigree_id,
    generation,
    progeny_id,
    created_at,
    updated_at
  FROM public.stallion_pedigrees;

  RAISE NOTICE 'Archived % stallion_pedigrees rows (batch %).',
    v_count, v_batch;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Backfill helper view — maps legacy child→parent to new parent→child progeny_id
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.stallion_pedigrees_legacy_backfill_map;

CREATE VIEW public.stallion_pedigrees_legacy_backfill_map AS
SELECT
  parent_row.archive_batch_id,
  parent_row.archived_at,
  parent_row.id AS parent_tree_row_id,
  parent_row.stallion_id,
  parent_row.generation AS parent_generation,
  parent_row.pedigree_id AS parent_pedigree_id,
  child_row.id AS child_tree_row_id,
  child_row.generation AS child_generation,
  child_row.pedigree_id AS child_pedigree_id,
  parent_row.progeny_id AS legacy_progeny_pedigree_id,
  child_row.id AS new_parent_progeny_id
FROM public.stallion_pedigrees_legacy_archive parent_row
JOIN public.stallion_pedigrees_legacy_archive child_row
  ON child_row.archive_batch_id = parent_row.archive_batch_id
  AND child_row.stallion_id = parent_row.stallion_id
  AND child_row.generation = parent_row.generation - 1
  AND child_row.pedigree_id = parent_row.progeny_id
WHERE parent_row.progeny_id IS NOT NULL
  AND parent_row.generation >= 2;

COMMENT ON VIEW public.stallion_pedigrees_legacy_backfill_map IS
  'Backfill: parent row (higher gen) sets progeny_id = new_parent_progeny_id (child tree row id).';

-- ---------------------------------------------------------------------------
-- 4. Sanity counts (optional)
-- ---------------------------------------------------------------------------
SELECT archive_batch_id, count(*) AS row_count, min(archived_at) AS archived_at
FROM public.stallion_pedigrees_legacy_archive
GROUP BY archive_batch_id
ORDER BY archived_at DESC;

COMMIT;
