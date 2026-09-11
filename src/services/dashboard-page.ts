import { requireRole, requireServerAuth } from "@/services/auth.server";
import type { AppRole } from "@/types/roles";
import { redirect } from "next/navigation";

export async function requireDashboardPage(...roles: AppRole[]) {
  const auth = await requireRole(...roles);
  if (!auth.ok) {
    if (auth.code === "NOT_AUTHENTICATED") {
      redirect("/login?next=/dashboard");
    }
    if (auth.code === "NO_PROFILE") {
      redirect("/no-access");
    }
    return { ok: false as const, forbidden: true as const };
  }
  return auth;
}

export async function requireStaffPage() {
  return requireDashboardPage("owner", "admin", "data_entry");
}

export async function requireAuthedStaff() {
  const auth = await requireServerAuth();
  if (!auth.ok) {
    if (auth.code === "NOT_AUTHENTICATED") {
      redirect("/login?next=/dashboard");
    }
    redirect("/no-access");
  }
  return auth;
}
