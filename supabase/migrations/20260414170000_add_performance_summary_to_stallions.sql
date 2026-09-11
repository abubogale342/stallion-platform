-- Single stallion-level narrative for competition performance (distinct from per-row performance_summary on stallion_performance_records).

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS performance_summary text;

COMMENT ON COLUMN public.stallions.performance_summary IS 'Owner-submitted performance overview for the stallion profile (one block above the performance table).';
