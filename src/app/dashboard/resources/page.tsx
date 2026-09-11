import Link from "next/link";
import AccessDenied from "@/components/admin/AccessDenied";
import DirectoryAddButton from "@/components/admin/resources/DirectoryAddButton";
import DirectoryRowActions from "@/components/admin/resources/DirectoryRowActions";
import { requireDashboardPage } from "@/services/dashboard-page";
import {
  DIRECTORY_CONFIG,
  fetchDirectoryAdminPage,
  type DirectoryStatusFilter,
} from "@/services/directory.server";
import { DIRECTORY_KINDS, isDirectoryKind } from "@/types/directory";
import Button from "@/ui/Button";
import EmptyState from "@/ui/EmptyState";
import Input from "@/ui/Input";
import Pagination from "@/ui/Pagination";
import Select from "@/ui/Select";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: DirectoryStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
];

function isStatus(value: unknown): value is DirectoryStatusFilter {
  return value === "all" || value === "active" || value === "inactive";
}

export default async function ResourcesAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    type?: string;
    q?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const sp = searchParams ? await searchParams : undefined;
  const kind = isDirectoryKind(sp?.type) ? sp.type : "commercial";
  const search = sp?.q?.trim() ?? "";
  const status: DirectoryStatusFilter = isStatus(sp?.status) ? sp.status : "all";
  const currentPage = Math.max(1, Number(sp?.page ?? "1") || 1);
  const config = DIRECTORY_CONFIG[kind];

  const result = await fetchDirectoryAdminPage({
    kind,
    page: currentPage,
    pageSize: PAGE_SIZE,
    search,
    status,
  });

  // Carried onto pagination links so paging keeps the active tab and filters.
  const listSearchParams = {
    type: kind,
    q: search || undefined,
    status: status !== "all" ? status : undefined,
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Resources
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The two reference directories on the public Resources page. Inactive
            entries stay here but are hidden from visitors.
          </p>
        </div>
        <DirectoryAddButton
          kind={kind}
          focusLabel={config.focusLabel}
          buttonLabel={`Add ${config.singular}`}
        />
      </div>

      {/* Directory switcher */}
      <div className="flex flex-wrap gap-2">
        {DIRECTORY_KINDS.map((option) => {
          const active = option === kind;
          return (
            <Link
              key={option}
              href={`/dashboard/resources?type=${option}`}
              className={
                active
                  ? "rounded-lg border border-sky-500/25 bg-sky-950/40 px-3 py-2 text-sm font-medium text-sky-100"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
              }
            >
              {DIRECTORY_CONFIG[option].label}
            </Link>
          );
        })}
      </div>

      {/* Plain GET form: filters live in the URL, so the page stays a server
          component and the state survives a refresh. */}
      <form
        method="GET"
        action="/dashboard/resources"
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="type" value={kind} />
        <div className="min-w-[16rem] flex-1">
          <label
            htmlFor="directory-search"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Search
          </label>
          <Input
            id="directory-search"
            name="q"
            defaultValue={search}
            placeholder="Name or country"
            className="mt-1"
          />
        </div>
        <div className="w-44">
          <label
            htmlFor="directory-status"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Status
          </label>
          <Select
            id="directory-status"
            name="status"
            defaultValue={status}
            className="mt-1"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="primary" size="lg">
          Apply
        </Button>
        {search || status !== "all" ? (
          <Link
            href={`/dashboard/resources?type=${kind}`}
            className="px-2 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {result.error ? (
        <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Failed to load entries: {result.error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">{config.label}</p>
          <p className="text-xs text-slate-500">
            {result.total} {result.total === 1 ? "entry" : "entries"}
          </p>
        </div>

        {result.rows.length === 0 ? (
          <EmptyState
            variant="admin"
            className="rounded-none border-0 bg-transparent px-4 py-6 sm:px-6"
          >
            {search || status !== "all"
              ? "No entries match these filters."
              : "No entries yet."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {result.rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-medium text-white">
                      {row.name}
                    </p>
                    {row.isActive ? (
                      <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                        Active
                      </span>
                    ) : (
                      <span className="rounded border border-slate-600/40 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    {row.country}
                    {row.focus ? ` · ${row.focus}` : ""}
                  </p>
                  {row.website ? (
                    <a
                      href={row.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block break-all text-sm text-sky-300/90 hover:text-sky-200"
                    >
                      {row.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                  {row.notes ? (
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                      {row.notes}
                    </p>
                  ) : null}
                </div>
                <DirectoryRowActions
                  kind={kind}
                  focusLabel={config.focusLabel}
                  entry={row}
                />
              </li>
            ))}
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
          hrefPath="/dashboard/resources"
          hrefSearchParams={listSearchParams}
        />
      ) : null}
    </div>
  );
}
