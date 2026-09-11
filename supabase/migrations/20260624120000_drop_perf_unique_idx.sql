-- Allow duplicate performance rows per stallion (e.g. same event/year with different month/score).

DROP INDEX IF EXISTS public.perf_unique_idx;
