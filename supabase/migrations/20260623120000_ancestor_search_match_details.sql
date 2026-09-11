-- Return ancestor match metadata (name, generation, branch) for directory cards.

CREATE OR REPLACE FUNCTION public.get_stallion_ancestor_matches(
  p_ancestor_name  TEXT,
  p_max_generation INT,
  p_branch         TEXT DEFAULT 'any'
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
      AND sp.generation <= p_max_generation

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
  SELECT DISTINCT ON (r.stallion_id)
    r.stallion_id,
    r.ancestor_name,
    r.generation,
    r.branch
  FROM resolved r
  ORDER BY r.stallion_id, r.generation ASC, r.ancestor_name ASC;
$$;

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
  SELECT DISTINCT m.stallion_id
  FROM public.get_stallion_ancestor_matches(
    p_ancestor_name,
    p_max_generation,
    p_branch
  ) AS m;
$$;

REVOKE ALL ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stallion_ancestor_matches(TEXT, INT, TEXT)
  TO anon, authenticated;
