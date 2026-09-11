import Link from "next/link";
import { Suspense } from "react";
import AddStallionModal from "@/components/admin/stallions/AddStallionModal";
import ManageStallionsTable from "@/components/admin/stallions/ManageStallionsTable";
import AccessDenied from "@/components/admin/AccessDenied";
import { fetchAdminStallionsList } from "@/services/stallion.server";
import { requireStaffPage } from "@/services/dashboard-page";
import {
  parseAdminStallionsStatusFilter,
  parseAdminStallionsTypeFilter,
} from "@/components/admin/stallions/stallions-list-url";

export default async function ManageStallionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  const gate = await requireStaffPage();
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const sp = searchParams ? await searchParams : undefined;
  const q = sp?.q?.trim() ?? "";
  const status = parseAdminStallionsStatusFilter(sp?.status);
  const horseType = parseAdminStallionsTypeFilter(sp?.type);
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);

  let result;
  let errorMessage: string | null = null;

  try {
    result = await fetchAdminStallionsList({ q, status, horseType, page });
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : "Failed to load stallions";
    result = {
      rows: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Manage Horses
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Directory of stallion and donor mare records from the registry database.
            {result.total > 0 ? (
              <span className="ml-1 text-slate-400">
                ({result.total} total)
              </span>
            ) : null}
          </p>
        </div>
        <AddStallionModal />
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
        <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">Directory entries</p>
        </div>

        <Suspense
          fallback={
            <div className="border-b border-slate-800/80 px-4 py-4 sm:px-6">
              <div className="h-10 animate-pulse rounded-lg bg-slate-800/60" />
            </div>
          }
        >
          <ManageStallionsTable
            rows={result.rows}
            defaultQ={q}
            defaultStatus={status}
            defaultType={horseType}
            page={result.page}
            pageSize={result.pageSize}
            totalPages={result.totalPages}
            total={result.total}
            errorMessage={errorMessage}
          />
        </Suspense>
      </div>

      <p className="text-sm">
        <Link
          href="/stallions"
          className="text-sky-400/90 hover:text-sky-300 hover:underline"
        >
          View public directory →
        </Link>
        {gate.role !== "data_entry" ? (
          <>
            <span className="mx-2 text-slate-600">·</span>
            <Link
              href="/dashboard"
              className="text-slate-500 hover:text-slate-300 hover:underline"
            >
              Overview
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
