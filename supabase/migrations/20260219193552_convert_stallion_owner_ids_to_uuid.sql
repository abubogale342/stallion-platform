-- =============================================================================
-- Migration: Regenerate stallion/owner IDs as UUID and convert references
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

DO $$
DECLARE
  stallions_id_type text;
BEGIN
  SELECT data_type
    INTO stallions_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'stallions'
    AND column_name = 'id';

  -- Old schema uses text IDs. Re-key rows + references first, then alter types.
  IF stallions_id_type = 'text' THEN
    DROP VIEW IF EXISTS public.v_stallion_primary_owner;

    -- Drop RLS policies that depend on text-typed id/stallion_id columns.
    DROP POLICY IF EXISTS "Public read access" ON public.stallions;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_performance_records;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_images;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_progeny;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_breeding_stats;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_foal_crops;
    DROP POLICY IF EXISTS "Public read access" ON public.stallion_owners;
    DROP POLICY IF EXISTS "Public read access" ON public.owners;

    -- Drop FK constraints so PK/FK values can be rewritten safely.
    ALTER TABLE public.stallion_breeding_stats
      DROP CONSTRAINT IF EXISTS stallion_breeding_stats_stallion_id_fkey;
    ALTER TABLE public.stallion_foal_crops
      DROP CONSTRAINT IF EXISTS stallion_foal_crops_stallion_id_fkey;
    ALTER TABLE public.stallion_images
      DROP CONSTRAINT IF EXISTS stallion_images_stallion_id_fkey;
    ALTER TABLE public.stallion_owners
      DROP CONSTRAINT IF EXISTS stallion_owners_owner_id_fkey;
    ALTER TABLE public.stallion_owners
      DROP CONSTRAINT IF EXISTS stallion_owners_stallion_id_fkey;
    ALTER TABLE public.stallion_performance_records
      DROP CONSTRAINT IF EXISTS stallion_performance_records_stallion_id_fkey;
    ALTER TABLE public.stallion_progeny
      DROP CONSTRAINT IF EXISTS stallion_progeny_stallion_id_fkey;

    CREATE TEMP TABLE tmp_stallion_id_map (
      old_id text PRIMARY KEY,
      new_id uuid NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_stallion_id_map (old_id, new_id)
    SELECT
      s.id,
      gen_random_uuid()
    FROM public.stallions s;

    CREATE TEMP TABLE tmp_owner_id_map (
      old_id text PRIMARY KEY,
      new_id uuid NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_owner_id_map (old_id, new_id)
    SELECT
      o.id,
      gen_random_uuid()
    FROM public.owners o;

    -- Rewrite parent IDs first as UUID text values.
    UPDATE public.stallions s
    SET id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE s.id = m.old_id;

    UPDATE public.owners o
    SET id = m.new_id::text
    FROM tmp_owner_id_map m
    WHERE o.id = m.old_id;

    -- Rewrite all dependent references to the new UUID text values.
    UPDATE public.stallion_breeding_stats t
    SET stallion_id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE t.stallion_id = m.old_id;

    UPDATE public.stallion_foal_crops t
    SET stallion_id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE t.stallion_id = m.old_id;

    UPDATE public.stallion_images t
    SET stallion_id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE t.stallion_id = m.old_id;

    UPDATE public.stallion_performance_records t
    SET stallion_id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE t.stallion_id = m.old_id;

    UPDATE public.stallion_progeny t
    SET stallion_id = m.new_id::text
    FROM tmp_stallion_id_map m
    WHERE t.stallion_id = m.old_id;

    UPDATE public.stallion_owners t
    SET stallion_id = ms.new_id::text,
        owner_id = mo.new_id::text
    FROM tmp_stallion_id_map ms,
         tmp_owner_id_map mo
    WHERE t.stallion_id = ms.old_id
      AND t.owner_id = mo.old_id;

    -- Convert column types to uuid.
    ALTER TABLE public.stallions
      ALTER COLUMN id TYPE uuid USING id::uuid;
    ALTER TABLE public.owners
      ALTER COLUMN id TYPE uuid USING id::uuid;
    ALTER TABLE public.stallions
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE public.owners
      ALTER COLUMN id SET DEFAULT gen_random_uuid();

    ALTER TABLE public.stallion_breeding_stats
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid;
    ALTER TABLE public.stallion_foal_crops
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid;
    ALTER TABLE public.stallion_images
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid;
    ALTER TABLE public.stallion_performance_records
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid;
    ALTER TABLE public.stallion_progeny
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid;
    ALTER TABLE public.stallion_owners
      ALTER COLUMN stallion_id TYPE uuid USING stallion_id::uuid,
      ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;

    -- Recreate FK constraints.
    ALTER TABLE ONLY public.stallion_breeding_stats
      ADD CONSTRAINT stallion_breeding_stats_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_foal_crops
      ADD CONSTRAINT stallion_foal_crops_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_images
      ADD CONSTRAINT stallion_images_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_owners
      ADD CONSTRAINT stallion_owners_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.owners(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_owners
      ADD CONSTRAINT stallion_owners_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_performance_records
      ADD CONSTRAINT stallion_performance_records_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;
    ALTER TABLE ONLY public.stallion_progeny
      ADD CONSTRAINT stallion_progeny_stallion_id_fkey
      FOREIGN KEY (stallion_id) REFERENCES public.stallions(id) ON DELETE CASCADE;

    CREATE OR REPLACE VIEW public.v_stallion_primary_owner AS
    SELECT
      s.id AS stallion_id,
      s.stallion_name,
      o.owner_name AS primary_owner_name
    FROM public.stallions s
    LEFT JOIN public.stallion_owners so
      ON so.stallion_id = s.id AND so.is_primary = true
    LEFT JOIN public.owners o
      ON o.id = so.owner_id;

    -- Ensure helper function signatures exist before recreating policies.
    CREATE OR REPLACE FUNCTION public.is_published_stallion(_stallion_id text)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    AS $fn$
      SELECT EXISTS (
        SELECT 1
        FROM public.stallions
        WHERE id = _stallion_id::uuid
          AND publish_status = 'published'::public.publish_status_type
      );
    $fn$;

    CREATE OR REPLACE FUNCTION public.is_published_stallion(_stallion_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    AS $fn$
      SELECT EXISTS (
        SELECT 1
        FROM public.stallions
        WHERE id = _stallion_id
          AND publish_status = 'published'::public.publish_status_type
      );
    $fn$;

    -- Recreate published-only RLS policies after UUID conversion.
    CREATE POLICY "Public read access" ON public.stallions
      FOR SELECT USING (publish_status = 'published'::public.publish_status_type);

    CREATE POLICY "Public read access" ON public.stallion_performance_records
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.stallion_images
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.stallion_progeny
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.stallion_breeding_stats
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.stallion_foal_crops
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.stallion_owners
      FOR SELECT USING (public.is_published_stallion(stallion_id));

    CREATE POLICY "Public read access" ON public.owners
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.stallion_owners so
          WHERE so.owner_id = id
            AND public.is_published_stallion(so.stallion_id)
        )
      );
  END IF;
END $$;

-- Keep text signature for existing policy dependencies and add UUID overload.
CREATE OR REPLACE FUNCTION public.is_published_stallion(_stallion_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stallions
    WHERE id = _stallion_id::uuid
      AND publish_status = 'published'::public.publish_status_type
  );
$$;

CREATE OR REPLACE FUNCTION public.is_published_stallion(_stallion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stallions
    WHERE id = _stallion_id
      AND publish_status = 'published'::public.publish_status_type
  );
$$;

-- Cleanup legacy UUID helper columns from import tables.
ALTER TABLE IF EXISTS public.stallion_foal_crops
  DROP COLUMN IF EXISTS stallion_uuid;

ALTER TABLE IF EXISTS public.stallion_images
  DROP COLUMN IF EXISTS stallion_uuid;

ALTER TABLE IF EXISTS public.stallion_owners
  DROP COLUMN IF EXISTS stallion_uuid;

ALTER TABLE IF EXISTS public.stallion_performance_records
  DROP COLUMN IF EXISTS stallion_uuid;
