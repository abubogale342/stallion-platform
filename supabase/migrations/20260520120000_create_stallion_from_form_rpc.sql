-- =============================================================================
-- create_stallion_from_form(payload jsonb)
--
-- Creates a new stallion (always publish_status = draft) and related rows from
-- the admin multi-step form payload. Accepts a client-provided UUID `id` when
-- not already in use; otherwise generates one.
--
-- Field placement (matches public profile / api.ts):
--   * Discipline coverage     → stallion_disciplines (family_id)
--   * Pedigree                → pedigrees + stallion_pedigrees
--   * Performance summary     → stallions.performance_summary
--   * Performance rows        → stallion_performance_records
--   * Racing summary          → stallion_racing_summary
--   * Racing rows             → stallion_racing_results
--   * Progeny stats           → stallions.total_registered_progeny,
--                               performance_earners,
--                               total_reported_offspring_earnings(_currency)
--   * Notable progeny         → stallion_progeny
--   * Foal crops              → stallion_foal_crops
--   * Breeding providers      → stallion_breeding_service_providers
--   * Health text summaries   → stallions.genetic_* / colour_* / genetic_test_results_summary
--   * Genetic / colour rows   → stallion_genetic_tests / stallion_colour_tests
--   * Owners                  → owners (insert if needed) + stallion_owners
-- =============================================================================

