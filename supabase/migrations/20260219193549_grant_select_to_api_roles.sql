-- =============================================================================
-- Migration: Grant SELECT on public tables to anon and authenticated roles
-- =============================================================================

-- Schema access (likely already in place)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Tables exposed to the REST API (read-only for public visitors)
GRANT SELECT ON public.stallions TO anon, authenticated;
GRANT SELECT ON public.stallion_owners TO anon, authenticated;
GRANT SELECT ON public.stallion_performance_records TO anon, authenticated;
GRANT SELECT ON public.stallion_progeny TO anon, authenticated;
GRANT SELECT ON public.stallion_images TO anon, authenticated;
GRANT SELECT ON public.stallion_breeding_stats TO anon, authenticated;
GRANT SELECT ON public.stallion_foal_crops TO anon, authenticated;
GRANT SELECT ON public.owners TO anon, authenticated;
GRANT SELECT ON public.resources_directory TO anon, authenticated;
GRANT SELECT ON public.associations_registries TO anon, authenticated;

