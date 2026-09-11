-- Add ICSI as an allowed semen availability option.
-- Safe to rerun.

ALTER TYPE public.semen_availability_option_type
  ADD VALUE IF NOT EXISTS 'ICSI';
