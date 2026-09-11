-- Audit only real inserts/edits; skip no-op wizard rewrites.
-- Human-readable summaries (e.g. "Added 4th generation sire "Name"").
-- Data entry may delete child records on any horse they can edit.

CREATE OR REPLACE FUNCTION public.audit_business_jsonb(p jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(p)
      WHERE key NOT IN ('id', 'created_at', 'updated_at', 'created_by')
    ),
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public._audit_ensure_rewrite_stash()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _audit_rewrite_stash (
    tbl text NOT NULL,
    payload jsonb NOT NULL,
    record_id uuid,
    stallion_id uuid,
    stallion_name text
  ) ON COMMIT DROP;
END;
$$;

ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS summary text;

CREATE OR REPLACE FUNCTION public.audit_ordinal(n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN n IS NULL THEN NULL
    WHEN n % 100 BETWEEN 11 AND 13 THEN n::text || 'th'
    WHEN n % 10 = 1 THEN n::text || 'st'
    WHEN n % 10 = 2 THEN n::text || 'nd'
    WHEN n % 10 = 3 THEN n::text || 'rd'
    ELSE n::text || 'th'
  END;
$$;

CREATE OR REPLACE FUNCTION public.audit_quoted(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NULLIF(btrim(COALESCE(p, '')), '') IS NULL THEN ''
    ELSE ' "' || btrim(p) || '"'
  END;
$$;

CREATE OR REPLACE FUNCTION public.audit_changed_field_labels(p_changes jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fields text[];
  v_n integer;
BEGIN
  SELECT COALESCE(array_agg(label ORDER BY ord), ARRAY[]::text[])
  INTO v_fields
  FROM (
    SELECT
      ordinality AS ord,
      CASE e->>'field'
        WHEN 'stallion_name' THEN 'name'
        WHEN 'country_of_residence' THEN 'country'
        WHEN 'date_of_birth' THEN 'year of birth'
        WHEN 'publish_status' THEN 'publish status'
        WHEN 'horse_type' THEN 'horse type'
        WHEN 'performance_summary' THEN 'performance summary'
        WHEN 'live_cover_available' THEN 'live cover'
        WHEN 'semen_availability' THEN 'semen availability'
        WHEN 'country_availability' THEN 'country availability'
        WHEN 'stud_fees' THEN 'stud fees'
        ELSE replace(COALESCE(e->>'field', ''), '_', ' ')
      END AS label
    FROM jsonb_array_elements(COALESCE(p_changes, '[]'::jsonb)) WITH ORDINALITY AS t(e, ordinality)
    WHERE e->>'field' IS DISTINCT FROM '*'
  ) labeled;

  v_n := COALESCE(cardinality(v_fields), 0);
  IF v_n = 0 THEN
    RETURN NULL;
  END IF;
  IF v_n > 4 THEN
    RETURN array_to_string(v_fields[1:4], ', ')
      || ' and '
      || (v_n - 4)::text
      || ' more';
  END IF;
  RETURN array_to_string(v_fields, ', ');
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_build_summary(
  p_table text,
  p_op text,
  p_row jsonb,
  p_changes jsonb
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_type text;
  v_gen integer;
  v_verb text;
  v_fields text;
  v_kind text;
  v_extra text;
BEGIN
  v_verb := CASE p_op
    WHEN 'INSERT' THEN CASE WHEN p_table = 'stallion_images' THEN 'Uploaded' ELSE 'Added' END
    WHEN 'UPDATE' THEN 'Edited'
    WHEN 'DELETE' THEN 'Removed'
    ELSE initcap(p_op)
  END;

  IF p_table = 'stallion_pedigrees' THEN
    v_gen := NULLIF(p_row ->> 'generation', '')::integer;
    SELECT p.name, p.type
    INTO v_name, v_type
    FROM public.pedigrees p
    WHERE p.id = NULLIF(p_row ->> 'pedigree_id', '')::uuid;
    v_type := COALESCE(NULLIF(btrim(COALESCE(v_type, '')), ''), 'pedigree');
    RETURN v_verb
      || ' '
      || COALESCE(public.audit_ordinal(v_gen), '?')
      || ' generation '
      || v_type
      || public.audit_quoted(v_name);
  END IF;

  IF p_table = 'pedigrees' THEN
    RETURN v_verb
      || ' ancestor'
      || public.audit_quoted(p_row ->> 'name')
      || CASE
           WHEN NULLIF(p_row ->> 'type', '') IS NULL THEN ''
           ELSE ' (' || (p_row ->> 'type') || ')'
         END;
  END IF;

  IF p_table = 'pedigree_registrations' THEN
    RETURN v_verb
      || ' registration '
      || COALESCE(NULLIF(p_row ->> 'association_name', ''), 'record')
      || public.audit_quoted(p_row ->> 'registration_number');
  END IF;

  IF p_table = 'stallions' THEN
    IF p_op = 'INSERT' THEN
      RETURN 'Created horse' || public.audit_quoted(p_row ->> 'stallion_name');
    END IF;
    IF p_op = 'DELETE' THEN
      RETURN 'Removed horse' || public.audit_quoted(p_row ->> 'stallion_name');
    END IF;
    v_fields := public.audit_changed_field_labels(p_changes);
    RETURN 'Edited horse'
      || CASE WHEN v_fields IS NULL THEN '' ELSE ': ' || v_fields END;
  END IF;

  IF p_table = 'owners' THEN
    RETURN v_verb || ' owner' || public.audit_quoted(p_row ->> 'owner_name');
  END IF;

  IF p_table = 'stallion_owners' THEN
    SELECT o.owner_name INTO v_name
    FROM public.owners o
    WHERE o.id = NULLIF(p_row ->> 'owner_id', '')::uuid;
    RETURN v_verb
      || CASE WHEN COALESCE((p_row ->> 'is_primary')::boolean, false) THEN ' primary owner' ELSE ' owner' END
      || public.audit_quoted(v_name);
  END IF;

  IF p_table = 'stallion_images' THEN
    v_kind := COALESCE(NULLIF(p_row ->> 'kind', ''), 'photo');
    RETURN v_verb
      || ' '
      || CASE v_kind
           WHEN 'primary' THEN 'primary photo'
           WHEN 'gallery' THEN 'gallery photo'
           ELSE replace(v_kind, '_', ' ')
         END;
  END IF;

  IF p_table = 'stallion_performance_records' THEN
    RETURN v_verb
      || ' performance record'
      || public.audit_quoted(
           COALESCE(p_row ->> 'achievement', p_row ->> 'event')
         );
  END IF;

  IF p_table = 'stallion_progeny' THEN
    RETURN v_verb || ' progeny' || public.audit_quoted(p_row ->> 'progeny_name');
  END IF;

  IF p_table = 'stallion_foal_crops' THEN
    RETURN v_verb
      || ' '
      || COALESCE(p_row ->> 'foal_crop_year', '')
      || ' foal crop';
  END IF;

  IF p_table = 'stallion_disciplines' THEN
    SELECT df.name INTO v_name
    FROM public.discipline_families df
    WHERE df.id = NULLIF(p_row ->> 'family_id', '')::uuid;
    RETURN v_verb || ' discipline' || public.audit_quoted(v_name);
  END IF;

  IF p_table = 'stallion_breeding_service_providers' THEN
    RETURN v_verb
      || ' breeding provider'
      || public.audit_quoted(COALESCE(p_row ->> 'name', p_row ->> 'provider_name'));
  END IF;

  IF p_table = 'stallion_genetic_tests' THEN
    RETURN v_verb
      || ' genetic test '
      || COALESCE(NULLIF(p_row ->> 'test_type', ''), 'record')
      || CASE
           WHEN NULLIF(p_row ->> 'result', '') IS NULL THEN ''
           ELSE ' (' || (p_row ->> 'result') || ')'
         END;
  END IF;

  IF p_table = 'stallion_colour_tests' THEN
    RETURN v_verb
      || ' colour test '
      || COALESCE(NULLIF(p_row ->> 'colour_test', ''), 'record')
      || CASE
           WHEN NULLIF(p_row ->> 'result', '') IS NULL THEN ''
           ELSE ' (' || (p_row ->> 'result') || ')'
         END;
  END IF;

  IF p_table = 'stallion_racing_results' THEN
    RETURN v_verb
      || ' racing result'
      || public.audit_quoted(p_row ->> 'race_name');
  END IF;

  IF p_table = 'stallion_racing_summary' THEN
    RETURN v_verb || ' racing summary';
  END IF;

  IF p_table = 'stallion_profile_translations' THEN
    RETURN v_verb
      || ' '
      || COALESCE(NULLIF(p_row ->> 'locale', ''), '')
      || ' translation';
  END IF;

  IF p_table = 'mare_et_details' THEN
    RETURN v_verb || ' ET program details';
  END IF;

  v_fields := public.audit_changed_field_labels(p_changes);
  IF p_op = 'UPDATE' AND v_fields IS NOT NULL THEN
    RETURN v_verb || ': ' || v_fields;
  END IF;

  v_extra := replace(p_table, 'stallion_', '');
  v_extra := replace(v_extra, '_', ' ');
  RETURN v_verb || ' ' || v_extra;
END;
$$;

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

  DELETE FROM _audit_rewrite_stash;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_business_jsonb(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._audit_ensure_rewrite_stash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_flush_rewrite_deletes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_ordinal(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_quoted(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_changed_field_labels(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_build_summary(text, text, jsonb, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_stallion_id uuid;
  v_name text;
  v_changes jsonb := '[]'::jsonb;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_key text;
  v_actor_email text;
  v_skip boolean := false;
  v_rewrite boolean := false;
  v_matched integer := 0;
  v_summary text;
BEGIN
  BEGIN
    v_rewrite := current_setting('app.audit_rewrite', true) = '1';
  EXCEPTION
    WHEN OTHERS THEN
      v_rewrite := false;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := CASE
      WHEN TG_TABLE_NAME = 'stallion_images' THEN 'image_uploaded'
      ELSE 'created'
    END;
    v_new := to_jsonb(NEW);
    v_old := NULL;
    v_row := v_new;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'edited';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row := v_new;
  ELSE
    v_action := 'deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_row := v_old;
  END IF;

  v_record_id := COALESCE(
    (v_new ->> 'id')::uuid,
    (v_old ->> 'id')::uuid
  );

  IF TG_TABLE_NAME = 'stallions' THEN
    v_stallion_id := COALESCE((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
    v_name := COALESCE(v_new ->> 'stallion_name', v_old ->> 'stallion_name');
  ELSIF COALESCE(v_new, v_old) ? 'stallion_id' THEN
    v_stallion_id := COALESCE(
      (v_new ->> 'stallion_id')::uuid,
      (v_old ->> 'stallion_id')::uuid
    );
  ELSIF TG_TABLE_NAME = 'owners' THEN
    SELECT so.stallion_id INTO v_stallion_id
    FROM public.stallion_owners so
    WHERE so.owner_id = COALESCE((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid)
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'pedigrees' THEN
    SELECT sp.stallion_id INTO v_stallion_id
    FROM public.stallion_pedigrees sp
    WHERE sp.pedigree_id = COALESCE((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid)
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'pedigree_registrations' THEN
    SELECT sp.stallion_id INTO v_stallion_id
    FROM public.stallion_pedigrees sp
    WHERE sp.pedigree_id = COALESCE(
      (v_new ->> 'pedigree_id')::uuid,
      (v_old ->> 'pedigree_id')::uuid
    )
    LIMIT 1;
  END IF;

  IF v_name IS NULL AND v_stallion_id IS NOT NULL THEN
    SELECT s.stallion_name INTO v_name
    FROM public.stallions s
    WHERE s.id = v_stallion_id;
  END IF;

  IF v_rewrite AND TG_OP = 'DELETE' AND TG_TABLE_NAME <> 'stallions' THEN
    PERFORM public._audit_ensure_rewrite_stash();
    INSERT INTO _audit_rewrite_stash (
      tbl, payload, record_id, stallion_id, stallion_name
    )
    VALUES (
      TG_TABLE_NAME,
      public.audit_business_jsonb(v_old),
      v_record_id,
      v_stallion_id,
      v_name
    );
    RETURN OLD;
  END IF;

  IF v_rewrite AND TG_OP = 'INSERT' AND TG_TABLE_NAME <> 'stallions' THEN
    PERFORM public._audit_ensure_rewrite_stash();
    DELETE FROM _audit_rewrite_stash
    WHERE ctid = (
      SELECT s.ctid
      FROM _audit_rewrite_stash s
      WHERE s.tbl = TG_TABLE_NAME
        AND s.payload IS NOT DISTINCT FROM public.audit_business_jsonb(v_new)
      LIMIT 1
    );
    GET DIAGNOSTICS v_matched = ROW_COUNT;
    IF v_matched > 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_new)
    LOOP
      IF v_key IN ('updated_at', 'created_at') THEN
        CONTINUE;
      END IF;
      IF v_new -> v_key IS DISTINCT FROM v_old -> v_key THEN
        v_changes := v_changes || jsonb_build_array(
          jsonb_build_object(
            'field', v_key,
            'previous', v_old -> v_key,
            'next', v_new -> v_key
          )
        );
      END IF;
    END LOOP;
    IF jsonb_array_length(v_changes) = 0 THEN
      v_skip := true;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_array(
      jsonb_build_object('field', '*', 'previous', null, 'next', v_new)
    );
  ELSE
    v_changes := jsonb_build_array(
      jsonb_build_object('field', '*', 'previous', v_old, 'next', null)
    );
  END IF;

  IF NOT v_skip THEN
    SELECT up.email INTO v_actor_email
    FROM public.user_profile up
    WHERE up.auth_id = auth.uid();

    v_summary := public.audit_build_summary(
      TG_TABLE_NAME,
      TG_OP,
      v_row,
      v_changes
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
      v_action,
      v_stallion_id,
      v_name,
      TG_TABLE_NAME,
      v_record_id,
      v_changes,
      v_summary
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_stallion_from_form(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN public._form_error(
      'NOT_AUTHENTICATED',
      'You must be signed in to update a stallion.'
    );
  END IF;

  IF public.current_app_role() IS NULL THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'You do not have permission to update horses.'
    );
  END IF;

  v_id := public._form_uuid(p_payload, 'id');
  IF v_id IS NULL OR NOT public.can_edit_stallion(v_id) THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'You cannot edit this horse.',
      'id'
    );
  END IF;

  PERFORM set_config('app.audit_rewrite', '1', true);
  v_result := public._update_stallion_from_form_body(p_payload);
  PERFORM set_config('app.audit_rewrite', '0', true);
  PERFORM public.audit_flush_rewrite_deletes();
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.update_stallion_from_form(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stallion_from_form(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_delete_stallion_children(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_edit_stallion(p_id);
$$;

REVOKE ALL ON FUNCTION public.can_delete_stallion_children(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_delete_stallion_children(uuid) TO authenticated, service_role;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.role
  FROM public.user_profile up
  WHERE up.auth_id = auth.uid()
    AND up.revoked_at IS NULL
  LIMIT 1;
$$;

-- Do not recreate a staff profile when the Auth user is banned (revoke).
CREATE OR REPLACE FUNCTION public.handle_auth_user_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.banned_until IS NOT NULL AND NEW.banned_until > now() THEN
    RETURN NEW;
  END IF;

  PERFORM public.insert_user_profile_from_auth_metadata(
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    public.auth_invite_profile_metadata(NEW)
  );
  RETURN NEW;
END;
$$;

UPDATE public.user_profile up
SET revoked_at = u.banned_until
FROM auth.users u
WHERE u.id = up.auth_id
  AND up.revoked_at IS NULL
  AND u.banned_until IS NOT NULL
  AND u.banned_until > now();

CREATE OR REPLACE FUNCTION public.staff_auth_banned()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE public.is_platform_owner()
    AND u.banned_until IS NOT NULL
    AND u.banned_until > now();
$$;

REVOKE ALL ON FUNCTION public.staff_auth_banned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_auth_banned() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
