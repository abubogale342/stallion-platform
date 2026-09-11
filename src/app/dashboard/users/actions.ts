"use server";

import { requireRole } from "@/services/auth.server";
import { SITE_URL } from "@/utils/seo";
import { isAppRole, type AppRole } from "@/types/roles";
import { revalidatePath } from "next/cache";
import type { FunctionsError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const INVITE_ROLES: AppRole[] = ["admin", "data_entry"];

async function invokeStaffInvite(
  supabase: SupabaseClient<Database>,
  body: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "You must be signed in to send invites." };
  }

  const { data, error } = await supabase.functions.invoke("invite-staff", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return { ok: false, error: await functionInvokeError(error, data) };
  }
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message) {
      return { ok: false, error: message };
    }
  }
  return { ok: true };
}

async function functionInvokeError(
  error: FunctionsError,
  data: unknown
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
  return error.message || "Invite failed.";
}

export type StaffProfileListRow = {
  id: string;
  auth_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  created_at: string;
  invite_pending: boolean;
  revoked: boolean;
};

export async function listStaffProfiles(): Promise<
  { ok: true; rows: StaffProfileListRow[] } | { ok: false; error: string }
> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("user_profile")
    .select("id, auth_id, email, first_name, last_name, role, created_at, revoked_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const [{ data: pendingIds }, bannedRes] = await Promise.all([
    auth.supabase.rpc("staff_auth_never_signed_in"),
    auth.supabase.rpc("staff_auth_banned"),
  ]);
  const neverSignedIn = new Set(
    (Array.isArray(pendingIds) ? pendingIds : []).map((id) => String(id))
  );
  const banned = new Set(
    (Array.isArray(bannedRes.data) ? bannedRes.data : []).map((id) => String(id))
  );

  const rows = ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      if (!isAppRole(row.role)) return null;
      const authId = String(row.auth_id);
      return {
        id: String(row.id),
        auth_id: authId,
        email: String(row.email ?? ""),
        first_name: typeof row.first_name === "string" ? row.first_name : null,
        last_name: typeof row.last_name === "string" ? row.last_name : null,
        role: row.role,
        created_at: String(row.created_at ?? ""),
        invite_pending: neverSignedIn.has(authId) && !row.revoked_at && !banned.has(authId),
        revoked: Boolean(row.revoked_at) || banned.has(authId),
      };
    })
    .filter((row): row is StaffProfileListRow => row !== null);

  return { ok: true, rows };
}

export async function inviteStaffAction(form: {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const email = form.email.trim().toLowerCase();
  const role = form.role.trim();
  if (!email) return { ok: false, error: "Email is required." };
  if (!isAppRole(role) || !INVITE_ROLES.includes(role)) {
    return { ok: false, error: "Role must be admin or data_entry." };
  }

  const result = await invokeStaffInvite(auth.supabase, {
    action: "invite",
    email,
    role,
    first_name: form.first_name?.trim() || "",
    last_name: form.last_name?.trim() || "",
    redirect_to: `${SITE_URL}/auth/accept-invite`,
  });
  if (!result.ok) return result;
  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function resendStaffInviteAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await invokeStaffInvite(auth.supabase, {
    action: "resend",
    email: email.trim().toLowerCase(),
    redirect_to: `${SITE_URL}/auth/accept-invite`,
  });
  if (!result.ok) return result;
  return { ok: true };
}

export async function revokeStaffAccessAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await invokeStaffInvite(auth.supabase, {
    action: "revoke",
    email: email.trim().toLowerCase(),
  });
  if (!result.ok) return result;
  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function unbanStaffAccessAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await invokeStaffInvite(auth.supabase, {
    action: "unban",
    email: email.trim().toLowerCase(),
  });
  if (!result.ok) return result;
  revalidatePath("/dashboard/users");
  return { ok: true };
}

export type HorseAssignmentRow = {
  user_id: string;
  email: string;
  role: AppRole;
  assigned_at: string;
};

export async function listHorseAssignments(stallionId: string): Promise<
  { ok: true; rows: HorseAssignmentRow[] } | { ok: false; error: string }
> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("horse_assignments")
    .select("user_id, assigned_at")
    .eq("stallion_id", stallionId)
    .order("assigned_at", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const userIds = (data ?? [])
    .map((row) => (row as { user_id?: string }).user_id)
    .filter((id): id is string => typeof id === "string");

  if (userIds.length === 0) return { ok: true, rows: [] };

  const { data: profiles } = await auth.supabase
    .from("user_profile")
    .select("auth_id, email, role")
    .in("auth_id", userIds);

  const byId = new Map(
    ((profiles ?? []) as { auth_id: string; email: string; role: AppRole }[]).map(
      (p) => [p.auth_id, p]
    )
  );

  const rows: HorseAssignmentRow[] = ((data ?? []) as { user_id: string; assigned_at: string }[])
    .map((row) => {
      const profile = byId.get(row.user_id);
      if (!profile || !isAppRole(profile.role)) return null;
      return {
        user_id: row.user_id,
        email: profile.email,
        role: profile.role,
        assigned_at: row.assigned_at,
      };
    })
    .filter((row): row is HorseAssignmentRow => row !== null);

  return { ok: true, rows };
}

export async function assignHorseAction(
  stallionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase.from("horse_assignments").insert({
    stallion_id: stallionId,
    user_id: userId,
    assigned_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/stallions/${stallionId}/edit`);
  return { ok: true };
}

export async function unassignHorseAction(
  stallionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireRole("owner");
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("horse_assignments")
    .delete()
    .eq("stallion_id", stallionId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/stallions/${stallionId}/edit`);
  return { ok: true };
}
