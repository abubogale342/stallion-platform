-- =============================================================================
-- Backfill stallion_pedigrees from legacy archive (manual, post-migration).
--
-- Prerequisites:
--   1. archive_stallion_pedigrees_legacy.sql already run
--   2. pedigree_schema_restructure migration applied (TRUNCATE + new progeny_id FK)
--
-- Legacy semantics (archive):
--   child row at gen N: progeny_id = pedigrees.id of parent horse at gen N-1
-- New semantics (live):
--   parent row at gen N: progeny_id = stallion_pedigrees.id of child row at gen N-1
--
-- Strategy:
--   1. Bulk INSERT all archived rows into stallion_pedigrees (progeny_id NULL).
--   2. UPDATE parent rows using stallion_pedigrees_legacy_backfill_map
--      (legacy child→parent join → new parent→child progeny_id).
--   3. Per-link failures logged to stallion_pedigrees_backfill_failures.
--   _backfill_collect_pedigree_paths / _backfill_apply_pedigree_path kept for
--   optional path-level debugging (not used by the main backfill entrypoint).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.stallion_pedigrees_backfill_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_batch_id uuid NOT NULL,
  stallion_id uuid NOT NULL,
  failed_archive_row_id uuid,
  failed_generation integer,
  error_message text NOT NULL,
  pruned_archive_row_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_backfill_failures_batch
  ON public.stallion_pedigrees_backfill_failures (archive_batch_id);

CREATE INDEX IF NOT EXISTS idx_sp_backfill_failures_stallion
  ON public.stallion_pedigrees_backfill_failures (stallion_id);

-- View may already exist from archive script with a different column layout;
-- CREATE OR REPLACE cannot add/reorder columns (42P16). Drop first.
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

-- Return type changed uuid[][] → SETOF uuid[]; must drop before recreate.
DROP FUNCTION IF EXISTS public._backfill_collect_pedigree_paths(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public._backfill_collect_pedigree_paths(
  p_batch_id uuid,
  p_stallion_id uuid,
  p_root_id uuid
)
RETURNS SETOF uuid[]
LANGUAGE sql
STABLE
AS $$
  -- Walk up the legacy tree: parent at gen N+1 has progeny_id = pedigrees.id of child at gen N.
  WITH RECURSIVE tree_paths AS (
    SELECT
      ARRAY[a.id]::uuid[] AS path_ids,
      a.generation AS tip_gen,
      a.pedigree_id AS tip_pedigree
    FROM public.stallion_pedigrees_legacy_archive a
    WHERE a.archive_batch_id = p_batch_id
      AND a.stallion_id = p_stallion_id
      AND a.id = p_root_id

    UNION ALL

    SELECT
      tp.path_ids || parent.id,
      parent.generation,
      parent.pedigree_id
    FROM tree_paths tp
    JOIN public.stallion_pedigrees_legacy_archive parent
      ON parent.archive_batch_id = p_batch_id
      AND parent.stallion_id = p_stallion_id
      AND parent.generation = tp.tip_gen + 1
      AND parent.progeny_id = tp.tip_pedigree
  )
  SELECT tp.path_ids
  FROM tree_paths tp
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.stallion_pedigrees_legacy_archive parent
    WHERE parent.archive_batch_id = p_batch_id
      AND parent.stallion_id = p_stallion_id
      AND parent.generation = tp.tip_gen + 1
      AND parent.progeny_id = tp.tip_pedigree
  );
$$;

