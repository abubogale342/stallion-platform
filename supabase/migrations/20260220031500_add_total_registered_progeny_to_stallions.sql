-- Independent count for "Total registered progeny" (not derived from stallion_progeny rows)
ALTER TABLE "public"."stallions"
  ADD COLUMN IF NOT EXISTS "total_registered_progeny" integer;

COMMENT ON COLUMN "public"."stallions"."total_registered_progeny" IS
  'Owner-reported or registry total; independent of stallion_progeny listing rows.';
