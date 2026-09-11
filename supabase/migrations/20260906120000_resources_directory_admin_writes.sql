-- Give the two reference directories an admin write path.
--
-- public.resources_directory (commercial providers) and
-- public.associations_registries (official bodies) shipped as Phase 1
-- read-only, seed-data tables: documentation/schema/README.md states
-- "no admin UI or authentication required" for both. They therefore carry a
-- single "Public read access" policy and only GRANT SELECT to anon and
-- authenticated, which means an admin screen cannot write to them at all.
--
-- This migration adds the write half so the dashboard can manage them. It does
-- NOT add columns: focus/notes on resources_directory and notes on
-- associations_registries already exist from the original CREATE TABLE in
-- 20260219193546_align_form_with_schema.sql. (src/types/database.types.ts is
-- hand-maintained and disagrees; the migrations are the source of truth.)
--
-- Access model follows the house pattern used for stallion_research_snippets:
-- one FOR ALL policy gated on public.is_admin(), which resolves to app_role
-- 'owner' or 'admin'. Public read stays exactly as it was, so the directories
-- remain anonymously readable.
--
-- Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. Admin write policies
-- ---------------------------------------------------------------------------
-- The existing "Public read access" policies are left untouched. Postgres ORs
-- permissive policies together, so anon keeps SELECT while admins additionally
-- get INSERT/UPDATE/DELETE.

DROP POLICY IF EXISTS resources_directory_admin_all
  ON public.resources_directory;

CREATE POLICY resources_directory_admin_all
  ON public.resources_directory
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS associations_registries_admin_all
  ON public.associations_registries;

CREATE POLICY associations_registries_admin_all
  ON public.associations_registries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Table grants
-- ---------------------------------------------------------------------------
-- RLS decides which rows; grants decide whether the verb is reachable at all.
-- Both are required. anon deliberately keeps SELECT only.

GRANT INSERT, UPDATE, DELETE ON public.resources_directory TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.associations_registries TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance
-- ---------------------------------------------------------------------------
-- Both tables default updated_at to now() on insert but have no trigger, so an
-- UPDATE would leave the column frozen at the created_at value. Reuse the
-- shared helper public.update_updated_at_column(), established by
-- 20260506100000_stallion_racing_tables.sql, rather than defining a second
-- identical function under a different name.

DROP TRIGGER IF EXISTS set_updated_at ON public.resources_directory;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.resources_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.associations_registries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.associations_registries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Audit trail
-- ---------------------------------------------------------------------------
-- Match the stallion tables: every admin-editable table is audited, so the
-- /dashboard/audit screen shows directory edits alongside stallion edits.
-- audit_row_change() is generic over the table it fires on.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'resources_directory',
    'associations_registries'
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

-- ---------------------------------------------------------------------------
-- 5. Filter indexes
-- ---------------------------------------------------------------------------
-- The public pages filter on is_active and order by country, name. The spec
-- for the associations screen adds Country and Breed dropdowns plus a name
-- search, so index the columns those land on.

CREATE INDEX IF NOT EXISTS resources_directory_is_active_idx
  ON public.resources_directory USING btree (is_active);

CREATE INDEX IF NOT EXISTS resources_directory_country_idx
  ON public.resources_directory USING btree (country);

CREATE INDEX IF NOT EXISTS associations_registries_is_active_idx
  ON public.associations_registries USING btree (is_active);

CREATE INDEX IF NOT EXISTS associations_registries_country_idx
  ON public.associations_registries USING btree (country);

CREATE INDEX IF NOT EXISTS associations_registries_breed_focus_idx
  ON public.associations_registries USING btree (breed_focus);
