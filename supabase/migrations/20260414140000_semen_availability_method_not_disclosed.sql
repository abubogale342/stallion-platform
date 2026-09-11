-- =============================================================================
-- Semen availability: add "Method not disclosed" to the enum.
-- The UPDATE that uses this value MUST run in a later migration (new txn);
-- PostgreSQL forbids using a newly added enum value in the same transaction (55P04).
-- =============================================================================

ALTER TYPE public.semen_availability_option_type
  ADD VALUE IF NOT EXISTS 'Method not disclosed';
