"use server";

import { assertCanEditStallion, requireRole, requireServerAuth } from "@/services/auth.server";
import {
  createDraftStallionWithClient,
  setStallionPublishStatusWithClient,
  updatePerformanceStepDraftWithClient,
  updateStallionDraftWithClient,
  upsertMareEtDetailsWithClient,
  type SetStallionPublishStatusResult,
  type StallionFormRpcResult,
} from "@/services/stallion";
import { upsertRacingSummaryWithClient } from "@/services/racing";
import { invokeStallionPublicPhotoSync } from "@/services/stallion-public-photos";
import {
  fetchStallionProfileTranslationWithClient,
  setStallionProfileTranslationPublishWithClient,
  stallionProfileTranslationHasContent,
  upsertStallionProfileTranslationWithClient,
  type UpsertStallionProfileTranslationResult,
} from "@/services/stallion-translations";
import type { StallionProfileTranslationFormValues, TranslatableProfileLocale } from "@/types/stallion-translations";
import type { HorseType } from "@/types/stallion";
import type { StallionFormValues } from "@/types/stallion-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function revalidateStallionList() {
  revalidatePath("/dashboard/stallions");
}

function revalidateStallionEdit(stallionId: string) {
  revalidatePath(`/dashboard/stallions/${stallionId}/edit`);
}

function revalidatePublicStallionDirectory() {
  revalidatePath("/en/stallions");
  revalidatePath("/pt-BR/stallions");
  revalidatePath("/en/mares");
  revalidatePath("/pt-BR/mares");
}

async function revalidatePublicStallionProfile(
  supabase: SupabaseClient,
  stallionId: string
) {
  const { data } = await supabase
    .from("stallions")
    .select("slug, horse_type")
    .eq("id", stallionId)
    .maybeSingle();

  const slug =
    data && typeof data.slug === "string" && data.slug.trim()
      ? data.slug.trim()
      : null;

  if (!slug) return;

  const base = data?.horse_type === "mare" ? "mares" : "stallions";
  revalidatePath(`/en/${base}/${slug}`);
  revalidatePath(`/pt-BR/${base}/${slug}`);
}

export async function saveStallionProfileTranslationAction(
  stallionId: string,
  values: StallionProfileTranslationFormValues
): Promise<UpsertStallionProfileTranslationResult> {
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false, error: edit.error };
  }
  const auth = edit.auth;

  const result = await upsertStallionProfileTranslationWithClient(
    auth.supabase,
    stallionId,
    values
  );

  if (!result.ok) {
    return result;
  }

  const hasContent = stallionProfileTranslationHasContent(result.row);
  if (hasContent && (auth.role === "owner" || auth.role === "admin")) {
    const { data: stallion } = await auth.supabase
      .from("stallions")
      .select("publish_status")
      .eq("id", stallionId)
      .maybeSingle();

    if (stallion?.publish_status === "published") {
      const publishResult = await setStallionProfileTranslationPublishWithClient(
        auth.supabase,
        stallionId,
        values.locale,
        true
      );
      if (!publishResult.ok) {
        return { ok: false, error: publishResult.error };
      }
      result.row.publish_status = publishResult.publish_status;
    }
  }

  await revalidatePublicStallionProfile(auth.supabase, stallionId);
  revalidateStallionEdit(stallionId);

  return result;
}

export async function publishStallionProfileTranslationAction(
  stallionId: string,
  locale: TranslatableProfileLocale
) {
  const role = await requireRole("owner", "admin");
  if (!role.ok) {
    return { ok: false as const, error: role.error };
  }
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false as const, error: edit.error };
  }

  const result = await setStallionProfileTranslationPublishWithClient(
    edit.auth.supabase,
    stallionId,
    locale,
    true
  );

  if (result.ok) {
    await revalidatePublicStallionProfile(edit.auth.supabase, stallionId);
    revalidateStallionEdit(stallionId);
  }

  return result;
}

export async function unpublishStallionProfileTranslationAction(
  stallionId: string,
  locale: TranslatableProfileLocale
) {
  const role = await requireRole("owner", "admin");
  if (!role.ok) {
    return { ok: false as const, error: role.error };
  }
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false as const, error: edit.error };
  }

  const result = await setStallionProfileTranslationPublishWithClient(
    edit.auth.supabase,
    stallionId,
    locale,
    false
  );

  if (result.ok) {
    await revalidatePublicStallionProfile(edit.auth.supabase, stallionId);
    revalidateStallionEdit(stallionId);
  }

  return result;
}

export async function createDraftStallionAction(
  stallionName: string,
  horseType: HorseType = "stallion"
): Promise<StallionFormRpcResult> {
  const auth = await requireServerAuth();
  if (!auth.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: auth.error };
  }

  const result = await createDraftStallionWithClient(
    auth.supabase,
    stallionName,
    horseType
  );
  if (result.ok) {
    revalidateStallionList();
    revalidateStallionEdit(result.stallion_id);
  }
  return result;
}

export async function updatePerformanceStepDraftAction(
  values: Pick<StallionFormValues, "id" | "performance_summary" | "racing_summary">
): Promise<StallionFormRpcResult> {
  const stallionId = values.id.trim();
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: edit.error };
  }
  const auth = edit.auth;
  const summaryResult = await upsertRacingSummaryWithClient(
    auth.supabase,
    stallionId,
    values.racing_summary
  );
  if (!summaryResult.ok) {
    return {
      ok: false,
      code: "RPC_ERROR",
      error: summaryResult.error,
      field: "racing_summary",
    };
  }

  const result = await updatePerformanceStepDraftWithClient(
    auth.supabase,
    stallionId,
    values.performance_summary
  );
  if (result.ok) {
    revalidateStallionEdit(stallionId);
    await revalidatePublicStallionProfile(auth.supabase, stallionId);
  }
  return result;
}

