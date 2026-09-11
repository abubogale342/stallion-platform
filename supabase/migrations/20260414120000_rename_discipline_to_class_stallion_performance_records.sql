-- Rename performance record "discipline" to "class" (show / rail class).
-- Rebuild perf_unique_idx which referenced the old column.

DROP INDEX IF EXISTS public.perf_unique_idx;

ALTER TABLE public.stallion_performance_records
  RENAME COLUMN discipline TO class;

CREATE UNIQUE INDEX IF NOT EXISTS perf_unique_idx
  ON public.stallion_performance_records
  USING btree (
    stallion_id,
    achievement,
    COALESCE(year, -1),
    COALESCE(class, ''),
    COALESCE(level, ''),
    COALESCE(association_event, '')
  );

COMMENT ON COLUMN public.stallion_performance_records.class IS
  'Show or rail class for this performance row (formerly discipline).';
