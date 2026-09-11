-- Independent count for "Performance earners" (not derived from stallion_progeny rows).
ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS performance_earners integer;

COMMENT ON COLUMN public.stallions.performance_earners IS
  'Owner-reported count of performance earners (e.g. progeny with earnings); independent of stallion_progeny listing rows.';
