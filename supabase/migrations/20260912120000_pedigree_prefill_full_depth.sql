-- Pedigree prefill: copy the whole known chain, not three generations of it.
--
-- Prefill stopped three generations past the anchor. Anchoring on a sire or dam
-- slot (generation 1) therefore filled generations 2, 3 and 4 and dropped
-- everything deeper, even when the source horse had it recorded — which is what
-- an admin sees as "the tree only prefills to the 4th generation".
--
-- The window was never the real limit. `_pedigree_ancestor_rows` already walks
-- the source chain to its full depth, and the admin tree itself goes to
-- generation 8 (ADMIN_PEDIGREE_MAX_GENERATION in src/utils/pedigree.ts). Only
-- these two callers clipped it, so both now run to that same ceiling of 8 and
-- copy as far as the source data goes.
--
-- Both functions are otherwise byte-for-byte what 20260817100000 defined.
-- CREATE OR REPLACE keeps the existing grants, so no REVOKE/GRANT block here.
--
-- Safe to rerun.

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
  v_to := 8;

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
      BETWEEN v_from AND 8
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
    IF v_new_gen > 8 OR v_new_gen < 2 THEN
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