-- ---------------------------------------------------------------------------
-- JSON helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._form_text(j jsonb, key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(btrim(j ->> key), '');
$$;

CREATE OR REPLACE FUNCTION public._form_int(j jsonb, key text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  n integer;
BEGIN
  v := public._form_text(j, key);
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  n := v::integer;
  RETURN n;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._form_numeric(j jsonb, key text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  n numeric;
BEGIN
  v := public._form_text(j, key);
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  n := v::numeric;
  RETURN n;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._form_uuid(j jsonb, key text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := public._form_text(j, key);
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._form_error(
  p_code text,
  p_error text,
  p_field text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'ok', false,
      'code', p_code,
      'error', p_error,
      'field', p_field,
      'details', p_details
    )
  );
$$;

CREATE OR REPLACE FUNCTION public._form_ok(p_stallion_id uuid, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'stallion_id', p_stallion_id::text,
    'publish_status', 'draft'
  ) || COALESCE(p_extra, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION public._parse_year_as_date(p_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  y integer;
BEGIN
  v := NULLIF(btrim(p_value), '');
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  IF v ~ '^\d{4}$' THEN
    y := v::integer;
    RETURN make_date(y, 1, 1);
  END IF;
  RETURN v::date;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._parse_semen_availability_array(j jsonb)
RETURNS public.semen_availability_option_type[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  elem jsonb;
  v text;
  out public.semen_availability_option_type[] := '{}';
BEGIN
  IF j IS NULL OR jsonb_typeof(j) <> 'array' THEN
    RETURN out;
  END IF;
  FOR elem IN SELECT value FROM jsonb_array_elements(j) LOOP
    v := NULLIF(btrim(elem #>> '{}'), '');
    IF v IS NULL THEN
      CONTINUE;
    END IF;
    BEGIN
      out := out || v::public.semen_availability_option_type;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid semen availability value: %', v
          USING ERRCODE = '22P02';
    END;
  END LOOP;
  RETURN out;
END;
$$;

-- ---------------------------------------------------------------------------
-- Main RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_stallion_from_form(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stallion_id uuid;
  v_name text;
  v_breed public.breed_type;
  v_elem jsonb;
  v_ord integer;
  v_pid uuid;
  v_parent_pid uuid;
  v_progeny_ref text;
  v_gen integer;
  v_max_gen integer;
  v_achievement text;
  v_owner_id uuid;
  v_sort integer;
  v_has_racing_summary boolean;
  rec record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN public._form_error(
      'NOT_AUTHENTICATED',
      'You must be signed in to create a stallion.'
    );
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      'payload'
    );
  END IF;

  v_name := public._form_text(p_payload, 'stallion_name');
  IF v_name IS NULL THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Registered name (stallion_name) is required.',
      'stallion_name'
    );
  END IF;

  v_stallion_id := public._form_uuid(p_payload, 'id');
  IF v_stallion_id IS NULL THEN
    v_stallion_id := gen_random_uuid();
  ELSIF EXISTS (SELECT 1 FROM public.stallions s WHERE s.id = v_stallion_id) THEN
    RETURN public._form_error(
      'STALLION_EXISTS',
      'A stallion with this id already exists.',
      'id',
      jsonb_build_object('stallion_id', v_stallion_id::text)
    );
  END IF;

  BEGIN
    v_breed := public._form_text(p_payload, 'breed')::public.breed_type;
  EXCEPTION
    WHEN OTHERS THEN
      v_breed := NULL;
  END;

  INSERT INTO public.stallions (
    id,
    stallion_name,
    publish_status,
    stallion_status,
    breed,
    country_of_residence,
    date_of_birth,
    coat_colour,
    height,
    summary,
    registration_number,
    performance_summary,
    total_registered_progeny,
    performance_earners,
    total_reported_offspring_earnings,
    total_reported_offspring_earnings_currency,
    semen_availability,
    live_cover_available,
    country_availability,
    stud_fees,
    breeding_guarantees,
    breeding_manager,
    breeding_manager_organization,
    breeding_manager_email,
    breeding_manager_phone,
    breeding_notes,
    genetic_disease_testing_results,
    genetic_testing_results,
    colour_testing_results,
    genetic_test_results_summary,
    video_url
  )
  VALUES (
    v_stallion_id,
    v_name,
    'draft'::public.publish_status_type,
    public._form_text(p_payload, 'stallion_status'),
    v_breed,
    public._form_text(p_payload, 'country_of_residence'),
    public._parse_year_as_date(p_payload ->> 'date_of_birth'),
    public._form_text(p_payload, 'coat_colour'),
    public._form_text(p_payload, 'height'),
    public._form_text(p_payload, 'summary'),
    public._form_text(p_payload, 'registration_number'),
    public._form_text(p_payload, 'performance_summary'),
    public._form_int(p_payload, 'total_registered_progeny'),
    public._form_int(p_payload, 'performance_earners'),
    public._form_numeric(p_payload, 'total_reported_offspring_earnings'),
    public._form_text(p_payload, 'total_reported_offspring_earnings_currency'),
    public._parse_semen_availability_array(p_payload -> 'semen_availability'),
    COALESCE((p_payload ->> 'live_cover_available')::boolean, false),
    COALESCE(
      (
        SELECT ARRAY_AGG(DISTINCT NULLIF(btrim(x), ''))
        FROM jsonb_array_elements_text(
          COALESCE(p_payload -> 'country_availability', '[]'::jsonb)
        ) AS t(x)
        WHERE NULLIF(btrim(x), '') IS NOT NULL
      ),
      '{}'::text[]
    ),
    COALESCE(p_payload -> 'stud_fees', '[]'::jsonb),
    public._form_text(p_payload, 'breeding_guarantees'),
    public._form_text(p_payload, 'breeding_manager'),
    public._form_text(p_payload, 'breeding_manager_organization'),
    public._form_text(p_payload, 'breeding_manager_email'),
    public._form_text(p_payload, 'breeding_manager_phone'),
    public._form_text(p_payload, 'breeding_notes'),
    public._form_text(p_payload, 'genetic_disease_testing_results'),
    public._form_text(p_payload, 'genetic_testing_results'),
    public._form_text(p_payload, 'colour_testing_results'),
    public._form_text(p_payload, 'genetic_test_results_summary'),
    public._form_text(p_payload, 'video_url')
  );

  -- Discipline coverage → stallion_disciplines
  IF jsonb_typeof(p_payload -> 'family_ids') = 'array' THEN
    v_ord := 0;
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'family_ids')
    LOOP
      v_pid := NULL;
      BEGIN
        v_pid := NULLIF(btrim(v_elem #>> '{}'), '')::uuid;
      EXCEPTION
        WHEN OTHERS THEN
          v_pid := NULL;
      END;
      IF v_pid IS NULL THEN
        CONTINUE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.discipline_families df WHERE df.id = v_pid
      ) THEN
        RETURN public._form_error(
          'VALIDATION_ERROR',
          'Unknown discipline family id: ' || v_pid::text,
          'family_ids',
          jsonb_build_object('family_id', v_pid::text)
        );
      END IF;
      INSERT INTO public.stallion_disciplines (stallion_id, family_id)
      VALUES (v_stallion_id, v_pid);
      v_ord := v_ord + 1;
    END LOOP;
  END IF;

  -- Pedigree: temp work table
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
      v_gen := COALESCE(public._form_int(v_elem, 'generation'), 2);
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
          RETURN public._form_error(
            'VALIDATION_ERROR',
            'Invalid pedigree row at index ' || (v_ord - 1)::text || ': ' || SQLERRM,
            'pedigree_rows'
          );
      END;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(generation), 2) INTO v_max_gen FROM _pedigree_work;

  FOR v_gen IN 2..v_max_gen LOOP
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
      END IF;

      UPDATE _pedigree_work SET pedigree_id = v_pid WHERE ord = rec.ord;
    END LOOP;
  END LOOP;

  -- Link progeny_id for generation >= 3
  FOR rec IN
    SELECT * FROM _pedigree_work WHERE generation >= 3 ORDER BY ord
  LOOP
    v_progeny_ref := rec.progeny_ref;
    v_parent_pid := NULL;

    IF v_progeny_ref = 'g2:sire' THEN
      SELECT pedigree_id INTO v_parent_pid
      FROM _pedigree_work
      WHERE generation = 2 AND ped_type = 'sire'
      LIMIT 1;
    ELSIF v_progeny_ref = 'g2:dam' THEN
      SELECT pedigree_id INTO v_parent_pid
      FROM _pedigree_work
      WHERE generation = 2 AND ped_type = 'dam'
      LIMIT 1;
    ELSE
      SELECT pedigree_id INTO v_parent_pid
      FROM _pedigree_work
      WHERE temp_id = v_progeny_ref
      LIMIT 1;
    END IF;

    IF v_parent_pid IS NULL AND rec.pedigree_id IS NOT NULL THEN
      RETURN public._form_error(
        'VALIDATION_ERROR',
        'Pedigree row references a parent that is missing or has no pedigree id.',
        'pedigree_rows',
        jsonb_build_object(
          'temp_id', rec.temp_id,
          'progeny_ref', v_progeny_ref,
          'generation', rec.generation
        )
      );
    END IF;

    UPDATE _pedigree_work
    SET progeny_id = v_parent_pid
    WHERE ord = rec.ord;
  END LOOP;

  INSERT INTO public.stallion_pedigrees (
    stallion_id,
    pedigree_id,
    generation,
    progeny_id
  )
  SELECT
    v_stallion_id,
    w.pedigree_id,
    w.generation,
    CASE WHEN w.generation >= 3 THEN w.progeny_id ELSE NULL END
  FROM _pedigree_work w
  WHERE w.pedigree_id IS NOT NULL
    AND NULLIF(btrim(w.name), '') IS NOT NULL
  ON CONFLICT (stallion_id, pedigree_id, generation) DO NOTHING;

  -- Performance records
  IF jsonb_typeof(p_payload -> 'performance_records') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'performance_records')
    LOOP
      v_achievement := COALESCE(
        public._form_text(v_elem, 'result'),
        public._form_text(v_elem, 'achievement')
      );
      IF v_achievement IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_performance_records (
        stallion_id,
        achievement,
        year,
        month,
        discipline,
        class,
        level,
        association,
        event,
        score,
        earnings,
        currency
      )
      VALUES (
        v_stallion_id,
        v_achievement,
        public._form_int(v_elem, 'year'),
        public._form_text(v_elem, 'month'),
        public._form_text(v_elem, 'discipline'),
        COALESCE(
          public._form_text(v_elem, 'performance_class'),
          public._form_text(v_elem, 'class')
        ),
        public._form_text(v_elem, 'level'),
        public._form_text(v_elem, 'association'),
        public._form_text(v_elem, 'event'),
        public._form_numeric(v_elem, 'score'),
        public._form_numeric(v_elem, 'earnings'),
        public._form_text(v_elem, 'currency')
      );
    END LOOP;
  END IF;

  -- Racing summary (one row per stallion)
  IF p_payload ? 'racing_summary' AND jsonb_typeof(p_payload -> 'racing_summary') = 'object' THEN
    v_elem := p_payload -> 'racing_summary';
    v_has_racing_summary :=
      public._form_int(v_elem, 'career_starts') IS NOT NULL
      OR public._form_int(v_elem, 'career_firsts') IS NOT NULL
      OR public._form_int(v_elem, 'career_seconds') IS NOT NULL
      OR public._form_int(v_elem, 'career_thirds') IS NOT NULL
      OR public._form_numeric(v_elem, 'career_earnings') IS NOT NULL
      OR public._form_text(v_elem, 'highest_rating') IS NOT NULL
      OR public._form_text(v_elem, 'source') IS NOT NULL;

    IF v_has_racing_summary THEN
      INSERT INTO public.stallion_racing_summary (
        stallion_id,
        career_starts,
        career_firsts,
        career_seconds,
        career_thirds,
        career_earnings,
        highest_rating,
        source
      )
      VALUES (
        v_stallion_id,
        public._form_int(v_elem, 'career_starts'),
        public._form_int(v_elem, 'career_firsts'),
        public._form_int(v_elem, 'career_seconds'),
        public._form_int(v_elem, 'career_thirds'),
        public._form_numeric(v_elem, 'career_earnings'),
        public._form_numeric(v_elem, 'highest_rating'),
        public._form_text(v_elem, 'source')
      );
    END IF;
  END IF;

  -- Racing results
  IF jsonb_typeof(p_payload -> 'racing_records') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'racing_records')
    LOOP
      IF public._form_text(v_elem, 'race_name') IS NULL
        AND public._form_text(v_elem, 'track') IS NULL
        AND public._form_int(v_elem, 'year') IS NULL
        AND public._form_text(v_elem, 'distance') IS NULL
        AND public._form_int(v_elem, 'finish_position') IS NULL
        AND public._form_int(v_elem, 'speed_index') IS NULL
        AND public._form_numeric(v_elem, 'earnings') IS NULL
        AND public._form_text(v_elem, 'race_date') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_racing_results (
        stallion_id,
        race_name,
        race_date,
        year,
        track,
        distance,
        finish_position,
        speed_index,
        earnings,
        currency
      )
      VALUES (
        v_stallion_id,
        public._form_text(v_elem, 'race_name'),
        public._parse_year_as_date(public._form_text(v_elem, 'race_date')),
        public._form_int(v_elem, 'year'),
        public._form_text(v_elem, 'track'),
        public._form_text(v_elem, 'distance'),
        public._form_int(v_elem, 'finish_position'),
        public._form_int(v_elem, 'speed_index'),
        public._form_numeric(v_elem, 'earnings'),
        COALESCE(public._form_text(v_elem, 'currency'), 'USD')
      );
    END LOOP;
  END IF;

  -- Notable progeny
  IF jsonb_typeof(p_payload -> 'notable_progeny') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'notable_progeny')
    LOOP
      v_achievement := COALESCE(
        public._form_text(v_elem, 'result'),
        public._form_text(v_elem, 'achievement')
      );
      IF public._form_text(v_elem, 'name') IS NULL AND v_achievement IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_progeny (
        stallion_id,
        progeny_name,
        year,
        discipline,
        achievement,
        association,
        event,
        total_earnings
      )
      VALUES (
        v_stallion_id,
        COALESCE(public._form_text(v_elem, 'name'), 'Unknown'),
        public._form_int(v_elem, 'year'),
        public._form_text(v_elem, 'discipline'),
        v_achievement,
        public._form_text(v_elem, 'association'),
        public._form_text(v_elem, 'event'),
        public._form_numeric(v_elem, 'total_earnings')
      );
    END LOOP;
  END IF;

  -- Foal crops
  IF jsonb_typeof(p_payload -> 'foal_crops') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'foal_crops')
    LOOP
      v_gen := public._form_int(v_elem, 'foal_crop_year');
      IF v_gen IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_foal_crops (
        stallion_id,
        foal_crop_year,
        number_of_foals
      )
      VALUES (
        v_stallion_id,
        v_gen,
        public._form_int(v_elem, 'number_of_foals')
      )
      ON CONFLICT (stallion_id, foal_crop_year) DO UPDATE
      SET number_of_foals = EXCLUDED.number_of_foals;
    END LOOP;
  END IF;

  -- Breeding service providers
  IF jsonb_typeof(p_payload -> 'breeding_service_providers') = 'array' THEN
    v_ord := 0;
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'breeding_service_providers')
    LOOP
      IF public._form_text(v_elem, 'name') IS NULL
        AND public._form_text(v_elem, 'website') IS NULL
        AND public._form_text(v_elem, 'email') IS NULL
        AND public._form_text(v_elem, 'phone') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_breeding_service_providers (
        stallion_id,
        name,
        contact_name,
        website,
        country,
        email,
        phone,
        sort_order
      )
      VALUES (
        v_stallion_id,
        public._form_text(v_elem, 'name'),
        public._form_text(v_elem, 'contact_name'),
        public._form_text(v_elem, 'website'),
        public._form_text(v_elem, 'country'),
        public._form_text(v_elem, 'email'),
        public._form_text(v_elem, 'phone'),
        v_ord
      );
      v_ord := v_ord + 1;
    END LOOP;
  END IF;

  -- Genetic tests
  IF jsonb_typeof(p_payload -> 'genetic_tests') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'genetic_tests')
    LOOP
      IF public._form_text(v_elem, 'test_type') IS NULL
        OR public._form_text(v_elem, 'result') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_genetic_tests (
        stallion_id,
        test_type,
        gene_code,
        result,
        source,
        admin_notes
      )
      VALUES (
        v_stallion_id,
        public._form_text(v_elem, 'test_type'),
        public._form_text(v_elem, 'gene_code'),
        public._form_text(v_elem, 'result'),
        public._form_text(v_elem, 'source'),
        public._form_text(v_elem, 'admin_notes')
      );
    END LOOP;
  END IF;

  -- Colour tests
  IF jsonb_typeof(p_payload -> 'colour_tests') = 'array' THEN
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'colour_tests')
    LOOP
      IF public._form_text(v_elem, 'colour_test') IS NULL
        OR public._form_text(v_elem, 'result') IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.stallion_colour_tests (
        stallion_id,
        colour_test,
        gene_code,
        result,
        source,
        admin_notes
      )
      VALUES (
        v_stallion_id,
        public._form_text(v_elem, 'colour_test'),
        public._form_text(v_elem, 'gene_code'),
        public._form_text(v_elem, 'result'),
        public._form_text(v_elem, 'source'),
        public._form_text(v_elem, 'admin_notes')
      );
    END LOOP;
  END IF;

  -- Owners
  IF jsonb_typeof(p_payload -> 'owner_links') = 'array' THEN
    v_sort := 0;
    FOR v_elem IN
      SELECT value FROM jsonb_array_elements(p_payload -> 'owner_links')
    LOOP
      IF public._form_text(v_elem, 'owner_name') IS NULL THEN
        CONTINUE;
      END IF;

      v_owner_id := public._form_uuid(v_elem, 'owner_id');
      IF v_owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.owners o WHERE o.id = v_owner_id
      ) THEN
        UPDATE public.owners
        SET
          owner_name = public._form_text(v_elem, 'owner_name'),
          country = public._form_text(v_elem, 'country'),
          email = public._form_text(v_elem, 'email'),
          phone = public._form_text(v_elem, 'phone'),
          farm_ranch = public._form_text(v_elem, 'farm_ranch'),
          farm_ranch_website = public._form_text(v_elem, 'farm_ranch_website'),
          address_line_1 = public._form_text(v_elem, 'address_line_1'),
          address_line_2 = public._form_text(v_elem, 'address_line_2'),
          suburb = public._form_text(v_elem, 'suburb'),
          state_region = public._form_text(v_elem, 'state_region'),
          postal_code = public._form_text(v_elem, 'postal_code'),
          full_address = public._form_text(v_elem, 'full_address'),
          facebook = public._form_text(v_elem, 'facebook'),
          instagram = public._form_text(v_elem, 'instagram'),
          updated_at = now()
        WHERE id = v_owner_id;
      ELSE
        INSERT INTO public.owners (
          id,
          owner_name,
          country,
          email,
          phone,
          farm_ranch,
          farm_ranch_website,
          address_line_1,
          address_line_2,
          suburb,
          state_region,
          postal_code,
          full_address,
          facebook,
          instagram
        )
        VALUES (
          gen_random_uuid(),
          public._form_text(v_elem, 'owner_name'),
          public._form_text(v_elem, 'country'),
          public._form_text(v_elem, 'email'),
          public._form_text(v_elem, 'phone'),
          public._form_text(v_elem, 'farm_ranch'),
          public._form_text(v_elem, 'farm_ranch_website'),
          public._form_text(v_elem, 'address_line_1'),
          public._form_text(v_elem, 'address_line_2'),
          public._form_text(v_elem, 'suburb'),
          public._form_text(v_elem, 'state_region'),
          public._form_text(v_elem, 'postal_code'),
          public._form_text(v_elem, 'full_address'),
          public._form_text(v_elem, 'facebook'),
          public._form_text(v_elem, 'instagram')
        )
        RETURNING id INTO v_owner_id;
      END IF;

      INSERT INTO public.stallion_owners (
        stallion_id,
        owner_id,
        role,
        is_primary,
        sort_order,
        public_display_name_only
      )
      VALUES (
        v_stallion_id,
        v_owner_id,
        'Owner',
        (v_sort = 0),
        v_sort,
        COALESCE((v_elem ->> 'public_display_name_only')::boolean, false)
      )
      ON CONFLICT (stallion_id, owner_id) DO UPDATE
      SET
        is_primary = EXCLUDED.is_primary,
        sort_order = EXCLUDED.sort_order,
        public_display_name_only = EXCLUDED.public_display_name_only,
        updated_at = now();

      v_sort := v_sort + 1;
    END LOOP;
  END IF;

  RETURN public._form_ok(v_stallion_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN public._form_error(
      'DB_ERROR',
      SQLERRM,
      NULL,
      jsonb_build_object('sqlstate', SQLSTATE)
    );
END;
$$;

COMMENT ON FUNCTION public.create_stallion_from_form(jsonb) IS
  'Admin: create stallion + related rows from multi-step form JSON (always draft).';

REVOKE ALL ON FUNCTION public.create_stallion_from_form(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stallion_from_form(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stallion_from_form(jsonb) TO service_role;
