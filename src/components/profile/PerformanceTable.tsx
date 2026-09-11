"use client";

import type { PerformanceEntry } from "@/types/stallion";
import {
  profileSectionTitleClassName,
  profileTableHeaderClassName,
} from "@/components/profile/sectionTitle";
import Button from "@/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ColDef = {
  key: string;
  label: string;
  hasData: (rec: PerformanceEntry) => boolean;
  render: (rec: PerformanceEntry) => React.ReactNode;
  highlight?: boolean;
};

function formatEarnings(rec: PerformanceEntry): string {
  if (rec.level_earnings?.value != null) {
    const amount = Number(rec.level_earnings.value);
    if (!Number.isNaN(amount)) {
      const currency = rec.level_earnings.currency || "";
      return `${currency} ${amount.toLocaleString()}`.trim();
    }
  }
  return rec.earnings?.trim() || "";
}

function nonEmpty(val: string | number | undefined | null): boolean {
  if (val == null) return false;
  return String(val).trim() !== "";
}

export default function PerformanceSection({
  records,
  performanceSummary,
}: {
  records?: PerformanceEntry[];
  performanceSummary?: string;
}) {
  const t = useTranslations("profile.performance");
  const tColumns = useTranslations("profile.performance.columns");
  const tCommon = useTranslations("common");
  const empty = tCommon("empty");
  const [showAll, setShowAll] = useState(false);
  const overview = performanceSummary?.trim();
  const rows = useMemo(() => records ?? [], [records]);
  const visibleRows = showAll ? rows : rows.slice(0, 4);
  const canShowMore = rows.length > 4 && !showAll;

  const allColumns: ColDef[] = useMemo(
    () => [
      {
        key: "event",
        label: tColumns("event"),
        hasData: (r) => nonEmpty(r.event),
        render: (r) => (
          <span className="text-white">{r.event?.trim() || empty}</span>
        ),
        highlight: true,
      },
      {
        key: "year",
        label: tColumns("year"),
        hasData: (r) => r.year != null,
        render: (r) => <>{r.year ?? empty}</>,
      },
      {
        key: "month",
        label: tColumns("month"),
        hasData: (r) => nonEmpty(r.month),
        render: (r) => <>{r.month?.trim() || empty}</>,
      },
      {
        key: "discipline",
        label: tColumns("discipline"),
        hasData: (r) => nonEmpty(r.discipline),
        render: (r) => <>{r.discipline?.trim() || empty}</>,
      },
      {
        key: "class",
        label: tColumns("class"),
        hasData: (r) => nonEmpty(r.performance_class),
        render: (r) => <>{r.performance_class?.trim() || empty}</>,
      },
      {
        key: "achievement",
        label: tColumns("achievement"),
        hasData: (r) => nonEmpty(r.result),
        render: (r) => {
          const v = r.result?.trim();
          if (!v) return <>{empty}</>;
          return (
            <span className="inline-flex rounded-sm border border-[#6a5532] bg-[#2d2316] px-2 py-0.5 text-[12px] text-[#d3b179]">
              {v}
            </span>
          );
        },
      },
      {
        key: "score",
        label: tColumns("score"),
        hasData: (r) => r.score != null && String(r.score).trim() !== "",
        render: (r) => <>{r.score != null ? String(r.score) : empty}</>,
      },
      {
        key: "association",
        label: tColumns("association"),
        hasData: (r) => nonEmpty(r.association),
        render: (r) => <>{r.association?.trim() || empty}</>,
      },
      {
        key: "level",
        label: tColumns("level"),
        hasData: (r) => nonEmpty(r.level),
        render: (r) => <>{r.level?.trim() || empty}</>,
      },
      {
        key: "earnings",
        label: tColumns("earnings"),
        hasData: (r) => formatEarnings(r) !== "",
        render: (r) => <>{formatEarnings(r) || empty}</>,
      },
    ],
    [tColumns, empty]
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((col) => rows.some(col.hasData)),
    [allColumns, rows]
  );

  if (!overview && rows.length === 0) {
    return null;
  }

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>
        {t("title")}
      </h2>

      {overview ? (
        <p className="profile-canvas-body mt-4 whitespace-pre-line text-[16px] leading-[28px] text-zinc-300">
          {overview}
        </p>
      ) : null}

      {rows.length > 0 && visibleColumns.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-t-0 border-white/10">
          <Table minWidth="" className="bg-black text-base">
            <TableHead className="bg-surface">
              <TableRow
                className={`border-b border-white/10 ${profileTableHeaderClassName}`}
              >
                {visibleColumns.map((col) => (
                  <TableHeaderCell key={col.key} className="py-5 font-medium">
                    {col.label}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((rec, idx) => (
                <TableRow
                  key={`${rec.event}-${rec.performance_class}-${rec.result}-${idx}`}
                  className="border-b border-white/10 text-white/60 last:border-b-0"
                >
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>{col.render(rec)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {canShowMore ? (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="unstyled"
            size="none"
            onClick={() => setShowAll(true)}
            className="gap-3 rounded-sm border border-white/20 px-4 py-2 text-[14px] text-zinc-200 hover:bg-white/5"
          >
            {t("showMore")}
            <span className="text-lg leading-none">+</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
