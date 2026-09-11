-- Owner-entered aggregate for progeny earnings. Not derived from summing stallion_progeny.total_earnings.
ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS total_reported_offspring_earnings numeric;

COMMENT ON COLUMN public.stallions.total_reported_offspring_earnings IS
  'Total reported offspring earnings (independent field; not computed from progeny rows).';
