import "server-only";

import { createServerClient } from "@/services/supabase.server";
import { isAppRole, type AppRole, type UserProfileRow } from "@/types/roles";
import type { User } from "@supabase/supabase-js";

export type AuthedDashboard =
  | {
      ok: true;
      user: User;
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      role: AppRole;
      profile: UserProfileRow;
    }
  | {
      ok: false;
      error: string;
      code: "NOT_AUTHENTICATED" | "NO_PROFILE";
      user?: User;
      supabase?: Awaited<ReturnType<typeof createServerClient>>;
    };

async function loadProfile(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("id, auth_id, email, first_name, last_name, role, isAdmin, revoked_at")
    .eq("auth_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (row.revoked_at) return null;
  if (!isAppRole(row.role)) return null;

  return {
    id: String(row.id),
    auth_id: String(row.auth_id),
    email: String(row.email ?? ""),
    first_name: typeof row.first_name === "string" ? row.first_name : null,
    last_name: typeof row.last_name === "string" ? row.last_name : null,
    role: row.role,
    isAdmin: row.isAdmin === true || row.role === "owner" || row.role === "admin",
  };
}

export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireServerAuth(): Promise<AuthedDashboard> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "You must be signed in.",
      code: "NOT_AUTHENTICATED",
    };
  }

  const profile = await loadProfile(supabase, user.id);
  if (!profile) {
    return {
      ok: false,
      error: "Your account is not assigned a dashboard role.",
      code: "NO_PROFILE",
      user,
      supabase,
    };
  }

  return { ok: true, user, supabase, role: profile.role, profile };
}

export async function requireRole(
  ...roles: AppRole[]
): Promise<
  | AuthedDashboard
  | { ok: false; error: string; code: "NOT_AUTHENTICATED" | "NO_PROFILE" | "FORBIDDEN" }
> {
  const auth = await requireServerAuth();
  if (!auth.ok) return auth;
  if (!roles.includes(auth.role)) {
    return {
      ok: false,
      error: "You do not have permission to do that.",
      code: "FORBIDDEN",
    };
  }
  return auth;
}

export async function assertCanEditStallion(
  stallionId: string
): Promise<
  | { ok: true; auth: Extract<AuthedDashboard, { ok: true }> }
  | { ok: false; error: string; code: "NOT_AUTHENTICATED" | "NO_PROFILE" | "FORBIDDEN" }
> {
  const auth = await requireServerAuth();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase.rpc("can_edit_stallion", {
    p_id: stallionId,
  });

  if (error || data !== true) {
    return {
      ok: false,
      error: "You cannot edit this horse.",
      code: "FORBIDDEN",
    };
  }

  return { ok: true, auth };
}

export async function stallionPermissionFlags(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  stallionId: string
): Promise<{ canEdit: boolean; canDeleteChildren: boolean }> {
  const [editRes, deleteRes] = await Promise.all([
    supabase.rpc("can_edit_stallion", { p_id: stallionId }),
    supabase.rpc("can_delete_stallion_children", { p_id: stallionId }),
  ]);

  return {
    canEdit: editRes.data === true,
    canDeleteChildren: deleteRes.data === true,
  };
}