CREATE OR REPLACE FUNCTION public._backfill_apply_pedigree_path(
  p_batch_id uuid,
  p_path uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_i integer;
  v_row_id uuid;
  v_parent_id uuid;
  v_child_id uuid;
BEGIN
  IF p_path IS NULL OR coalesce(array_length(p_path, 1), 0) = 0 THEN
    RETURN;
  END IF;

  FOREACH v_row_id IN ARRAY p_path LOOP
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
      a.id,
      a.stallion_id,
      a.pedigree_id,
      a.generation,
      NULL,
      a.created_at,
      a.updated_at
    FROM public.stallion_pedigrees_legacy_archive a
    WHERE a.archive_batch_id = p_batch_id
      AND a.id = v_row_id
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR v_i IN REVERSE array_length(p_path, 1) .. 2 LOOP
    v_parent_id := p_path[v_i];
    v_child_id := p_path[v_i - 1];

    UPDATE public.stallion_pedigrees sp
    SET
      progeny_id = v_child_id,
      updated_at = now()
    WHERE sp.id = v_parent_id
      AND sp.progeny_id IS DISTINCT FROM v_child_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._backfill_stallion_pedigrees_from_archive(
  p_batch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch uuid;
  v_archive_count integer;
  v_gen1_count integer;
  v_inserted integer;
  v_linked integer;
  v_link_failed integer;
  rec record;
BEGIN
  SELECT coalesce(
    p_batch_id,
    (
      SELECT archive_batch_id
      FROM public.stallion_pedigrees_legacy_archive
      ORDER BY archived_at DESC
      LIMIT 1
    )
  )
  INTO v_batch;

  IF v_batch IS NULL THEN
    RETURN jsonb_build_object(
      'error',
      'no archive batch found — run archive_stallion_pedigrees_legacy.sql before TRUNCATE'
    );
  END IF;

  IF to_regclass('public.stallion_pedigrees_legacy_archive') IS NULL THEN
    RETURN jsonb_build_object(
      'error',
      'stallion_pedigrees_legacy_archive does not exist'
    );
  END IF;

  SELECT count(*)
  INTO v_archive_count
  FROM public.stallion_pedigrees_legacy_archive
  WHERE archive_batch_id = v_batch;

  SELECT count(*)
  INTO v_gen1_count
  FROM public.stallion_pedigrees_legacy_archive
  WHERE archive_batch_id = v_batch
    AND generation = 1;

  IF v_archive_count = 0 THEN
    RETURN jsonb_build_object(
      'error',
      'archive batch is empty — archive must run while stallion_pedigrees still has rows',
      'archive_batch_id',
      v_batch,
      'archive_rows',
      0
    );
  END IF;

  -- 1) Insert every archived tree row (progeny_id linked in step 2).
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
    a.id,
    a.stallion_id,
    a.pedigree_id,
    a.generation,
    NULL,
    a.created_at,
    a.updated_at
  FROM public.stallion_pedigrees_legacy_archive a
  WHERE a.archive_batch_id = v_batch
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- 2) Set parent.progeny_id = child tree row id (new semantics).
  v_linked := 0;
  v_link_failed := 0;

  FOR rec IN
    SELECT DISTINCT ON (map.parent_tree_row_id)
      map.parent_tree_row_id,
      map.new_parent_progeny_id,
      map.parent_generation,
      map.child_tree_row_id
    FROM public.stallion_pedigrees_legacy_backfill_map map
    WHERE map.archive_batch_id = v_batch
    ORDER BY map.parent_tree_row_id, map.child_tree_row_id
  LOOP
    BEGIN
      UPDATE public.stallion_pedigrees sp
      SET
        progeny_id = rec.new_parent_progeny_id,
        updated_at = now()
      WHERE sp.id = rec.parent_tree_row_id
        AND sp.progeny_id IS DISTINCT FROM rec.new_parent_progeny_id;

      IF FOUND THEN
        v_linked := v_linked + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        INSERT INTO public.stallion_pedigrees_backfill_failures (
          archive_batch_id,
          stallion_id,
          failed_archive_row_id,
          failed_generation,
          error_message,
          pruned_archive_row_ids
        )
        SELECT
          v_batch,
          sp.stallion_id,
          rec.parent_tree_row_id,
          rec.parent_generation,
          SQLERRM,
          ARRAY[rec.parent_tree_row_id, rec.child_tree_row_id]
        FROM public.stallion_pedigrees sp
        WHERE sp.id = rec.parent_tree_row_id;

        v_link_failed := v_link_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'archive_batch_id',
    v_batch,
    'archive_rows',
    v_archive_count,
    'gen1_roots',
    v_gen1_count,
    'inserted_rows',
    v_inserted,
    'linked_parents',
    v_linked,
    'link_failures',
    v_link_failed,
    'live_row_count',
    (SELECT count(*) FROM public.stallion_pedigrees)
  );
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Execute when ready (uncomment):
-- ---------------------------------------------------------------------------
-- -- Sanity: archive must have rows (if 0, archive ran after TRUNCATE or on empty table)
-- SELECT archive_batch_id, count(*) AS row_count, min(archived_at)
-- FROM public.stallion_pedigrees_legacy_archive
-- GROUP BY archive_batch_id
-- ORDER BY min(archived_at) DESC;
--
-- SELECT public._backfill_stallion_pedigrees_from_archive();
-- SELECT * FROM public.stallion_pedigrees_backfill_failures ORDER BY created_at;
-- SELECT count(*) FROM public.stallion_pedigrees;
