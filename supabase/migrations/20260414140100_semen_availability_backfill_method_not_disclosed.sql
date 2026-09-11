-- Backfill: empty `{}` previously meant "none" in the app; now stored explicitly.
-- Runs after 20260414140000 so the new enum value is committed and safe to use.

UPDATE public.stallions
SET semen_availability = ARRAY['Method not disclosed']::public.semen_availability_option_type[]
WHERE semen_availability = '{}'::public.semen_availability_option_type[];
