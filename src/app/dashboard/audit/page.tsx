import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";
import { auditTableLabel, formatAuditAction } from "@/utils/audit-log";
import Pagination from "@/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

type AuditRow = {
  id: string;
  occurred_at: string;
  actor_email: string | null;
  action: string;
  stallion_name: string | null;
  stallion_id: string | null;
  table_name: string;
  summary: string | null;
  changes: unknown;
};

const AUDIT_PAGE_SIZE = 5;

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<{
    email?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const gate = await requireDashboardPage("owner");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const sp = searchParams ? await searchParams : undefined;
  const email = sp?.email?.trim() ?? "";
  const q = sp?.q?.trim() ?? "";
  const from = sp?.from?.trim() ?? "";
  const to = sp?.to?.trim() ?? "";
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const fromIndex = (page - 1) * AUDIT_PAGE_SIZE;
  const toIndex = fromIndex + AUDIT_PAGE_SIZE - 1;

  let query = gate.supabase
    .from("admin_audit_log")
    .select(
      "id, occurred_at, actor_email, action, stallion_name, stallion_id, table_name, summary, changes",
      { count: "exact" }
    )
    .order("occurred_at", { ascending: false });

  if (email) query = query.ilike("actor_email", `%${email}%`);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", `${to}T23:59:59.999Z`);
  if (q) {
    if (/^[0-9a-f-]{36}$/i.test(q)) {
      query = query.or(`stallion_name.ilike.%${q}%,stallion_id.eq.${q}`);
    } else {
      query = query.ilike("stallion_name", `%${q}%`);
    }
  }

  const { data, error, count } = await query.range(fromIndex, toIndex);
  const rows = (data ?? []) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
          Owner
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Audit log
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Read-only history of horse and related record changes.
        </p>
      </div>

      <form className="flex flex-wrap gap-3 rounded-xl border border-slate-800/90 bg-slate-950/50 p-4">
        <input
          name="email"
          defaultValue={email}
          placeholder="User email"
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <input
          name="q"
          defaultValue={q}
          placeholder="Stallion name or id"
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <button
          type="submit"
          className="rounded border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-sm text-sky-100"
        >
          Filter
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-300">{error.message}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
          <Table minWidth="min-w-[52rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>When</TableHeaderCell>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Horse</TableHeaderCell>
                <TableHeaderCell>Table</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-slate-800/60">
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-slate-500">
                    No audit events match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const action = formatAuditAction(row);
                  return (
                    <TableRow key={row.id} className="text-slate-300">
                      <TableCell className="text-xs text-slate-500">
                        {new Date(row.occurred_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.actor_email ?? "—"}</TableCell>
                      <TableCell>
                        <span className="text-slate-200">{action.headline}</span>
                        {action.detail ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {action.detail}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.stallion_name ?? "—"}
                        {row.stallion_id ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-slate-600">
                            {row.stallion_id}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {auditTableLabel(row.table_name)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!error && total > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={AUDIT_PAGE_SIZE}
          total={total}
          variant="admin"
          hrefPath="/dashboard/audit"
          hrefSearchParams={{
            email: email || undefined,
            q: q || undefined,
            from: from || undefined,
            to: to || undefined,
          }}
        />
      ) : null}
    </div>
  );
}
