-- =============================================================================
-- Stallion URL slugs: derive from stallion_name, keep UUID as primary key.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.slugify_stallion_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' FROM regexp_replace(lower(trim(COALESCE(input, ''))), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

-- Resolve case-only duplicates before normalizing to lowercase.
WITH ranked AS (
  SELECT
    id,
    lower(trim(slug)) AS ls,
    row_number() OVER (PARTITION BY lower(trim(slug)) ORDER BY id) AS rn
  FROM public.stallions
  WHERE slug IS NOT NULL AND trim(slug) <> ''
)
UPDATE public.stallions s
SET slug = CASE
  WHEN r.rn = 1 THEN r.ls
  ELSE r.ls || '-' || substr(replace(s.id::text, '-', ''), 1, 8)
END
FROM ranked r
WHERE s.id = r.id;

-- Backfill missing slugs from stallion_name (numbered suffix on collision).
WITH prepared AS (
  SELECT
    id,
    COALESCE(
      NULLIF(public.slugify_stallion_name(stallion_name), ''),
      'stallion'
    ) AS base
  FROM public.stallions
  WHERE slug IS NULL OR trim(slug) = ''
),
numbered AS (
  SELECT
    id,
    base,
    row_number() OVER (PARTITION BY base ORDER BY id) AS rn
  FROM prepared
)
UPDATE public.stallions s
SET slug = CASE
  WHEN n.rn = 1 THEN n.base
  ELSE n.base || '-' || n.rn::text
END
FROM numbered n
WHERE s.id = n.id;

ALTER TABLE public.stallions
  ALTER COLUMN slug SET NOT NULL;

CREATE OR REPLACE FUNCTION public.stallions_ensure_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    NEW.slug := lower(trim(NEW.slug));
    RETURN NEW;
  END IF;

  base := COALESCE(
    NULLIF(public.slugify_stallion_name(COALESCE(NEW.stallion_name, '')), ''),
    'stallion'
  );
  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM public.stallions
    WHERE slug = candidate
      AND id IS DISTINCT FROM NEW.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stallions_ensure_slug_trigger ON public.stallions;

CREATE TRIGGER stallions_ensure_slug_trigger
  BEFORE INSERT OR UPDATE OF stallion_name, slug
  ON public.stallions
  FOR EACH ROW
  EXECUTE PROCEDURE public.stallions_ensure_slug();
