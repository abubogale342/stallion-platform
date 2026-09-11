-- =============================================================================
-- Backfill stallion_genetic_tests and stallion_colour_tests from the legacy
-- text columns on public.stallions:
--   * stallions.genetic_testing_results            -> stallion_genetic_tests
--   * stallions.genetic_disease_testing_results    -> stallion_genetic_tests
--   * stallions.colour_testing_results             -> stallion_colour_tests
--
-- Idempotent: never inserts a duplicate (stallion_id, test_type) /
-- (stallion_id, colour_test) pair, so the migration can be re-run safely.
--
-- Source column data is unstructured comma-separated text. Each comma-separated
-- token may be either "KEY - VALUE" / "KEY: VALUE" (e.g. "HERDA - N/N") or a
-- bare label (e.g. "HERDA"). When no separator is present, the token is used
-- as the test/colour name and `result` is stored as an empty string (NOT NULL
-- still satisfied). Rows are tagged with source = 'migrated_from_stallions'.
-- =============================================================================

DO $$
DECLARE
  st RECORD;
  raw_genetic text;
  token text;
  parts text[];
  num_parts int;
  test_key text;
  test_val text;
BEGIN
  FOR st IN
    SELECT
      id,
      genetic_testing_results,
      genetic_disease_testing_results,
      colour_testing_results
    FROM public.stallions
  LOOP
    -- ----------------------------------------------------------------------
    -- Genetic + disease testing (rendered together by the UI, deduped by key).
    -- ----------------------------------------------------------------------
    raw_genetic :=
      COALESCE(st.genetic_testing_results, '') || ',' ||
      COALESCE(st.genetic_disease_testing_results, '');

    FOR token IN
      SELECT trim(t)
      FROM regexp_split_to_table(raw_genetic, ',') AS t
    LOOP
      CONTINUE WHEN token = '';

      parts := regexp_split_to_array(token, '\s*[-:]\s*');
      num_parts := COALESCE(array_length(parts, 1), 0);

      IF num_parts >= 2 THEN
        test_key := upper(trim(parts[1]));
        test_val := trim(
          array_to_string(parts[2:num_parts], ' - ')
        );
      ELSE
        test_key := upper(token);
        test_val := '';
      END IF;

      CONTINUE WHEN test_key = '';

      IF NOT EXISTS (
        SELECT 1
        FROM public.stallion_genetic_tests g
        WHERE g.stallion_id = st.id
          AND upper(g.test_type) = test_key
      ) THEN
        INSERT INTO public.stallion_genetic_tests
          (stallion_id, test_type, result, source)
        VALUES
          (st.id, test_key, test_val, 'migrated_from_stallions');
      END IF;
    END LOOP;

    -- ----------------------------------------------------------------------
    -- Colour testing.
    -- ----------------------------------------------------------------------
    FOR token IN
      SELECT trim(t)
      FROM regexp_split_to_table(
        COALESCE(st.colour_testing_results, ''),
        ','
      ) AS t
    LOOP
      CONTINUE WHEN token = '';

      parts := regexp_split_to_array(token, '\s*[-:]\s*');
      num_parts := COALESCE(array_length(parts, 1), 0);

      IF num_parts >= 2 THEN
        test_key := trim(parts[1]);
        test_val := trim(
          array_to_string(parts[2:num_parts], ' - ')
        );
      ELSE
        test_key := token;
        test_val := '';
      END IF;

      CONTINUE WHEN test_key = '';

      IF NOT EXISTS (
        SELECT 1
        FROM public.stallion_colour_tests c
        WHERE c.stallion_id = st.id
          AND lower(c.colour_test) = lower(test_key)
      ) THEN
        INSERT INTO public.stallion_colour_tests
          (stallion_id, colour_test, result, source)
        VALUES
          (st.id, test_key, test_val, 'migrated_from_stallions');
      END IF;
    END LOOP;
  END LOOP;
END $$;
