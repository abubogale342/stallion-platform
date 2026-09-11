ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS total_reported_earnings_currency text,
  ADD COLUMN IF NOT EXISTS total_reported_offspring_earnings_currency text;

COMMENT ON COLUMN public.stallions.total_reported_earnings_currency IS
  'Currency code for stallion total reported earnings (e.g. USD, AUD, EUR).';

COMMENT ON COLUMN public.stallions.total_reported_offspring_earnings_currency IS
  'Currency code for total reported offspring earnings (e.g. USD, AUD, EUR).';
