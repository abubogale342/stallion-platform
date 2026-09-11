-- =============================================================================
-- Migration: Add month to stallion_performance_records
-- =============================================================================

ALTER TABLE public.stallion_performance_records
  ADD COLUMN IF NOT EXISTS month text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stallion_performance_records_month_check'
      AND conrelid = 'public.stallion_performance_records'::regclass
  ) THEN
    ALTER TABLE public.stallion_performance_records
      ADD CONSTRAINT stallion_performance_records_month_check
      CHECK (
        month IS NULL
        OR month IN ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
      );
  END IF;
END $$;
