-- =============================================================================
-- Migration: Add Live Cover to semen availability options
-- =============================================================================

ALTER TYPE "public"."semen_availability_option_type"
  ADD VALUE IF NOT EXISTS 'Live Cover';

