-- =============================================================================
-- Backfill pedigree and stallion_pedigree from legacy stallions columns.
-- Generation 2: sire, dam. Generation 3: grandparent slots.
-- Safe to rerun.
-- =============================================================================

WITH ancestor_slots AS (
  SELECT
    s.id AS stallion_id,
    NULLIF(trim(s.sire), '') AS name,
    'sire'::public.pedigree_type AS slot_type,
    2 AS generation
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(s.dam), ''),
    'dam'::public.pedigree_type,
    2
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.sire_grandsire, s.sires_grandsire)), ''),
    'sire'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.sire_granddam, s.sires_granddam)), ''),
    'dam'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_grandsire, s.dams_grandsire)), ''),
    'sire'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_granddam, s.dams_granddam)), ''),
    'dam'::public.pedigree_type,
    3
  FROM public.stallions s
),
distinct_ancestors AS (
  SELECT DISTINCT
    name,
    slot_type
  FROM ancestor_slots
  WHERE name IS NOT NULL
)
INSERT INTO public.pedigree (name, type)
SELECT
  da.name,
  da.slot_type
FROM distinct_ancestors da
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pedigree p
  WHERE p.type = da.slot_type
    AND lower(trim(p.name)) = lower(da.name)
);

WITH ancestor_slots AS (
  SELECT
    s.id AS stallion_id,
    NULLIF(trim(s.sire), '') AS name,
    'sire'::public.pedigree_type AS slot_type,
    2 AS generation
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(s.dam), ''),
    'dam'::public.pedigree_type,
    2
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.sire_grandsire, s.sires_grandsire)), ''),
    'sire'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.sire_granddam, s.sires_granddam)), ''),
    'dam'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_grandsire, s.dams_grandsire)), ''),
    'sire'::public.pedigree_type,
    3
  FROM public.stallions s

  UNION ALL

  SELECT
    s.id,
    NULLIF(trim(COALESCE(s.dam_granddam, s.dams_granddam)), ''),
    'dam'::public.pedigree_type,
    3
  FROM public.stallions s
)
INSERT INTO public.stallion_pedigree (stallion_id, pedigree_id, generation)
SELECT DISTINCT
  slot.stallion_id,
  ped.id,
  slot.generation
FROM ancestor_slots slot
JOIN LATERAL (
  SELECT p.id
  FROM public.pedigree p
  WHERE p.type = slot.slot_type
    AND lower(trim(p.name)) = lower(slot.name)
  ORDER BY p.created_at, p.id
  LIMIT 1
) ped ON true
WHERE slot.name IS NOT NULL
ON CONFLICT (stallion_id, pedigree_id, generation) DO NOTHING;
