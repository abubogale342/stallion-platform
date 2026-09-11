-- Allow the same pedigree record in multiple tree positions (linebreeding).
-- Uniqueness is per tree slot (generation + parent + pedigree), not per pedigree_id alone.

ALTER TABLE public.stallion_pedigrees
  DROP CONSTRAINT IF EXISTS stallion_pedigrees_stallion_id_pedigree_id_generation_key;

ALTER TABLE public.stallion_pedigrees
  DROP CONSTRAINT IF EXISTS stallion_pedigree_stallion_id_pedigree_id_generation_key;

ALTER TABLE public.stallion_pedigrees
  ADD CONSTRAINT stallion_pedigrees_stallion_tree_position_key
  UNIQUE (stallion_id, generation, progeny_id, pedigree_id);

-- Keep _persist in sync with the new conflict target (CREATE OR REPLACE from lenient migration + ON CONFLICT fix).
CREATE OR REPLACE FUNCTION public._persist_stallion_pedigree_from_form(
  p_stallion_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elem jsonb;
  v_ord integer;
  v_pid uuid;
  v_parent_pid uuid;
  v_progeny_ref text;
  v_gen integer;
  v_max_gen integer;
  rec record;
  v_lenient boolean;
BEGIN
  v_lenient := lower(trim(coalesce(p_payload ->> 'save_mode', ''))) = 'draft';

  CREATE TEMP TABLE _pedigree_work (
    ord integer PRIMARY KEY,
    temp_id text NOT NULL,
    pedigree_id uuid,
    progeny_id uuid,
    name text,
    ped_type public.pedigree_type,
    generation integer NOT NULL,
    progeny_ref text,
    birth_year integer,
    association_name text,
    registration_number text
  ) ON COMMIT DROP;

  IF jsonb_typeof(p_payload -> 'pedigree_rows') = 'array' THEN
    v_ord := 0;
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'pedigree_rows')
    LOOP
      v_ord := v_ord + 1;
      v_gen := COALESCE(public._form_int(v_elem, 'generation'), 1);
      BEGIN
        INSERT INTO _pedigree_work (
          ord,
          temp_id,
          pedigree_id,
          name,
          ped_type,
          generation,
          progeny_ref,
          birth_year,
          association_name,
          registration_number
        )
        VALUES (
          v_ord,
          COALESCE(
            public._form_text(v_elem, 'tempId'),
            public._form_text(v_elem, 'temp_id'),
            'row-' || v_ord::text
          ),
          public._form_uuid(v_elem, 'pedigree_id'),
          public._form_text(v_elem, 'name'),
          COALESCE(
            public._form_text(v_elem, 'type'),
            'sire'
          )::public.pedigree_type,
          v_gen,
          COALESCE(public._form_text(v_elem, 'progeny_ref'), ''),
          public._form_int(v_elem, 'birth_year'),
          public._form_text(v_elem, 'association_name'),
          public._form_text(v_elem, 'registration_number')
        );
      EXCEPTION
        WHEN OTHERS THEN
          IF v_lenient THEN
            CONTINUE;
          END IF;
          RETURN public._form_error(
            'VALIDATION_ERROR',
            'Invalid pedigree row at index ' || (v_ord - 1)::text || ': ' || SQLERRM,
            'pedigree_rows'
          );
      END;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(generation), 1) INTO v_max_gen FROM _pedigree_work;

  FOR v_gen IN 1..v_max_gen LOOP
    FOR rec IN
      SELECT * FROM _pedigree_work WHERE generation = v_gen ORDER BY ord
    LOOP
      IF NULLIF(btrim(rec.name), '') IS NULL THEN
        CONTINUE;
      END IF;

      v_pid := rec.pedigree_id;
      IF v_pid IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.pedigrees p WHERE p.id = v_pid
      ) THEN
        UPDATE public.pedigrees
        SET
          name = rec.name,
          type = rec.ped_type,
          birth_year = rec.birth_year,
          association_name = rec.association_name,
          registration_number = rec.registration_number,
          updated_at = now()
        WHERE id = v_pid;
      ELSE
        BEGIN
          INSERT INTO public.pedigrees (
            name,
            type,
            birth_year,
            association_name,
            registration_number
          )
          VALUES (
            rec.name,
            rec.ped_type,
            rec.birth_year,
            rec.association_name,
            rec.registration_number
          )
          RETURNING id INTO v_pid;
        EXCEPTION
          WHEN OTHERS THEN
            IF v_lenient THEN
              CONTINUE;
            END IF;
            RAISE;
        END;
      END IF;

      UPDATE _pedigree_work SET pedigree_id = v_pid WHERE ord = rec.ord;
    END LOOP;
  END LOOP;

  FOR rec IN
    SELECT * FROM _pedigree_work WHERE generation >= 2 ORDER BY ord
  LOOP
    v_progeny_ref := NULLIF(btrim(rec.progeny_ref), '');
    v_parent_pid := NULL;

    IF v_progeny_ref IS NOT NULL THEN
      SELECT pedigree_id INTO v_parent_pid
      FROM _pedigree_work
      WHERE temp_id = v_progeny_ref
      LIMIT 1;
    END IF;

    IF v_parent_pid IS NULL AND rec.pedigree_id IS NOT NULL THEN
      IF v_lenient THEN
        UPDATE _pedigree_work
        SET progeny_id = NULL
        WHERE ord = rec.ord;
        CONTINUE;
      END IF;
      RETURN public._form_error(
        'VALIDATION_ERROR',
        'Pedigree row references a parent that is missing or has no pedigree id.',
        'pedigree_rows',
        jsonb_build_object(
          'temp_id', rec.temp_id,
          'progeny_ref', rec.progeny_ref,
          'generation', rec.generation
        )
      );
    END IF;

    UPDATE _pedigree_work
    SET progeny_id = v_parent_pid
    WHERE ord = rec.ord;
  END LOOP;

  FOR rec IN
    SELECT *
    FROM _pedigree_work w
    WHERE w.pedigree_id IS NOT NULL
      AND NULLIF(btrim(w.name), '') IS NOT NULL
  LOOP
    BEGIN
      INSERT INTO public.stallion_pedigrees (
        stallion_id,
        pedigree_id,
        generation,
        progeny_id
      )
      VALUES (
        p_stallion_id,
        rec.pedigree_id,
        rec.generation,
        CASE WHEN rec.generation >= 2 THEN rec.progeny_id ELSE NULL END
      )
      ON CONFLICT ON CONSTRAINT stallion_pedigrees_stallion_tree_position_key
      DO UPDATE SET
        pedigree_id = EXCLUDED.pedigree_id,
        updated_at = now();
    EXCEPTION
      WHEN OTHERS THEN
        IF NOT v_lenient THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  RETURN NULL;
END;
$$;
