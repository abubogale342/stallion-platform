-- =============================================================================
-- Bloodline condition search
--
-- The directory used to pair one keyword with a single "within N generations"
-- depth. Breeders search for several named ancestors at once, each pinned to
-- its own exact generation(s) and line, so the search is now a list of
-- independent bloodline conditions ANDed together by the caller.
--
-- Two changes here:
--   1. get_stallion_ancestor_matches takes an exact generation list instead of
--      a maximum depth. stallion_pedigrees.generation already stores the exact
--      depth (1 = sire/dam), so "Generation 3" no longer drags in 1 and 2.
--   2. search_public_ancestor_names backs the ancestor-name autocomplete with
--      distinct names drawn from published horses only.
-- =============================================================================

-- get_stallion_ids_by_ancestor wraps the matches function; drop it first.
DROP FUNCTION IF EXISTS public.get_stallion_ids_by_ancestor(TEXT, INT, TEXT);
DROP FUNCTION IF EXISTS public.get_stallion_ancestor_matches(TEXT, INT, TEXT);

-- =============================================================================
-- get_stallion_ancestor_matches
-- One row per matching horse: the ancestor that matched, the exact generation
-- it sits at, and the line (sire/dam) it descends through.
--
-- Parameters:
--   p_ancestor_name — ancestor name to search (case-insensitive, partial match)
--   p_generations   — exact generations to accept, e.g. '{2,3}'. NULL or an
--                     empty array means any generation.
--   p_branch        — 'sire', 'dam', or 'any'
--
-- Branch logic (unchanged): each stallion_pedigrees row carries a progeny_id
-- pointing at its child in the chain; generation 1 rows have progeny_id NULL.
-- The recursive CTE walks a match up to its generation 1 root, whose
-- pedigrees.type says which line it sits on.
-- =============================================================================
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
  -- Shallowest match wins when the same ancestor appears more than once.
  SELECT DISTINCT ON (r.stallion_id)
    r.stallion_id,
    r.ancestor_name,
    r.generation,
    r.branch
  FROM resolved r
  ORDER BY r.stallion_id, r.generation ASC, r.ancestor_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT[], TEXT)
  TO anon, authenticated;

-- =============================================================================
-- search_public_ancestor_names
-- Autocomplete source for the bloodline name field. Only names that appear in
-- a published horse's pedigree are returned, matching what the directory can
-- actually surface. Ordered by how many horses carry the ancestor so the
-- well-known sires come first.
--
--   p_horse_type — 'stallion' or 'mare' to scope suggestions to one directory;
--                  NULL for both.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.search_public_ancestor_names(
  p_query      TEXT,
  p_horse_type TEXT DEFAULT NULL,
  p_limit      INT  DEFAULT 10
)
RETURNS TABLE(
  ancestor_name  TEXT,
  horse_count    INT,
  min_generation INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.name,
    COUNT(DISTINCT sp.stallion_id)::int,
    MIN(sp.generation)::int
  FROM public.stallion_pedigrees sp
  JOIN public.pedigrees p ON p.id = sp.pedigree_id
  JOIN public.stallions s ON s.id = sp.stallion_id
  WHERE s.publish_status = 'published'
    AND (p_horse_type IS NULL OR s.horse_type::text = p_horse_type)
    AND btrim(p_query) <> ''
    AND p.name ILIKE '%' || p_query || '%'
  GROUP BY p.name
  ORDER BY COUNT(DISTINCT sp.stallion_id) DESC, p.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
$$;

REVOKE ALL ON FUNCTION public.search_public_ancestor_names(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_ancestor_names(TEXT, TEXT, INT)
  TO anon, authenticated;
