-- pg-safeupdate (and similar guards) reject DELETE without a WHERE clause.
-- Identity/wizard saves call update_stallion_from_form, which flushes the
-- rewrite stash after child-table DELETE+reinsert. The previous flush used
-- an unfiltered DELETE FROM _audit_rewrite_stash.

CREATE OR REPLACE FUNCTION public.audit_flush_rewrite_deletes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_actor_email text;
  v_changes jsonb;
BEGIN
  BEGIN
    PERFORM 1 FROM _audit_rewrite_stash LIMIT 1;
  EXCEPTION
    WHEN undefined_table THEN
      RETURN;
  END;

  SELECT up.email INTO v_actor_email
  FROM public.user_profile up
  WHERE up.auth_id = auth.uid();

  FOR r IN SELECT * FROM _audit_rewrite_stash
  LOOP
    v_changes := jsonb_build_array(
      jsonb_build_object('field', '*', 'previous', r.payload, 'next', null)
    );
    INSERT INTO public.admin_audit_log (
      occurred_at,
      actor_id,
      actor_email,
      action,
      stallion_id,
      stallion_name,
      table_name,
      record_id,
      changes,
      summary
    )
    VALUES (
      now(),
      auth.uid(),
      v_actor_email,
      'deleted',
      r.stallion_id,
      r.stallion_name,
      r.tbl,
      r.record_id,
      v_changes,
      public.audit_build_summary(r.tbl, 'DELETE', r.payload, v_changes)
    );
  END LOOP;

  DELETE FROM _audit_rewrite_stash WHERE true;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_flush_rewrite_deletes() FROM PUBLIC;
