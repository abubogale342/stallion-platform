import "server-only";
import type { FunctionsError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type PhotoSyncAction = "reconcile" | "remove";

export type StallionPublicPhotoSyncResult =
  | { ok: true; copied: number; removed: number; failed: number }
  | { ok: false; error: string };

async function functionInvokeError(
  error: FunctionsError,
  data: unknown,
  fallback: string
): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  const context = "context" in error ? error.context : null;
  if (context && typeof Response !== "undefined" && context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) return body.error;
    } catch {
      /* ignore */
    }
  }
  return error.message || fallback;
}

export async function invokeStallionPublicPhotoSync(
  supabase: SupabaseClient<Database>,
  stallionId: string,
  action: PhotoSyncAction
): Promise<StallionPublicPhotoSyncResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "You must be signed in to sync photos." };
  }

  const { data, error } = await supabase.functions.invoke(
    "sync-stallion-public-photos",
    {
      body: { action, stallion_id: stallionId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );

  if (error) {
    return {
      ok: false,
      error: await functionInvokeError(error, data, "Public photo sync failed."),
    };
  }

  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message) {
      return { ok: false, error: message };
    }
  }

  const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    ok: true,
    copied: typeof payload.copied === "number" ? payload.copied : 0,
    removed: typeof payload.removed === "number" ? payload.removed : 0,
    failed: typeof payload.failed === "number" ? payload.failed : 0,
  };
}
