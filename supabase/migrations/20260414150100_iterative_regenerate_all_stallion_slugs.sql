-- =============================================================================
-- Iteratively regenerate slugs for every stallion from stallion_name using
-- public.slugify_stallion_name (same uniqueness rules as stallions_ensure_slug).
-- Order by id so suffix assignment is deterministic.
-- Safe to re-run: re-derives from current stallion_name each time.
-- =============================================================================

DO $$
DECLARE
  rec record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR rec IN
    SELECT id, stallion_name
    FROM public.stallions
    ORDER BY id
  LOOP
    base := COALESCE(
      NULLIF(public.slugify_stallion_name(rec.stallion_name), ''),
      'stallion'
    );
    candidate := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1
      FROM public.stallions
      WHERE slug = candidate
        AND id IS DISTINCT FROM rec.id
    ) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;

    UPDATE public.stallions
    SET slug = candidate
    WHERE id = rec.id;
  END LOOP;
END;
$$;
