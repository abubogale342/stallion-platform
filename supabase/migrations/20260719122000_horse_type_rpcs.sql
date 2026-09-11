-- Milestone 14: make the form RPCs horse_type-aware.
-- 1) create_stallion_from_form accepts horse_type in the payload (default 'stallion');
--    body otherwise copied verbatim from 20260610120000_pedigree_schema_restructure.sql.
-- 2) set_stallion_publish_status skips the stallion-only availability checks for mares;
--    body otherwise copied verbatim from 20260520130000_set_stallion_publish_status_rpc.sql.
-- update_stallion_from_form is unchanged (ET details are saved via direct child-table
-- writes under RLS, like stallion_images).

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
  v_gen integer;
  v_achievement text;
  v_owner_id uuid;
  v_sort integer;
  v_has_racing_summary boolean;
  v_lenient boolean;
  v_horse_type public.horse_type := 'stallion';
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

  v_lenient := lower(trim(coalesce(p_payload ->> 'save_mode', ''))) = 'draft';

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

  BEGIN
    IF btrim(coalesce(p_payload ->> 'horse_type', '')) <> '' THEN
      v_horse_type := (p_payload ->> 'horse_type')::public.horse_type;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_horse_type := 'stallion';
  END;

  INSERT INTO public.stallions (
    id,
    stallion_name,
    publish_status,
    horse_type,
    stallion_status,
    breed,
    country_of_residence,
    date_of_birth,
    coat_colour,
    height,
    summary,
    registration_number,
    registry,
    official_registry_link,
    performance_summary,
    total_reported_earnings,
    total_reported_earnings_currency,
    total_registered_progeny,
    performance_earners,
    progeny_started_in_competition,
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
    v_horse_type,
    public._form_text(p_payload, 'stallion_status'),
    v_breed,
    public._form_text(p_payload, 'country_of_residence'),
    public._parse_year_as_date(p_payload ->> 'date_of_birth'),
    public._form_text(p_payload, 'coat_colour'),
    public._form_text(p_payload, 'height'),
    public._form_text(p_payload, 'summary'),
    public._form_text(p_payload, 'registration_number'),
    public._form_text(p_payload, 'registry'),
    public._form_text(p_payload, 'official_registry_link'),
    public._form_text(p_payload, 'performance_summary'),
    public._form_numeric(p_payload, 'total_reported_earnings'),
    public._form_text(p_payload, 'total_reported_earnings_currency'),
    public._form_int(p_payload, 'total_registered_progeny'),
    public._form_int(p_payload, 'performance_earners'),
    public._form_int(p_payload, 'progeny_started_in_competition'),
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
        IF v_lenient THEN
          CONTINUE;
        END IF;
        RETURN public._form_error(
          'VALIDATION_ERROR',
          'Unknown discipline family id: ' || v_pid::text,
          'family_ids',
          jsonb_build_object('family_id', v_pid::text)
        );
      END IF;
      BEGIN
        INSERT INTO public.stallion_disciplines (stallion_id, family_id)
        VALUES (v_stallion_id, v_pid);
      EXCEPTION
        WHEN OTHERS THEN
          IF NOT v_lenient THEN
            RAISE;
          END IF;
      END;
      v_ord := v_ord + 1;
    END LOOP;
  END IF;



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

CREATE OR REPLACE FUNCTION public.set_stallion_publish_status(
  p_stallion_id uuid,
  p_publish_status public.publish_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.stallions%ROWTYPE;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN public._form_error(
      'NOT_AUTHENTICATED',
      'You must be signed in to change publish status.'
    );
  END IF;

  IF p_stallion_id IS NULL THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Stallion id is required.',
      'id'
    );
  END IF;

  IF p_publish_status IS NULL THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Publish status is required.',
      'publish_status'
    );
  END IF;

  SELECT * INTO s FROM public.stallions WHERE id = p_stallion_id;

  IF NOT FOUND THEN
    RETURN public._form_error(
      'NOT_FOUND',
      'Stallion not found.',
      'id',
      jsonb_build_object('stallion_id', p_stallion_id::text)
    );
  END IF;

  IF s.publish_status = p_publish_status THEN
    RETURN public._form_ok(
      p_stallion_id,
      jsonb_build_object(
        'publish_status',
        p_publish_status::text,
        'unchanged',
        true
      )
    );
  END IF;

  IF p_publish_status = 'published'::public.publish_status_type THEN
    IF NULLIF(btrim(s.stallion_name), '') IS NULL THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('field', 'stallion_name', 'message', 'Registered name is required to publish')
      );
    END IF;

    IF s.breed IS NULL THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object('field', 'breed', 'message', 'Breed is required to publish')
      );
    END IF;

    IF NULLIF(btrim(s.registration_number), '') IS NULL THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'field',
          'registration_number',
          'message',
          'Registration number is required to publish'
        )
      );
    END IF;

    -- Availability requirements apply to stallions only; donor mares publish
    -- with name + breed + registration number (see stallions_published_required_fields_chk).
    IF s.horse_type = 'stallion'::public.horse_type THEN
      IF s.semen_availability IS NULL
        OR cardinality(s.semen_availability) = 0 THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'field',
            'semen_availability',
            'message',
            'Select at least one semen availability method to publish'
          )
        );
      END IF;

      IF s.live_cover_available IS NULL THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'field',
            'live_cover_available',
            'message',
            'Live cover availability is required to publish'
          )
        );
      END IF;

      IF s.country_availability IS NULL
        OR cardinality(s.country_availability) = 0 THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'field',
            'country_availability',
            'message',
            'Select at least one country availability to publish'
          )
        );
      END IF;
    END IF;

    IF jsonb_array_length(v_errors) > 0 THEN
      RETURN jsonb_build_object(
        'ok',
        false,
        'code',
        'VALIDATION_ERROR',
        'error',
        'Cannot publish until required fields are complete. Edit the stallion to fix them.',
        'details',
        jsonb_build_object('fields', v_errors)
      );
    END IF;
  END IF;

  UPDATE public.stallions
  SET
    publish_status = p_publish_status,
    updated_at = now()
  WHERE id = p_stallion_id;

  RETURN public._form_ok(
    p_stallion_id,
    jsonb_build_object('publish_status', p_publish_status::text)
  );

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

-- Re-state execution grants (repo convention; grants also survive CREATE OR REPLACE).
REVOKE ALL ON FUNCTION public.create_stallion_from_form(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stallion_from_form(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stallion_from_form(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  TO service_role;
