-- Admin: update stud_fees jsonb without direct table UPDATE (RLS is SELECT-only on stallions).

CREATE OR REPLACE FUNCTION public.update_stallion_stud_fees(
  p_stallion_id uuid,
  p_stud_fees jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN public._form_error(
      'NOT_AUTHENTICATED',
      'You must be signed in to update stud fees.'
    );
  END IF;

  IF p_stallion_id IS NULL THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Stallion id is required.',
      'id'
    );
  END IF;

  IF p_stud_fees IS NULL OR jsonb_typeof(p_stud_fees) <> 'array' THEN
    RETURN public._form_error(
      'VALIDATION_ERROR',
      'Stud fees must be a JSON array.',
      'stud_fees'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stallions WHERE id = p_stallion_id) THEN
    RETURN public._form_error(
      'NOT_FOUND',
      'Stallion not found.',
      'id',
      jsonb_build_object('stallion_id', p_stallion_id::text)
    );
  END IF;

  UPDATE public.stallions
  SET
    stud_fees = p_stud_fees,
    updated_at = now()
  WHERE id = p_stallion_id;

  RETURN public._form_ok(
    p_stallion_id,
    jsonb_build_object('stud_fees', p_stud_fees)
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

COMMENT ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) IS
  'Admin: replace stallions.stud_fees for a stallion (authenticated users only).';

REVOKE ALL ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) TO service_role;
