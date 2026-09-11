-- =============================================================================
-- Trigram extension + index for fast ILIKE on pedigrees.name
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pedigrees_name_trgm
  ON public.pedigrees USING GIN (name gin_trgm_ops);

-- =============================================================================
-- get_stallion_ids_by_ancestor
-- Returns stallion IDs whose pedigree contains a named ancestor within
-- N generations, optionally scoped to the sire or dam branch.
--
-- Parameters:
--   p_ancestor_name  — horse name to search (case-insensitive, partial match)
--   p_max_generation — how deep to look (e.g. 2 = Gen 1 + Gen 2)
--   p_branch         — 'sire', 'dam', or 'any'
--
-- Branch logic:
--   Each stallion_pedigrees row carries a progeny_id that points to the
--   stallion_pedigrees.id of its child in the chain. Gen 1 rows have
--   progeny_id IS NULL. The recursive CTE walks a matching ancestor up
--   to its Gen 1 root; the root's pedigrees.type (sire/dam enum) tells
--   us which branch it sits on.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_stallion_ids_by_ancestor(
  p_ancestor_name  TEXT,
  p_max_generation INT,
  p_branch         TEXT DEFAULT 'any'
)
RETURNS TABLE(stallion_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (

    -- Base: stallion_pedigrees rows whose linked pedigree name matches,
    -- within the generation limit.
    SELECT
      sp.id          AS sp_id,
      sp.stallion_id AS stallion_id,
      sp.progeny_id  AS progeny_id,
      sp.generation  AS generation
    FROM public.stallion_pedigrees sp
    JOIN public.pedigrees p ON p.id = sp.pedigree_id
    WHERE p.name ILIKE '%' || p_ancestor_name || '%'
      AND sp.generation <= p_max_generation

    UNION ALL

    -- Recursive step: follow progeny_id toward Gen 1.
    -- Terminates naturally when progeny_id IS NULL (no matching sp2 row).
    SELECT
      sp2.id          AS sp_id,
      chain.stallion_id,
      sp2.progeny_id  AS progeny_id,
      sp2.generation  AS generation
    FROM public.stallion_pedigrees sp2
    JOIN chain ON sp2.id = chain.progeny_id

  )
  -- At Gen 1 (progeny_id IS NULL) the chain has reached the root.
  -- Join back to get the pedigree type (sire/dam) for branch filtering.
  SELECT DISTINCT c.stallion_id
  FROM chain c
  JOIN public.stallion_pedigrees sp_root ON sp_root.id = c.sp_id
  JOIN public.pedigrees           p_root ON p_root.id  = sp_root.pedigree_id
  WHERE c.generation  = 1
    AND c.progeny_id IS NULL
    AND (p_branch = 'any' OR p_root.type::text = p_branch);
$$;

-- Allow public (anon) and authenticated users to call this function,
-- matching the read-access policy on the underlying pedigree tables.
GRANT EXECUTE ON FUNCTION public.get_stallion_ids_by_ancestor(TEXT, INT, TEXT)
  TO anon, authenticated;
