import DashboardReporting from "@/components/admin/dashboard/DashboardReporting";
import { requireAuthedStaff } from "@/services/dashboard-page";
import { fetchAdminDashboardStats } from "@/services/stallion.server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const auth = await requireAuthedStaff();
  if (auth.role === "data_entry") {
    redirect("/dashboard/stallions");
  }

  try {
    const stats = await fetchAdminDashboardStats();
    return <DashboardReporting stats={stats} />;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboard stats";

    return (
      <div className="w-full space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Overview
          </h1>
        </div>
        <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Failed to load dashboard reporting: {message}
        </div>
        <p className="text-sm text-slate-500">
          Ensure database migrations are applied, including{" "}
          <code className="text-slate-400">admin_dashboard_stats</code>.
        </p>
      </div>
    );
  }
}
