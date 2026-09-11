-- Milestone 17: hold agent-populated profiles in draft until reviewed.
--
-- The brief states it twice: the Generate action leaves a profile needing
-- review, and "all agent-populated profiles remain in draft status until
-- manually approved for publishing". Until now the review flag was advisory
-- only — the admin listing showed a badge, and nothing stopped anyone
-- publishing straight past it.
--
-- The gate lives in this RPC rather than in the admin UI because this function
-- is the single path that sets publish_status, and it already owns every other
-- publish precondition (name, breed, registration number, availability). A
-- check added here covers the button, any future bulk action, and a direct
-- call alike, and it returns through the same per-field error shape the wizard
-- already renders in its validation toast.
--
-- Unpublishing is unaffected: the guard sits inside the branch that only runs
-- when the requested status is 'published'. Taking a profile down never needs
-- a review first.
--
-- Note this gates the *transition* into published. A profile that is already
-- live when the agent regenerates it stays live, carrying its badge, until
-- someone reviews it — the requirement is about what reaches publication, not
-- about pulling down what is already there.
--
-- Safe to rerun.

CREATE OR REPLACE FUNCTION public.set_stallion_publish_status(p_stallion_id uuid, p_publish_status publish_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT public.is_admin() THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'Only an owner or admin can publish or unpublish horses.'
    );
  END IF;

  IF p_stallion_id IS NULL THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Stallion id is required.',
      'id'
    );
  END IF;

  IF NOT public.can_edit_stallion(p_stallion_id) THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'You cannot change publish status for this horse.',
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

  SELECT * INTO s FROM public.stallions WHERE id = p_stallion_id FOR UPDATE;

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

    -- Availability requirements apply to stallions only; donor mares skip these.
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

    -- Milestone 17 review gate.
    --
    -- "All agent-populated profiles remain in draft status until manually
    -- approved for publishing." needs_review is set true whenever a generation
    -- run reaches a terminal state, and cleared only by Mark as reviewed, so it
    -- is exactly the flag that distinguishes "an agent wrote this and nobody has
    -- looked" from "a human has signed it off".
    --
    -- Deliberately not scoped to horse_type: the requirement is about agent
    -- output, which is not a stallion-only concern the way semen availability is.
    IF s.needs_review THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'field',
          'needs_review',
          'message',
          'Review the agent output on the Agent review step before publishing'
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
$function$

;
