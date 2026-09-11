-- Pedigree generation prefill: copy known ancestor chains into a tree
-- after a typeahead match, with needs_review + source notes.

ALTER TABLE public.stallion_pedigrees
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

ALTER TABLE public.stallion_pedigrees
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.stallion_pedigrees.needs_review IS
  'Admin flag for prefilled ancestor rows that should be checked before publish.';
COMMENT ON COLUMN public.stallion_pedigrees.admin_notes IS
  'Staff-only notes; e.g. source stallion when a chain was prefilled.';

REVOKE SELECT ON public.stallion_pedigrees FROM anon;
GRANT SELECT (
  id,
  stallion_id,
  pedigree_id,
  generation,
  progeny_id,
  created_at,
  updated_at
) ON public.stallion_pedigrees TO anon;

GRANT SELECT ON public.stallion_pedigrees TO authenticated;

CREATE OR REPLACE FUNCTION public._pedigree_ancestor_rows(p_anchor_id uuid)
RETURNS TABLE (
  id uuid,
  stallion_id uuid,
  pedigree_id uuid,
  generation integer,
  progeny_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT
      sp.id,
      sp.stallion_id,
      sp.pedigree_id,
      sp.generation,
      sp.progeny_id
    FROM public.stallion_pedigrees sp
    WHERE sp.id = p_anchor_id

    UNION ALL

    SELECT
      parent.id,
      parent.stallion_id,
      parent.pedigree_id,
      parent.generation,
      parent.progeny_id
    FROM public.stallion_pedigrees parent
    JOIN tree child ON parent.progeny_id = child.id
    WHERE parent.stallion_id = child.stallion_id
  )
  SELECT
    tree.id,
    tree.stallion_id,
    tree.pedigree_id,
    tree.generation,
    tree.progeny_id
  FROM tree
  WHERE tree.id IS DISTINCT FROM p_anchor_id;
$$;

