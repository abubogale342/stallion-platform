ALTER TABLE public.stallion_progeny
  ADD COLUMN IF NOT EXISTS association text;

ALTER TABLE public.stallion_progeny
  ADD COLUMN IF NOT EXISTS event text;

COMMENT ON COLUMN public.stallion_progeny.association IS 'Association for this progeny performance row.';
COMMENT ON COLUMN public.stallion_progeny.event IS 'Event for this progeny performance row.';
