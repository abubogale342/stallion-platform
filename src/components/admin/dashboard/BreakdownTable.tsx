import type { AdminDashboardBreakdownRow } from "@/types/admin-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

export default function BreakdownTable({
  title,
  description,
  labelColumnHeader = "Label",
  rows,
  emptyMessage,
}: {
  title: string;
  description?: string;
  labelColumnHeader?: string;
  rows: AdminDashboardBreakdownRow[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
      <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500 sm:px-6">{emptyMessage}</p>
      ) : (
        <Table minWidth="min-w-full">
          <TableHead>
            <TableRow className="border-b border-slate-800/60 text-xs tracking-wide text-slate-500">
              <TableHeaderCell className="px-4 py-2.5 font-medium sm:px-6">
                {labelColumnHeader}
              </TableHeaderCell>
              <TableHeaderCell align="right" className="px-4 py-2.5 font-medium sm:px-6">
                Count
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-slate-800/60">
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="px-4 py-2.5 text-slate-200 sm:px-6">
                  {row.label}
                </TableCell>
                <TableCell
                  align="right"
                  className="px-4 py-2.5 tabular-nums text-slate-300 sm:px-6"
                >
                  {row.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