CREATE OR REPLACE FUNCTION public._best_pedigree_prefill_anchor(
  p_pedigree_id uuid,
  p_exclude_stallion_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_best uuid;
  v_best_count integer := 0;
BEGIN
  IF p_pedigree_id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_id IN
    SELECT sp.id
    FROM public.stallion_pedigrees sp
    WHERE sp.pedigree_id = p_pedigree_id
      AND sp.stallion_id IS DISTINCT FROM p_exclude_stallion_id
  LOOP
    SELECT count(*)::integer INTO v_count
    FROM public._pedigree_ancestor_rows(v_id);

    IF v_count > v_best_count THEN
      v_best_count := v_count;
      v_best := v_id;
    END IF;
  END LOOP;

  IF v_best_count = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v_best;
END;
$$;

CREATE OR REPLACE FUNCTION public._pedigree_prefill_source_json(
  p_source_anchor uuid,
  p_anchor_generation integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_stallion uuid;
  v_source_name text;
  v_src_anchor_gen integer;
  v_anchor_gen integer;
  v_from integer;
  v_to integer;
  v_ancestors jsonb;
  v_count integer;
BEGIN
  SELECT sp.stallion_id, sp.generation
  INTO v_source_stallion, v_src_anchor_gen
  FROM public.stallion_pedigrees sp
  WHERE sp.id = p_source_anchor;

  IF v_source_stallion IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.stallion_name INTO v_source_name
  FROM public.stallions s
  WHERE s.id = v_source_stallion;

  v_anchor_gen := GREATEST(COALESCE(p_anchor_generation, 1), 1);
  v_from := v_anchor_gen + 1;
  v_to := LEAST(8, v_anchor_gen + 3);

  SELECT
    jsonb_agg(
      jsonb_build_object(
        'generation', mapped.new_generation,
        'name', mapped.name
      )
      ORDER BY mapped.new_generation, mapped.type_rank, mapped.name
    ),
    count(*)::integer,
    min(mapped.new_generation),
    max(mapped.new_generation)
  INTO v_ancestors, v_count, v_from, v_to
  FROM (
    SELECT
      v_anchor_gen + (a.generation - v_src_anchor_gen) AS new_generation,
      ped.name,
      CASE WHEN ped.type = 'sire' THEN 0 ELSE 1 END AS type_rank
    FROM public._pedigree_ancestor_rows(p_source_anchor) a
    JOIN public.pedigrees ped ON ped.id = a.pedigree_id
    WHERE v_anchor_gen + (a.generation - v_src_anchor_gen)
      BETWEEN v_from AND LEAST(8, v_anchor_gen + 3)
      AND NULLIF(btrim(ped.name), '') IS NOT NULL
  ) mapped;

  IF v_count IS NULL OR v_count = 0 THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'source_anchor_id', p_source_anchor,
    'source_stallion_id', v_source_stallion,
    'source_stallion_name', COALESCE(NULLIF(btrim(v_source_name), ''), 'Unknown stallion'),
    'ancestor_count', v_count,
    'from_generation', v_from,
    'to_generation', v_to,
    'ancestors', COALESCE(v_ancestors, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pedigree_prefill_preview(
  p_pedigree_id uuid,
  p_exclude_stallion_id uuid,
  p_anchor_generation integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horse_name text;
  v_id uuid;
  v_src jsonb;
  v_sid text;
  v_existing jsonb;
  v_by_stallion jsonb := '{}'::jsonb;
  v_sources jsonb := '[]'::jsonb;
  v_best_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated.');
  END IF;

  IF p_exclude_stallion_id IS NOT NULL
    AND NOT public.can_edit_stallion(p_exclude_stallion_id)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot edit this horse.');
  END IF;

  SELECT p.name INTO v_horse_name
  FROM public.pedigrees p
  WHERE p.id = p_pedigree_id;

  FOR v_id IN
    SELECT sp.id
    FROM public.stallion_pedigrees sp
    WHERE sp.pedigree_id = p_pedigree_id
      AND sp.stallion_id IS DISTINCT FROM p_exclude_stallion_id
  LOOP
    v_src := public._pedigree_prefill_source_json(v_id, p_anchor_generation);
    IF v_src IS NULL THEN
      CONTINUE;
    END IF;

    v_sid := v_src ->> 'source_stallion_id';
    v_existing := v_by_stallion -> v_sid;
    IF v_existing IS NULL
      OR (v_src ->> 'ancestor_count')::integer
        > (v_existing ->> 'ancestor_count')::integer
    THEN
      v_by_stallion := v_by_stallion || jsonb_build_object(v_sid, v_src);
    END IF;
  END LOOP;

  SELECT
    COALESCE(
      jsonb_agg(value ORDER BY (value ->> 'ancestor_count')::integer DESC),
      '[]'::jsonb
    )
  INTO v_sources
  FROM jsonb_each(v_by_stallion);

  IF jsonb_typeof(v_sources) = 'array' AND jsonb_array_length(v_sources) > 0 THEN
    v_best_count := (v_sources -> 0 ->> 'ancestor_count')::integer;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'horse_name', v_horse_name,
    'ancestor_count', COALESCE(v_best_count, 0),
    'sources', COALESCE(v_sources, '[]'::jsonb)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.prefill_stallion_pedigree_ancestors(uuid, uuid);
DROP FUNCTION IF EXISTS public.prefill_stallion_pedigree_ancestors(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.prefill_stallion_pedigree_ancestors(
  p_stallion_id uuid,
  p_anchor_link_id uuid,
  p_source_anchor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anchor public.stallion_pedigrees%ROWTYPE;
  v_source_anchor uuid;
  v_src_anchor_gen integer;
  v_source_stallion uuid;
  v_source_name text;
  v_note text;
  v_row public.stallion_pedigrees%ROWTYPE;
  v_new_gen integer;
  v_new_progeny uuid;
  v_child_pedigree uuid;
  v_parent_type public.pedigree_type;
  v_new_id uuid;
  v_inserted integer := 0;
  v_map jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated.');
  END IF;

  IF p_stallion_id IS NULL OR NOT public.can_edit_stallion(p_stallion_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot edit this horse.');
  END IF;

  SELECT * INTO v_anchor
  FROM public.stallion_pedigrees
  WHERE id = p_anchor_link_id
    AND stallion_id = p_stallion_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedigree slot was not found.');
  END IF;

  IF p_source_anchor_id IS NOT NULL THEN
    SELECT sp.id INTO v_source_anchor
    FROM public.stallion_pedigrees sp
    WHERE sp.id = p_source_anchor_id
      AND sp.pedigree_id = v_anchor.pedigree_id
      AND sp.stallion_id IS DISTINCT FROM p_stallion_id;

    IF v_source_anchor IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That source pedigree is not available.');
    END IF;
  ELSE
    v_source_anchor := public._best_pedigree_prefill_anchor(
      v_anchor.pedigree_id,
      p_stallion_id
    );
  END IF;

  IF v_source_anchor IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'inserted', 0);
  END IF;

  SELECT sp.stallion_id, sp.generation
  INTO v_source_stallion, v_src_anchor_gen
  FROM public.stallion_pedigrees sp
  WHERE sp.id = v_source_anchor;

  SELECT s.stallion_name INTO v_source_name
  FROM public.stallions s
  WHERE s.id = v_source_stallion;

  v_note := 'Prefill from '
    || COALESCE(NULLIF(btrim(v_source_name), ''), 'unknown stallion')
    || ' ('
    || v_source_stallion::text
    || ')';

  v_map := jsonb_build_object(v_source_anchor::text, v_anchor.id::text);

  FOR v_row IN
    SELECT sp.*
    FROM public.stallion_pedigrees sp
    WHERE sp.id IN (SELECT a.id FROM public._pedigree_ancestor_rows(v_source_anchor) a)
    ORDER BY sp.generation ASC, sp.created_at ASC
  LOOP
    v_new_gen := v_anchor.generation + (v_row.generation - v_src_anchor_gen);
    IF v_new_gen > 8 OR v_new_gen > v_anchor.generation + 3 OR v_new_gen < 2 THEN
      CONTINUE;
    END IF;

    v_new_progeny := NULLIF(v_map ->> v_row.progeny_id::text, '')::uuid;
    IF v_new_progeny IS NULL THEN
      CONTINUE;
    END IF;

    SELECT pedigree_id INTO v_child_pedigree
    FROM public.stallion_pedigrees
    WHERE id = v_new_progeny;

    IF v_child_pedigree IS NOT DISTINCT FROM v_row.pedigree_id THEN
      CONTINUE;
    END IF;

    SELECT p.type INTO v_parent_type
    FROM public.pedigrees p
    WHERE p.id = v_row.pedigree_id;

    IF v_parent_type IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.stallion_pedigrees sp
      JOIN public.pedigrees p ON p.id = sp.pedigree_id
      WHERE sp.stallion_id = p_stallion_id
        AND sp.progeny_id = v_new_progeny
        AND sp.generation = v_new_gen
        AND p.type = v_parent_type
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.stallion_pedigrees (
      stallion_id,
      pedigree_id,
      generation,
      progeny_id,
      needs_review,
      admin_notes
    )
    VALUES (
      p_stallion_id,
      v_row.pedigree_id,
      v_new_gen,
      v_new_progeny,
      true,
      v_note
    )
    RETURNING id INTO v_new_id;

    v_map := v_map || jsonb_build_object(v_row.id::text, v_new_id::text);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted);
END;
$$;

REVOKE ALL ON FUNCTION public._pedigree_ancestor_rows(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._best_pedigree_prefill_anchor(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._pedigree_prefill_source_json(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.pedigree_prefill_preview(uuid, uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prefill_stallion_pedigree_ancestors(uuid, uuid, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pedigree_prefill_preview(uuid, uuid, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prefill_stallion_pedigree_ancestors(uuid, uuid, uuid)
  TO authenticated, service_role;
