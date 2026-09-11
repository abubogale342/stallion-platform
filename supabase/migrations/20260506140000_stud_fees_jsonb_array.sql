-- Add a stud_fees column that stores an array of {value, currency} objects.
-- Keeps the legacy stud_fee / stud_fee_currency columns intact for backward compat.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stallions'
      AND column_name = 'stud_fees'
  ) THEN
    ALTER TABLE public.stallions
      ADD COLUMN stud_fees jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Backfill: copy existing stud_fee + stud_fee_currency into stud_fees array
-- Only for rows where stud_fee is not null and stud_fees is empty or null.
UPDATE public.stallions
SET stud_fees = jsonb_build_array(
  jsonb_build_object(
    'value', stud_fee,
    'currency', COALESCE(NULLIF(TRIM(stud_fee_currency), ''), 'USD')
  )
)
WHERE stud_fee IS NOT NULL
  AND (stud_fees IS NULL OR stud_fees = '[]'::jsonb);
