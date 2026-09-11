import {
  COUNTRY_OWNERSHIP_FIELD_LABEL,
  COUNTRY_OWNERSHIP_HELPER_TEXT,
} from "@/utils/stallion";
import type { AdminDashboardCountryDisciplineRow } from "@/types/admin-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

export default function CountryDisciplineMatrix({
  rows,
}: {
  rows: AdminDashboardCountryDisciplineRow[];
}) {
  const countries = Array.from(new Set(rows.map((r) => r.country))).sort();
  const disciplines = Array.from(new Set(rows.map((r) => r.discipline))).sort();

  const countByKey = new Map(
    rows.map((r) => [`${r.country}\0${r.discipline}`, r.count] as const)
  );

  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
        <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">
            {COUNTRY_OWNERSHIP_FIELD_LABEL} × discipline
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {COUNTRY_OWNERSHIP_HELPER_TEXT}
          </p>
        </div>
        <p className="px-4 py-6 text-sm text-slate-500 sm:px-6">
          No stallions linked to discipline families yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/40">
      <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <p className="text-sm font-medium text-slate-300">
          {COUNTRY_OWNERSHIP_FIELD_LABEL} × discipline
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {COUNTRY_OWNERSHIP_HELPER_TEXT}
        </p>
      </div>
      <Table minWidth="min-w-full">
        <TableHead>
          <TableRow className="border-b border-slate-800/60 text-xs tracking-wide text-slate-500">
            <TableHeaderCell className="sticky left-0 z-10 bg-slate-950/95 px-4 py-2.5 font-medium normal-case sm:px-6">
              {COUNTRY_OWNERSHIP_FIELD_LABEL}
            </TableHeaderCell>
            {disciplines.map((discipline) => (
              <TableHeaderCell
                key={discipline}
                align="right"
                className="px-3 py-2.5 font-medium whitespace-nowrap"
              >
                {discipline}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody className="divide-y divide-slate-800/60">
          {countries.map((country) => (
            <TableRow key={country}>
              <TableCell className="sticky left-0 z-10 bg-slate-950/95 px-4 py-2.5 font-medium text-slate-200 sm:px-6">
                {country}
              </TableCell>
              {disciplines.map((discipline) => {
                const count =
                  countByKey.get(`${country}\0${discipline}`) ?? 0;
                return (
                  <TableCell
                    key={discipline}
                    align="right"
                    className="px-3 py-2.5 tabular-nums text-slate-400"
                  >
                    {count > 0 ? count : "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
