-- Horse Search: return one ancestor match per side, not one per horse.
--
-- The previous version of this function ended with
--
--   SELECT DISTINCT ON (r.stallion_id) ... ORDER BY r.stallion_id, r.generation
--
-- which collapses every match for a horse down to the single shallowest one,
-- whichever side it happened to sit on. That was fine while the Line control
-- was single-select — the caller asked for one side and got it. It cannot
-- support linebreeding: when a breeder asks for an ancestor occurring on *both*
-- the sire and dam sides, a result set holding one row per horse has already
-- thrown away the evidence needed to answer.
--
-- Widening the key to (stallion_id, branch) returns the shallowest qualifying
-- match on each side a horse carries the ancestor on: one row for a horse with
-- it on the sire side only, two for a linebred horse. The caller decides what
-- to do with that — require one side, either side, or both.
--
-- This is a widening, not a behaviour change, for existing callers: a query
-- passing p_branch = 'sire' still gets at most one row per horse, because only
-- one branch value can survive the filter. Only p_branch = 'any' sees more
-- rows than before, and that is precisely the case the new UI needs.
--
-- Safe to rerun.

CREATE OR REPLACE FUNCTION public.get_stallion_ancestor_matches(
  p_ancestor_name TEXT,
  p_generations   INT[],
  p_branch        TEXT DEFAULT 'any'
)
RETURNS TABLE(
  stallion_id    UUID,
  ancestor_name  TEXT,
  generation     INT,
  branch         TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT
      sp.id           AS sp_id,
      sp.stallion_id  AS stallion_id,
      sp.progeny_id   AS progeny_id,
      sp.generation   AS match_generation,
      p.name          AS ancestor_name
    FROM public.stallion_pedigrees sp
    JOIN public.pedigrees p ON p.id = sp.pedigree_id
    WHERE p.name ILIKE '%' || p_ancestor_name || '%'
      AND (
        p_generations IS NULL
        OR cardinality(p_generations) = 0
        OR sp.generation = ANY (p_generations)
      )

    UNION ALL

    SELECT
      sp2.id,
      chain.stallion_id,
      sp2.progeny_id,
      chain.match_generation,
      chain.ancestor_name
    FROM public.stallion_pedigrees sp2
    JOIN chain ON sp2.id = chain.progeny_id
  ),
  resolved AS (
    SELECT
      c.stallion_id,
      c.ancestor_name,
      c.match_generation AS generation,
      p_root.type::text  AS branch
    FROM chain c
    JOIN public.stallion_pedigrees sp_root ON sp_root.id = c.sp_id
    JOIN public.pedigrees p_root ON p_root.id = sp_root.pedigree_id
    WHERE c.progeny_id IS NULL
      AND (p_branch = 'any' OR p_root.type::text = p_branch)
  )
  -- Shallowest match wins per side, so a linebred horse yields a sire row and
  -- a dam row while a horse carrying the ancestor once yields a single row.
  SELECT DISTINCT ON (r.stallion_id, r.branch)
    r.stallion_id,
    r.ancestor_name,
    r.generation,
    r.branch
  FROM resolved r
  ORDER BY r.stallion_id, r.branch, r.generation ASC, r.ancestor_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT[], TEXT)
  TO anon, authenticated;