export async function updateStallionDraftAction(
  values: StallionFormValues
): Promise<StallionFormRpcResult> {
  const edit = await assertCanEditStallion(values.id.trim());
  if (!edit.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: edit.error };
  }
  const auth = edit.auth;

  const summaryResult = await upsertRacingSummaryWithClient(
    auth.supabase,
    values.id.trim(),
    values.racing_summary
  );
  if (!summaryResult.ok) {
    return {
      ok: false,
      code: "RPC_ERROR",
      error: summaryResult.error,
      field: "racing_summary",
    };
  }

  if (values.horse_type === "mare") {
    const etResult = await upsertMareEtDetailsWithClient(
      auth.supabase,
      values.id.trim(),
      values.et_details
    );
    if (!etResult.ok) {
      return {
        ok: false,
        code: "RPC_ERROR",
        error: etResult.error,
        field: "et_details",
      };
    }
  }

  const result = await updateStallionDraftWithClient(auth.supabase, values);
  if (result.ok) {
    revalidateStallionList();
    revalidateStallionEdit(result.stallion_id);
  }
  return result;
}

export async function publishStallionAction(
  stallionId: string
): Promise<SetStallionPublishStatusResult> {
  const role = await requireRole("owner", "admin");
  if (!role.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: role.error };
  }
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: edit.error };
  }
  const auth = edit.auth;

  const result = await setStallionPublishStatusWithClient(
    auth.supabase,
    stallionId,
    "published"
  );
  if (!result.ok) {
    return result;
  }

  const sync = await invokeStallionPublicPhotoSync(
    auth.supabase,
    stallionId,
    "reconcile"
  );
  if (!sync.ok) {
    result.photoSyncWarning = `Published, but photos could not be synced to public storage. ${sync.error}`;
  } else if (sync.failed > 0) {
    result.photoSyncWarning = `Published, but ${sync.failed} photo(s) failed to sync to public storage. Re-editing the stallion's photos will retry.`;
  }

  const translation = await fetchStallionProfileTranslationWithClient(
    auth.supabase,
    stallionId,
    "pt-BR"
  );
  if (translation && stallionProfileTranslationHasContent(translation)) {
    const translationResult = await setStallionProfileTranslationPublishWithClient(
      auth.supabase,
      stallionId,
      "pt-BR",
      true
    );
    if (!translationResult.ok) {
      return {
        ok: false,
        code: "RPC_ERROR",
        error: translationResult.error,
      };
    }
  }

  revalidateStallionList();
  revalidateStallionEdit(stallionId);
  await revalidatePublicStallionProfile(auth.supabase, stallionId);
  revalidatePublicStallionDirectory();
  return result;
}

export async function unpublishStallionAction(
  stallionId: string
): Promise<SetStallionPublishStatusResult> {
  const role = await requireRole("owner", "admin");
  if (!role.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: role.error };
  }
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false, code: "NOT_AUTHENTICATED", error: edit.error };
  }
  const auth = edit.auth;

  // Remove public copies BEFORE flipping publish_status: a stallion must
  // never appear "draft" in the DB while its photos are still reachable at
  // a stable public URL. Re-running Unpublish is safe if this fails.
  const removal = await invokeStallionPublicPhotoSync(
    auth.supabase,
    stallionId,
    "remove"
  );
  if (!removal.ok) {
    return {
      ok: false,
      code: "PHOTO_REMOVAL_FAILED",
      error: removal.error,
    };
  }
  if (removal.failed > 0) {
    return {
      ok: false,
      code: "PHOTO_REMOVAL_FAILED",
      error: `Could not confirm ${removal.failed} photo(s) were removed from public storage. Try again.`,
    };
  }

  const result = await setStallionPublishStatusWithClient(
    auth.supabase,
    stallionId,
    "draft"
  );
  if (!result.ok) {
    return result;
  }

  const translation = await fetchStallionProfileTranslationWithClient(
    auth.supabase,
    stallionId,
    "pt-BR"
  );
  if (translation) {
    await setStallionProfileTranslationPublishWithClient(
      auth.supabase,
      stallionId,
      "pt-BR",
      false
    );
  }

  revalidateStallionList();
  revalidateStallionEdit(stallionId);
  await revalidatePublicStallionProfile(auth.supabase, stallionId);
  revalidatePublicStallionDirectory();
  return result;
}

/**
 * Re-sync the public bucket for a stallion whose photos were just edited via
 * the Media Manager. Media edits happen independently of Publish/Unpublish
 * (StallionMediaManager writes stallion_images directly from the browser),
 * so an already-published stallion needs this separate hook to keep its
 * public photos current — publish/unpublish alone won't catch it.
 */
export async function syncPublishedStallionPhotosAction(
  stallionId: string
): Promise<{ ok: true; failed: number } | { ok: false; error: string }> {
  const edit = await assertCanEditStallion(stallionId);
  if (!edit.ok) {
    return { ok: false, error: edit.error };
  }
  const auth = edit.auth;

  const sync = await invokeStallionPublicPhotoSync(
    auth.supabase,
    stallionId,
    "reconcile"
  );
  if (!sync.ok) {
    return { ok: false, error: sync.error };
  }
  if (sync.failed > 0) {
    return {
      ok: false,
      error: `${sync.failed} photo(s) failed to sync to public storage.`,
    };
  }

  revalidatePublicStallionDirectory();
  await revalidatePublicStallionProfile(auth.supabase, stallionId);
  return { ok: true, failed: sync.failed };
}
