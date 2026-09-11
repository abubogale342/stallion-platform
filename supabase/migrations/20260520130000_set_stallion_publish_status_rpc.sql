-- =============================================================================
-- set_stallion_publish_status(stallion_id, publish_status)
-- Publish / unpublish from admin list (validates DB publish constraints).
-- =============================================================================

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

COMMENT ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type) IS
  'Admin: set stallion publish_status to draft or published (validates publish requirements).';

REVOKE ALL ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  TO service_role;
