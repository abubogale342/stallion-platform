import Link from "next/link";
import AddNewResearchModal from "@/components/research/AddNewResearchModal";
import { fetchResearchStallionsPage } from "@/services/research.server";
import EmptyState from "@/ui/EmptyState";
import Pagination from "@/ui/Pagination";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";

export default async function ResearchStallionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const sp = searchParams ? await searchParams : undefined;
  const currentPage = Math.max(1, Number(sp?.page ?? "1") || 1);
  const pageSize = 5;

  const result = await fetchResearchStallionsPage({
    page: currentPage,
    pageSize,
  });

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Reseach Stallions
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          List of research snippets linked to stallions.
        </p>
        </div>
        <AddNewResearchModal
          buttonLabel="Add New Research Stallion"
          title="Add New Research Stallion"
          showStallionNameInput
          showPasteArea={false}
        />
      </div>

      {result.error ? (
        <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Failed to load stallions: {result.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
        <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">Research entries</p>
        </div>

        {result.rows.length === 0 ? (
          <EmptyState variant="admin" className="rounded-none border-0 bg-transparent px-4 py-6 sm:px-6">
            No research snippets available.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {result.rows.map((row) => {
              const stallion = row.stallion;
              const stallionName =
                stallion?.stallion_name?.trim() || "Unnamed Stallion";

              return (
                <li key={row.id} className="space-y-2 px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        Associated Stallion
                      </p>
                      {stallion?.publish_status === "published" ? (
                        <a
                          href={`/stallions/${row.stallion_id}`}
                          className="inline-flex text-base font-medium text-white transition-opacity hover:opacity-80"
                        >
                          {stallionName}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-white">
                          {stallionName}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/research-stallions/${row.id}`}
                      className="text-xs font-medium uppercase tracking-wide text-sky-300/90 hover:text-sky-200"
                    >
                      Open research
                    </Link>
                  </div>
                  {row.description?.trim() || row.extracted_summary?.trim() ? (
                    <p className="text-sm leading-relaxed text-slate-400">
                      {row.description?.trim() || row.extracted_summary?.trim()}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {result.total > 0 ? (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          pageSize={result.pageSize}
          total={result.total}
          variant="admin"
          hrefPath="/dashboard/research-stallions"
        />
      ) : null}
    </div>
  );
}
