-- Data Entry / Owner / Admin roles: profiles, assignments, RPC guards,
-- RLS/storage, and immutable audit log. Empty tables — no seed users.
-- Squashed from the four previously unpublished 20260816* files (not applied
-- on remote yet). Historical applied migrations are left unchanged.

-- Staff roles: user_profile + horse_assignments + RLS helpers.
-- Empty tables — no seed users or role rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'data_entry');
  END IF;
END
$$;

GRANT USAGE ON TYPE public.app_role TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  "isAdmin" boolean NOT NULL DEFAULT false,
  role public.app_role NOT NULL,
  subscription_status text,
  subscription_expires_at timestamptz,
  "hasActiveSubscription" boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profile_isadmin_matches_role_chk
    CHECK (
      "isAdmin" = (
        role IN (
          'owner'::public.app_role,
          'admin'::public.app_role
        )
      )
    )
);

-- Convert a leftover text column from the failed first push.
-- Policies (and current_app_role) must be dropped first: Postgres cannot
-- ALTER COLUMN type while a policy still references the column.
DROP POLICY IF EXISTS user_profile_update_own_or_owner ON public.user_profile;
DROP POLICY IF EXISTS user_profile_delete_owner ON public.user_profile;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profile'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    DROP FUNCTION IF EXISTS public.current_app_role() CASCADE;
    ALTER TABLE public.user_profile
      DROP CONSTRAINT IF EXISTS user_profile_role_check;
    ALTER TABLE public.user_profile
      DROP CONSTRAINT IF EXISTS user_profile_isadmin_matches_role_chk;
    ALTER TABLE public.user_profile
      ALTER COLUMN role TYPE public.app_role
      USING role::public.app_role;
    ALTER TABLE public.user_profile
      ADD CONSTRAINT user_profile_isadmin_matches_role_chk
      CHECK (
        "isAdmin" = (
          role IN (
            'owner'::public.app_role,
            'admin'::public.app_role
          )
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS user_profile_role_idx ON public.user_profile (role);
CREATE INDEX IF NOT EXISTS user_profile_is_admin_idx ON public.user_profile ("isAdmin");

CREATE OR REPLACE FUNCTION public.set_user_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profile_set_updated_at ON public.user_profile;
CREATE TRIGGER user_profile_set_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_profile_updated_at();

CREATE OR REPLACE FUNCTION public.user_profile_sync_isadmin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."isAdmin" := NEW.role IN (
    'owner'::public.app_role,
    'admin'::public.app_role
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profile_sync_isadmin ON public.user_profile;
CREATE TRIGGER user_profile_sync_isadmin
  BEFORE INSERT OR UPDATE OF role, "isAdmin"
  ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profile_sync_isadmin();

-- Invite form stores role (and names) in auth user/app metadata.
-- Profiles are created for admin/data_entry only; owner is never self-assigned.
CREATE OR REPLACE FUNCTION public.insert_user_profile_from_auth_metadata(
  p_id uuid,
  p_email text,
  p_meta jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := NULLIF(trim(COALESCE(p_meta->>'role', '')), '');
  IF p_id IS NULL
    OR COALESCE(trim(p_email), '') = ''
    OR v_role IS NULL
    OR v_role NOT IN ('admin', 'data_entry')
  THEN
    RETURN;
  END IF;

  INSERT INTO public.user_profile (
    auth_id,
    email,
    first_name,
    last_name,
    role,
    "isAdmin"
  )
  VALUES (
    p_id,
    lower(trim(p_email)),
    NULLIF(trim(COALESCE(p_meta->>'first_name', '')), ''),
    NULLIF(trim(COALESCE(p_meta->>'last_name', '')), ''),
    v_role::public.app_role,
    v_role = 'admin'
  )
  ON CONFLICT (auth_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_invite_profile_metadata(u auth.users)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_strip_nulls(
      jsonb_build_object(
        'role',
        COALESCE(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth often leaves invited_at null and writes metadata on UPDATE.
  PERFORM public.insert_user_profile_from_auth_metadata(
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    public.auth_invite_profile_metadata(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_invite_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_invite_create_profile
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_invite();

CREATE OR REPLACE FUNCTION public.provision_invited_user_profile(p_auth_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u auth.users;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = p_auth_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM public.insert_user_profile_from_auth_metadata(
    u.id,
    COALESCE(u.email, u.raw_user_meta_data->>'email'),
    public.auth_invite_profile_metadata(u)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_user_profile_from_auth_metadata(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_auth_user_invite() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auth_invite_profile_metadata(auth.users)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_invited_user_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_invite() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.insert_user_profile_from_auth_metadata(uuid, text, jsonb)
  TO supabase_auth_admin, service_role;
GRANT EXECUTE ON FUNCTION public.auth_invite_profile_metadata(auth.users)
  TO supabase_auth_admin, service_role;
GRANT EXECUTE ON FUNCTION public.provision_invited_user_profile(uuid) TO service_role;

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.horse_assignments (
  stallion_id uuid NOT NULL REFERENCES public.stallions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stallion_id, user_id)
);

CREATE INDEX IF NOT EXISTS horse_assignments_user_id_idx
  ON public.horse_assignments (user_id);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so they can read profiles/assignments under RLS)
-- ---------------------------------------------------------------------------

-- Recreate so the return type can change from text → app_role.
DROP FUNCTION IF EXISTS public.current_app_role() CASCADE;

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
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() = 'owner'::public.app_role;
$$;

-- Owner or admin (dashboard CMS / publish / overview).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() IN (
    'owner'::public.app_role,
    'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_data_entry()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() = 'data_entry'::public.app_role;
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_stallion(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.horse_assignments ha
      WHERE ha.stallion_id = p_id
        AND ha.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_stallion(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_status public.publish_status_type;
BEGIN
  IF p_id IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  v_role := public.current_app_role();
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role = 'owner'::public.app_role THEN
    RETURN true;
  END IF;

  IF v_role = 'admin'::public.app_role THEN
    RETURN public.is_assigned_to_stallion(p_id);
  END IF;

  -- data_entry: any draft, or assigned (including published)
  SELECT s.publish_status INTO v_status
  FROM public.stallions s
  WHERE s.id = p_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_status = 'draft'::public.publish_status_type
    OR public.is_assigned_to_stallion(p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_stallion_children(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.current_app_role()
    WHEN 'owner'::public.app_role THEN true
    WHEN 'admin'::public.app_role THEN public.is_assigned_to_stallion(p_id)
    WHEN 'data_entry'::public.app_role THEN public.is_assigned_to_stallion(p_id)
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_owner(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner()
    OR (
      public.has_staff_role()
      AND p_owner_id IS NOT NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.stallion_owners so WHERE so.owner_id = p_owner_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.stallion_owners so
          WHERE so.owner_id = p_owner_id
            AND public.can_edit_stallion(so.stallion_id)
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_write_pedigree(p_pedigree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner()
    OR (
      public.has_staff_role()
      AND p_pedigree_id IS NOT NULL
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.stallion_pedigrees sp
          WHERE sp.pedigree_id = p_pedigree_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.stallion_pedigrees sp
          WHERE sp.pedigree_id = p_pedigree_id
            AND public.can_edit_stallion(sp.stallion_id)
        )
      )
    );
$$;

-- Column is publish_status_type; a text signature will not match RLS WITH CHECK.
DROP FUNCTION IF EXISTS public.can_write_stallion_profile_translation(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.can_write_stallion_profile_translation(
  p_id uuid,
  p_stallion_id uuid,
  p_new_publish public.publish_status_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.publish_status_type;
BEGIN
  IF NOT public.can_edit_stallion(p_stallion_id) THEN
    RETURN false;
  END IF;

  IF public.is_admin() THEN
    RETURN true;
  END IF;

  SELECT spt.publish_status INTO v_old
  FROM public.stallion_profile_translations spt
  WHERE spt.id = p_id;

  IF NOT FOUND THEN
    RETURN COALESCE(p_new_publish, 'draft'::public.publish_status_type)
      IS DISTINCT FROM 'published'::public.publish_status_type;
  END IF;

  RETURN COALESCE(p_new_publish, 'draft'::public.publish_status_type)
    IS NOT DISTINCT FROM v_old;
END;
$$;

-- Parse stallion UUID from storage object keys.
CREATE OR REPLACE FUNCTION public.storage_object_stallion_id(p_bucket text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part text;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN NULL;
  END IF;

  IF p_bucket IN ('stallion-photos', 'stallion-images') THEN
    v_part := split_part(p_name, '/', 2);
  ELSIF p_bucket = 'stallion-videos' THEN
    v_part := split_part(p_name, '/', 1);
  ELSE
    RETURN NULL;
  END IF;

  IF v_part ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_part::uuid;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_stallion_storage_object(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_bucket = 'stallion-research' THEN
    RETURN public.is_admin();
  END IF;

  v_id := public.storage_object_stallion_id(p_bucket, p_name);
  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.can_edit_stallion(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_stallion_storage_object(p_bucket text, p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_bucket = 'stallion-research' THEN
    RETURN public.is_admin();
  END IF;

  v_id := public.storage_object_stallion_id(p_bucket, p_name);
  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.can_delete_stallion_children(v_id);
END;
$$;

-- Stamp creator + auto-assign on horse insert (create RPC is SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.stallions_before_insert_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stallions_before_insert_created_by ON public.stallions;
CREATE TRIGGER stallions_before_insert_created_by
  BEFORE INSERT ON public.stallions
  FOR EACH ROW
  EXECUTE FUNCTION public.stallions_before_insert_created_by();

CREATE OR REPLACE FUNCTION public.stallions_after_insert_assign_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_staff_role() THEN
    INSERT INTO public.horse_assignments (stallion_id, user_id, assigned_by)
    VALUES (NEW.id, auth.uid(), auth.uid())
    ON CONFLICT (stallion_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stallions_after_insert_assign_creator ON public.stallions;
CREATE TRIGGER stallions_after_insert_assign_creator
  AFTER INSERT ON public.stallions
  FOR EACH ROW
  EXECUTE FUNCTION public.stallions_after_insert_assign_creator();

-- ---------------------------------------------------------------------------
-- Table privileges + RLS for new tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horse_assignments TO authenticated, service_role;

DROP POLICY IF EXISTS user_profile_select_own_or_owner ON public.user_profile;
CREATE POLICY user_profile_select_own_or_owner
  ON public.user_profile
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid() OR public.is_platform_owner());

DROP POLICY IF EXISTS user_profile_insert_owner ON public.user_profile;
CREATE POLICY user_profile_insert_owner
  ON public.user_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_owner());

DROP POLICY IF EXISTS user_profile_update_own_or_owner ON public.user_profile;
CREATE POLICY user_profile_update_own_or_owner
  ON public.user_profile
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid() OR public.is_platform_owner())
  WITH CHECK (
    public.is_platform_owner()
    OR (auth_id = auth.uid() AND role = public.current_app_role())
  );

DROP POLICY IF EXISTS user_profile_delete_owner ON public.user_profile;
CREATE POLICY user_profile_delete_owner
  ON public.user_profile
  FOR DELETE
  TO authenticated
  USING (public.is_platform_owner() AND role <> 'owner'::public.app_role);

DROP POLICY IF EXISTS horse_assignments_select ON public.horse_assignments;
CREATE POLICY horse_assignments_select
  ON public.horse_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_owner()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS horse_assignments_insert_owner ON public.horse_assignments;
CREATE POLICY horse_assignments_insert_owner
  ON public.horse_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_owner());

DROP POLICY IF EXISTS horse_assignments_delete_owner ON public.horse_assignments;
CREATE POLICY horse_assignments_delete_owner
  ON public.horse_assignments
  FOR DELETE
  TO authenticated
  USING (public.is_platform_owner());

GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_data_entry() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_stallion(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_stallion(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_delete_stallion_children(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_pedigree(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_stallion_profile_translation(uuid, uuid, public.publish_status_type) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_object_stallion_id(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_stallion_storage_object(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_delete_stallion_storage_object(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.staff_auth_never_signed_in()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE public.is_platform_owner()
    AND u.last_sign_in_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.staff_auth_never_signed_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_auth_never_signed_in() TO authenticated, service_role;

-- Gate SECURITY DEFINER RPCs with staff roles. Do not rewrite the original
-- form bodies; wrap them so later CREATE OR REPLACE of the body is not required.

DO $$
BEGIN
  IF to_regprocedure('public._create_stallion_from_form_body(jsonb)') IS NULL THEN
    ALTER FUNCTION public.create_stallion_from_form(jsonb)
      RENAME TO _create_stallion_from_form_body;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_stallion_from_form(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN public._form_error(
      'NOT_AUTHENTICATED',
      'You must be signed in to create a stallion.'
    );
  END IF;

  IF public.current_app_role() IS NULL THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'You do not have permission to create horses.'
    );
  END IF;

  RETURN public._create_stallion_from_form_body(p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.create_stallion_from_form(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stallion_from_form(jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public._create_stallion_from_form_body(jsonb) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public._update_stallion_from_form_body(jsonb)') IS NULL THEN
    ALTER FUNCTION public.update_stallion_from_form(jsonb)
      RENAME TO _update_stallion_from_form_body;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_stallion_from_form(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
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

  RETURN public._update_stallion_from_form_body(p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.update_stallion_from_form(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stallion_from_form(jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public._update_stallion_from_form_body(jsonb) FROM PUBLIC, anon, authenticated;

-- Latest publish body + role gates + restore mare skip for semen/live-cover/country.
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

REVOKE ALL ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stallion_publish_status(uuid, public.publish_status_type)
  TO authenticated, service_role;

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

  IF NOT public.can_edit_stallion(p_stallion_id) THEN
    RETURN public._form_error(
      'FORBIDDEN',
      'You cannot edit this horse.',
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

REVOKE ALL ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_stallion_stud_fees(uuid, jsonb) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public._admin_dashboard_stats_body()') IS NULL THEN
    ALTER FUNCTION public.admin_dashboard_stats()
      RENAME TO _admin_dashboard_stats_body;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: overview stats require admin access'
      USING ERRCODE = '42501';
  END IF;

  RETURN public._admin_dashboard_stats_body();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public._admin_dashboard_stats_body() FROM PUBLIC, anon, authenticated;
-- Replace open authenticated write policies with role-aware helpers.
-- SELECT on owners + pedigrees stays open for staff so they can reuse contacts
-- and bloodlines. Horse catalogue writes remain can_edit_stallion.

-- Stallions: UPDATE only when the caller can edit that horse.
DROP POLICY IF EXISTS stallions_authenticated_update ON public.stallions;
CREATE POLICY stallions_authenticated_update
  ON public.stallions
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_stallion(id))
  WITH CHECK (public.can_edit_stallion(id));

-- ---------------------------------------------------------------------------
-- Child tables keyed by stallion_id
-- ---------------------------------------------------------------------------

-- stallion_owners: keep full SELECT; writes follow the horse.
DROP POLICY IF EXISTS stallion_owners_authenticated_all ON public.stallion_owners;
DROP POLICY IF EXISTS stallion_owners_staff_insert ON public.stallion_owners;
DROP POLICY IF EXISTS stallion_owners_staff_update ON public.stallion_owners;
DROP POLICY IF EXISTS stallion_owners_staff_delete ON public.stallion_owners;

CREATE POLICY stallion_owners_staff_insert
  ON public.stallion_owners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_owners_staff_update
  ON public.stallion_owners
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_stallion(stallion_id))
  WITH CHECK (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_owners_staff_delete
  ON public.stallion_owners
  FOR DELETE
  TO authenticated
  USING (public.can_delete_stallion_children(stallion_id));

-- owners: SELECT remains all; INSERT staff; UPDATE/DELETE scoped.
DROP POLICY IF EXISTS owners_authenticated_all ON public.owners;
DROP POLICY IF EXISTS owners_staff_insert ON public.owners;
DROP POLICY IF EXISTS owners_staff_update ON public.owners;
DROP POLICY IF EXISTS owners_staff_delete ON public.owners;

CREATE POLICY owners_staff_insert
  ON public.owners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_role());

CREATE POLICY owners_staff_update
  ON public.owners
  FOR UPDATE
  TO authenticated
  USING (public.can_write_owner(id))
  WITH CHECK (public.can_write_owner(id));

CREATE POLICY owners_staff_delete
  ON public.owners
  FOR DELETE
  TO authenticated
  USING (public.is_platform_owner());

-- pedigrees: SELECT remains public/all; writes scoped.
DROP POLICY IF EXISTS pedigrees_authenticated_all ON public.pedigrees;
DROP POLICY IF EXISTS pedigrees_staff_insert ON public.pedigrees;
DROP POLICY IF EXISTS pedigrees_staff_update ON public.pedigrees;
DROP POLICY IF EXISTS pedigrees_staff_delete ON public.pedigrees;
DROP POLICY IF EXISTS pedigrees_authenticated_select ON public.pedigrees;

CREATE POLICY pedigrees_authenticated_select
  ON public.pedigrees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY pedigrees_staff_insert
  ON public.pedigrees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_role());

CREATE POLICY pedigrees_staff_update
  ON public.pedigrees
  FOR UPDATE
  TO authenticated
  USING (public.can_write_pedigree(id))
  WITH CHECK (public.can_write_pedigree(id));

CREATE POLICY pedigrees_staff_delete
  ON public.pedigrees
  FOR DELETE
  TO authenticated
  USING (public.is_platform_owner());

-- pedigree_registrations: writes via the parent pedigree.
DROP POLICY IF EXISTS pedigree_registrations_authenticated_all ON public.pedigree_registrations;
DROP POLICY IF EXISTS pedigree_registrations_staff_select ON public.pedigree_registrations;
DROP POLICY IF EXISTS pedigree_registrations_staff_insert ON public.pedigree_registrations;
DROP POLICY IF EXISTS pedigree_registrations_staff_update ON public.pedigree_registrations;
DROP POLICY IF EXISTS pedigree_registrations_staff_delete ON public.pedigree_registrations;

CREATE POLICY pedigree_registrations_staff_select
  ON public.pedigree_registrations
  FOR SELECT
  TO authenticated
  USING (public.can_write_pedigree(pedigree_id));

CREATE POLICY pedigree_registrations_staff_insert
  ON public.pedigree_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_pedigree(pedigree_id));

CREATE POLICY pedigree_registrations_staff_update
  ON public.pedigree_registrations
  FOR UPDATE
  TO authenticated
  USING (public.can_write_pedigree(pedigree_id))
  WITH CHECK (public.can_write_pedigree(pedigree_id));

CREATE POLICY pedigree_registrations_staff_delete
  ON public.pedigree_registrations
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_owner()
    OR public.can_write_pedigree(pedigree_id)
  );

DROP POLICY IF EXISTS stallion_pedigrees_authenticated_all ON public.stallion_pedigrees;
DROP POLICY IF EXISTS stallion_pedigrees_staff_select ON public.stallion_pedigrees;
DROP POLICY IF EXISTS stallion_pedigrees_staff_insert ON public.stallion_pedigrees;
DROP POLICY IF EXISTS stallion_pedigrees_staff_update ON public.stallion_pedigrees;
DROP POLICY IF EXISTS stallion_pedigrees_staff_delete ON public.stallion_pedigrees;

CREATE POLICY stallion_pedigrees_staff_select
  ON public.stallion_pedigrees
  FOR SELECT
  TO authenticated
  USING (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_pedigrees_staff_insert
  ON public.stallion_pedigrees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_pedigrees_staff_update
  ON public.stallion_pedigrees
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_stallion(stallion_id))
  WITH CHECK (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_pedigrees_staff_delete
  ON public.stallion_pedigrees
  FOR DELETE
  TO authenticated
  USING (public.can_delete_stallion_children(stallion_id));

-- Generic child tables
DO $$
DECLARE
  rec record;
  old_name text;
BEGIN
  FOR rec IN
    SELECT unnest(ARRAY[
      'stallion_performance_records',
      'stallion_progeny',
      'stallion_foal_crops',
      'stallion_images',
      'stallion_disciplines',
      'stallion_breeding_service_providers',
      'stallion_genetic_tests',
      'stallion_colour_tests',
      'stallion_racing_results',
      'stallion_racing_summary',
      'mare_et_details'
    ]) AS tbl
  LOOP
    old_name := rec.tbl || '_authenticated_all';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_name, rec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.tbl || '_staff_insert', rec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.tbl || '_staff_update', rec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.tbl || '_staff_delete', rec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.tbl || '_staff_select', rec.tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_edit_stallion(stallion_id))',
      rec.tbl || '_staff_select', rec.tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_edit_stallion(stallion_id))',
      rec.tbl || '_staff_insert', rec.tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_edit_stallion(stallion_id)) WITH CHECK (public.can_edit_stallion(stallion_id))',
      rec.tbl || '_staff_update', rec.tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_delete_stallion_children(stallion_id))',
      rec.tbl || '_staff_delete', rec.tbl
    );
  END LOOP;
END
$$;

-- Translations: data_entry cannot change publish_status.
DROP POLICY IF EXISTS stallion_profile_translations_authenticated_all
  ON public.stallion_profile_translations;
DROP POLICY IF EXISTS stallion_profile_translations_staff_select
  ON public.stallion_profile_translations;
DROP POLICY IF EXISTS stallion_profile_translations_staff_insert
  ON public.stallion_profile_translations;
DROP POLICY IF EXISTS stallion_profile_translations_staff_update
  ON public.stallion_profile_translations;
DROP POLICY IF EXISTS stallion_profile_translations_staff_delete
  ON public.stallion_profile_translations;

CREATE POLICY stallion_profile_translations_staff_select
  ON public.stallion_profile_translations
  FOR SELECT
  TO authenticated
  USING (public.can_edit_stallion(stallion_id));

CREATE POLICY stallion_profile_translations_staff_insert
  ON public.stallion_profile_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_write_stallion_profile_translation(id, stallion_id, publish_status)
  );

CREATE POLICY stallion_profile_translations_staff_update
  ON public.stallion_profile_translations
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_stallion(stallion_id))
  WITH CHECK (
    public.can_write_stallion_profile_translation(id, stallion_id, publish_status)
  );

CREATE POLICY stallion_profile_translations_staff_delete
  ON public.stallion_profile_translations
  FOR DELETE
  TO authenticated
  USING (public.can_delete_stallion_children(stallion_id));

-- CMS: admin/owner only for writes; published rows remain readable.
DROP POLICY IF EXISTS cms_pages_auth_all ON public.cms_pages;
DROP POLICY IF EXISTS cms_pages_auth_select ON public.cms_pages;
DROP POLICY IF EXISTS cms_pages_auth_write ON public.cms_pages;
DROP POLICY IF EXISTS cms_pages_auth_insert ON public.cms_pages;
DROP POLICY IF EXISTS cms_pages_auth_update ON public.cms_pages;
DROP POLICY IF EXISTS cms_pages_auth_delete ON public.cms_pages;

CREATE POLICY cms_pages_auth_select
  ON public.cms_pages
  FOR SELECT
  TO authenticated
  USING (published = true OR public.is_admin());

CREATE POLICY cms_pages_auth_insert
  ON public.cms_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY cms_pages_auth_update
  ON public.cms_pages
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY cms_pages_auth_delete
  ON public.cms_pages
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Discipline taxonomy writes: admin/owner.
DROP POLICY IF EXISTS discipline_families_authenticated_all ON public.discipline_families;
DROP POLICY IF EXISTS discipline_families_staff_write ON public.discipline_families;
DROP POLICY IF EXISTS discipline_families_admin_insert ON public.discipline_families;
DROP POLICY IF EXISTS discipline_families_admin_update ON public.discipline_families;
DROP POLICY IF EXISTS discipline_families_admin_delete ON public.discipline_families;

CREATE POLICY discipline_families_admin_insert
  ON public.discipline_families FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY discipline_families_admin_update
  ON public.discipline_families FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY discipline_families_admin_delete
  ON public.discipline_families FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS discipline_subcategories_authenticated_all ON public.discipline_subcategories;
DROP POLICY IF EXISTS discipline_subcategories_admin_insert ON public.discipline_subcategories;
DROP POLICY IF EXISTS discipline_subcategories_admin_update ON public.discipline_subcategories;
DROP POLICY IF EXISTS discipline_subcategories_admin_delete ON public.discipline_subcategories;

CREATE POLICY discipline_subcategories_admin_insert
  ON public.discipline_subcategories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY discipline_subcategories_admin_update
  ON public.discipline_subcategories FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY discipline_subcategories_admin_delete
  ON public.discipline_subcategories FOR DELETE TO authenticated
  USING (public.is_admin());

-- Research: admin/owner only.
DROP POLICY IF EXISTS stallion_research_snippets_authenticated_crud
  ON public.stallion_research_snippets;
DROP POLICY IF EXISTS stallion_research_snippets_admin_all
  ON public.stallion_research_snippets;

CREATE POLICY stallion_research_snippets_admin_all
  ON public.stallion_research_snippets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS stallion_research_snippets_images_authenticated_crud
  ON public.stallion_research_snippets_images;
DROP POLICY IF EXISTS stallion_research_snippets_images_admin_all
  ON public.stallion_research_snippets_images;

CREATE POLICY stallion_research_snippets_images_admin_all
  ON public.stallion_research_snippets_images
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "stallion_photos_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-photos'
    AND name LIKE 'stallions/%/images/%'
    AND name NOT LIKE '%..%'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_photos_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'stallion-photos'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  )
  WITH CHECK (
    bucket_id = 'stallion-photos'
    AND name LIKE 'stallions/%/images/%'
    AND name NOT LIKE '%..%'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'stallion-photos'
    AND public.can_delete_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_videos_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-videos'
    AND name ~ '^[^/]+/[^/]+$'
    AND name NOT LIKE '%..%'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_videos_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'stallion-videos'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  )
  WITH CHECK (
    bucket_id = 'stallion-videos'
    AND name ~ '^[^/]+/[^/]+$'
    AND name NOT LIKE '%..%'
    AND public.can_edit_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_videos_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_videos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'stallion-videos'
    AND public.can_delete_stallion_storage_object(bucket_id, name)
  );

DROP POLICY IF EXISTS "stallion_research_authenticated_select" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stallion-research' AND public.is_admin());

DROP POLICY IF EXISTS "stallion_research_authenticated_insert" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stallion-research'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "stallion_research_authenticated_update" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stallion-research' AND public.is_admin())
  WITH CHECK (
    bucket_id = 'stallion-research'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "stallion_research_authenticated_delete" ON storage.objects;
CREATE POLICY "stallion_research_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stallion-research' AND public.is_admin());
-- Immutable admin audit log. Inserts come from triggers only.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL CHECK (action IN ('created', 'edited', 'deleted', 'image_uploaded')),
  stallion_id uuid,
  stallion_name text,
  table_name text NOT NULL,
  record_id uuid,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_audit_log_occurred_at_idx
  ON public.admin_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_email_idx
  ON public.admin_audit_log (actor_email);
CREATE INDEX IF NOT EXISTS admin_audit_log_stallion_id_idx
  ON public.admin_audit_log (stallion_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO service_role;

DROP POLICY IF EXISTS admin_audit_log_owner_select ON public.admin_audit_log;
CREATE POLICY admin_audit_log_owner_select
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_platform_owner());

-- Trigger function inserts as definer; allow insert when session is staff or owner
-- of the function (bypass via BYPASSRLS for postgres). Explicit policy for FORCE RLS.
DROP POLICY IF EXISTS admin_audit_log_insert_trigger ON public.admin_audit_log;
CREATE POLICY admin_audit_log_insert_trigger
  ON public.admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

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
  v_key text;
  v_actor_email text;
  v_skip boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := CASE
      WHEN TG_TABLE_NAME = 'stallion_images' THEN 'image_uploaded'
      ELSE 'created'
    END;
    v_new := to_jsonb(NEW);
    v_old := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'edited';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_action := 'deleted';
    v_old := to_jsonb(OLD);
    v_new := NULL;
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

    INSERT INTO public.admin_audit_log (
      occurred_at,
      actor_id,
      actor_email,
      action,
      stallion_id,
      stallion_name,
      table_name,
      record_id,
      changes
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
      v_changes
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- FORCE RLS would block the definer insert unless the function owner bypasses RLS.
-- Grant the trigger function owner insert by using SET row_security = off inside
-- the function is not allowed. Recreate insert as table owner (postgres), who
-- still needs a policy under FORCE RLS unless BYPASSRLS. Add a permissive
-- insert policy for the postgres role via a SET ROLE is not possible.
-- Switch: do not FORCE RLS; instead revoke UPDATE/DELETE and skip grants for write.
ALTER TABLE public.admin_audit_log NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_log_insert_trigger ON public.admin_audit_log;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stallions',
    'stallion_owners',
    'owners',
    'stallion_images',
    'stallion_performance_records',
    'stallion_progeny',
    'stallion_foal_crops',
    'stallion_disciplines',
    'stallion_breeding_service_providers',
    'stallion_genetic_tests',
    'stallion_colour_tests',
    'stallion_racing_results',
    'stallion_racing_summary',
    'stallion_profile_translations',
    'mare_et_details',
    'stallion_pedigrees',
    'pedigrees',
    'pedigree_registrations'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s_change ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      t, t
    );
  END LOOP;
END
$$;
