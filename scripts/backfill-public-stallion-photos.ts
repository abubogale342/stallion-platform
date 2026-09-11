/**
 * One-time backfill: copy every already-published stallion's/mare's photos
 * into the public bucket. Needed because publish/unpublish only started
 * syncing the public bucket going forward — stallions published before this
 * change have `stallions.publish_status = 'published'` but no public-bucket
 * copies yet.
 *
 * Reuses reconcileStallionPublicPhotos() (the same function publish/edit
 * actions call), so this is safely re-runnable — running it twice is a
 * no-op the second time.
 *
 * Run with: npx tsx --env-file=.env scripts/backfill-public-stallion-photos.ts
 */
import { createServiceRoleClient } from "@/services/supabase.admin";
import { reconcileStallionPublicPhotos } from "@/services/stallion-image-public.server";

async function main() {
  const client = createServiceRoleClient();
  if (!client) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const { data, error } = await client
    .from("stallions")
    .select("id, stallion_name")
    .eq("publish_status", "published");

  if (error) {
    console.error("Failed to load published stallions:", error.message);
    process.exit(1);
  }

  const stallions = data ?? [];
  console.log(`Reconciling public photos for ${stallions.length} published stallion(s)/mare(s)...`);

  let totalCopied = 0;
  let totalRemoved = 0;
  let totalFailed = 0;
  let stallionsWithFailures = 0;

  for (const stallion of stallions) {
    const result = await reconcileStallionPublicPhotos(stallion.id, client);
    totalCopied += result.copied;
    totalRemoved += result.removed;
    totalFailed += result.failed;
    if (result.failed > 0) {
      stallionsWithFailures += 1;
      console.warn(
        `  [FAILED ${result.failed}] ${stallion.stallion_name} (${stallion.id}): copied=${result.copied} removed=${result.removed}`
      );
    } else if (result.copied > 0 || result.removed > 0) {
      console.log(
        `  [ok] ${stallion.stallion_name}: copied=${result.copied} removed=${result.removed}`
      );
    }
  }

  console.log("\nDone.");
  console.log(
    `Totals: copied=${totalCopied} removed=${totalRemoved} failed=${totalFailed} (${stallionsWithFailures}/${stallions.length} stallions had a failure)`
  );
}

main();
