-- Multiple registry registrations per pedigree horse record.

CREATE TABLE IF NOT EXISTS public.pedigree_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedigree_id uuid NOT NULL,
  association_name text NOT NULL,
  country text NULL,
  registration_number text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedigree_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT pedigree_registrations_pedigree_id_fkey
    FOREIGN KEY (pedigree_id) REFERENCES public.pedigrees (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS pedigree_registrations_one_primary_per_pedigree
  ON public.pedigree_registrations (pedigree_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_pedigree_registrations_pedigree_id
  ON public.pedigree_registrations USING btree (pedigree_id);

CREATE INDEX IF NOT EXISTS idx_pedigree_registrations_association_name
  ON public.pedigree_registrations USING btree (association_name);

DROP TRIGGER IF EXISTS set_updated_at ON public.pedigree_registrations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pedigree_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from legacy single registration columns on pedigrees.
INSERT INTO public.pedigree_registrations (
  pedigree_id,
  association_name,
  country,
  registration_number,
  is_primary,
  sort_order
)
SELECT
  p.id,
  COALESCE(NULLIF(btrim(p.association_name), ''), '—'),
  NULL,
  NULLIF(btrim(p.registration_number), ''),
  true,
  0
FROM public.pedigrees p
WHERE (
  NULLIF(btrim(p.association_name), '') IS NOT NULL
  OR NULLIF(btrim(p.registration_number), '') IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1
  FROM public.pedigree_registrations pr
  WHERE pr.pedigree_id = p.id
);

ALTER TABLE public.pedigree_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedigree_registrations_public_read ON public.pedigree_registrations;
CREATE POLICY pedigree_registrations_public_read
  ON public.pedigree_registrations
  FOR SELECT
  USING (public.is_pedigree_publicly_accessible(pedigree_id));

DROP POLICY IF EXISTS pedigree_registrations_authenticated_all ON public.pedigree_registrations;
CREATE POLICY pedigree_registrations_authenticated_all
  ON public.pedigree_registrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.pedigree_registrations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pedigree_registrations
  TO authenticated, service_role;

-- Replace registrations for one pedigree; sync legacy pedigrees columns from primary row.
CREATE OR REPLACE FUNCTION public._sync_pedigree_registrations_from_json(
  p_pedigree_id uuid,
  p_registrations jsonb,
  p_legacy_association text DEFAULT NULL,
  p_legacy_registration text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elem jsonb;
  v_ord integer := 0;
  v_assoc text;
  v_country text;
  v_reg_num text;
  v_is_primary boolean;
  v_has_primary boolean := false;
  v_primary_assoc text;
  v_primary_reg text;
  v_rows jsonb := COALESCE(p_registrations, '[]'::jsonb);
BEGIN
  IF jsonb_typeof(v_rows) <> 'array' THEN
    v_rows := '[]'::jsonb;
  END IF;

  IF jsonb_array_length(v_rows) = 0 THEN
    IF NULLIF(btrim(p_legacy_association), '') IS NOT NULL
      OR NULLIF(btrim(p_legacy_registration), '') IS NOT NULL
    THEN
      v_rows := jsonb_build_array(
        jsonb_build_object(
          'association_name', NULLIF(btrim(p_legacy_association), ''),
          'country', NULL,
          'registration_number', NULLIF(btrim(p_legacy_registration), ''),
          'is_primary', true
        )
      );
    END IF;
  END IF;

  DELETE FROM public.pedigree_registrations
  WHERE pedigree_id = p_pedigree_id;

  IF jsonb_array_length(v_rows) = 0 THEN
    UPDATE public.pedigrees
    SET
      association_name = NULL,
      registration_number = NULL,
      updated_at = now()
    WHERE id = p_pedigree_id;
    RETURN;
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    v_assoc := NULLIF(btrim(public._form_text(v_elem, 'association_name')), '');
    v_country := NULLIF(upper(btrim(public._form_text(v_elem, 'country'))), '');
    v_reg_num := NULLIF(btrim(public._form_text(v_elem, 'registration_number')), '');

    IF v_assoc IS NULL AND v_reg_num IS NULL AND v_country IS NULL THEN
      CONTINUE;
    END IF;

    v_is_primary := COALESCE((v_elem ->> 'is_primary')::boolean, false);

    IF v_assoc IS NULL THEN
      v_assoc := '—';
    END IF;

    IF v_is_primary AND v_has_primary THEN
      v_is_primary := false;
    END IF;

    INSERT INTO public.pedigree_registrations (
      pedigree_id,
      association_name,
      country,
      registration_number,
      is_primary,
      sort_order
    )
    VALUES (
      p_pedigree_id,
      v_assoc,
      v_country,
      v_reg_num,
      v_is_primary,
      v_ord
    );

    IF v_is_primary THEN
      v_has_primary := true;
      v_primary_assoc := v_assoc;
      v_primary_reg := v_reg_num;
    END IF;

    v_ord := v_ord + 1;
  END LOOP;

  IF NOT v_has_primary THEN
    UPDATE public.pedigree_registrations
    SET is_primary = true
    WHERE pedigree_id = p_pedigree_id
      AND sort_order = (
        SELECT MIN(pr.sort_order)
        FROM public.pedigree_registrations pr
        WHERE pr.pedigree_id = p_pedigree_id
      );

    SELECT pr.association_name, pr.registration_number
    INTO v_primary_assoc, v_primary_reg
    FROM public.pedigree_registrations pr
    WHERE pr.pedigree_id = p_pedigree_id
      AND pr.is_primary = true
    LIMIT 1;
  END IF;

  IF v_primary_assoc IS NULL AND v_primary_reg IS NULL THEN
    SELECT pr.association_name, pr.registration_number
    INTO v_primary_assoc, v_primary_reg
    FROM public.pedigree_registrations pr
    WHERE pr.pedigree_id = p_pedigree_id
    ORDER BY pr.sort_order NULLS LAST, pr.created_at
    LIMIT 1;
  END IF;

  UPDATE public.pedigrees
  SET
    association_name = NULLIF(btrim(v_primary_assoc), ''),
    registration_number = NULLIF(btrim(v_primary_reg), ''),
    updated_at = now()
  WHERE id = p_pedigree_id;
END;
$$;

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
    registration_number text,
    registrations jsonb NOT NULL DEFAULT '[]'::jsonb
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
          registration_number,
          registrations
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
          public._form_text(v_elem, 'registration_number'),
          CASE
            WHEN jsonb_typeof(v_elem -> 'registrations') = 'array'
              THEN v_elem -> 'registrations'
            ELSE '[]'::jsonb
          END
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
            NULL,
            NULL
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

      PERFORM public._sync_pedigree_registrations_from_json(
        v_pid,
        rec.registrations,
        rec.association_name,
        rec.registration_number
      );

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
