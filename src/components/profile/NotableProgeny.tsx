"use client";

import { useMemo } from "react";
import type { ProgenyEntry, Stallion } from "@/types/stallion";
import {
  profileSectionTitleClassName,
  profileSubheadingClassName,
  profileTableHeaderClassName,
} from "@/components/profile/sectionTitle";
import { formatCurrency } from "@/utils/common";
import StatCard from "@/components/common/StatCard";
import Button from "@/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";
import { useLocale, useTranslations } from "next-intl";

function nonEmpty(val: string | number | undefined | null): boolean {
  if (val == null) return false;
  return String(val).trim() !== "";
}

type ProgenyColDef = {
  key: string;
  label: string;
  hasData: (rec: ProgenyEntry) => boolean;
  render: (rec: ProgenyEntry) => React.ReactNode;
};

function formatAssociationEvent(rec: ProgenyEntry): string {
  const association = rec.association?.trim() ?? "";
  const event = rec.event?.trim() ?? "";
  if (association && event) return `${association} - ${event}`;
  return association || event;
}

export default function NotableProgeny({ stallion }: { stallion: Stallion }) {
  const tStats = useTranslations("profile.breedingStatistics");
  const t = useTranslations("profile.notableProgeny");
  const tColumns = useTranslations("profile.notableProgeny.columns");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const empty = tCommon("empty");
  const progeny = stallion.notable_progeny || [];
  const stats = stallion.breeding_statistics;

  const offspringEarnings = stats?.total_reported_offspring_earnings;

  const visibleRows = progeny.slice(0, 10);
  const cards: Array<{ label: string; value: React.ReactNode }> = [];

  if (stats?.total_registered_progeny != null) {
    cards.push({
      label: tStats("totalRegisteredProgeny"),
      value: stats.total_registered_progeny,
    });
  }
  if (stats?.progeny_started_in_competition != null) {
    cards.push({
      label: tStats("progenyStartedInCompetition"),
      value: stats.progeny_started_in_competition,
    });
  }
  if (stats?.performance_earners != null) {
    cards.push({
      label: tStats("performanceEarnersCard"),
      value: stats.performance_earners,
    });
  }
  if (offspringEarnings) {
    cards.push({
      label: tStats("totalReportedOffspringEarnings"),
      value: formatCurrency(
        offspringEarnings.value,
        offspringEarnings.currency,
        locale
      ),
    });
  }

  const allColumns: ProgenyColDef[] = useMemo(
    () => [
      {
        key: "name",
        label: tColumns("name"),
        hasData: (r) => nonEmpty(r.name),
        render: (r) => <span className="text-white">{r.name || empty}</span>,
      },
      {
        key: "discipline",
        label: tColumns("discipline"),
        hasData: (r) => nonEmpty(r.discipline),
        render: (r) => <>{r.discipline?.trim() || empty}</>,
      },
      {
        key: "achievement",
        label: tColumns("achievement"),
        hasData: (r) => nonEmpty(r.result),
        render: (r) => <>{r.result?.trim() || empty}</>,
      },
      {
        key: "year",
        label: tColumns("year"),
        hasData: (r) => r.year != null,
        render: (r) => <>{r.year ?? empty}</>,
      },
      {
        key: "totalEarnings",
        label: tColumns("earnings"),
        hasData: (r) => r.total_earnings != null && Number.isFinite(r.total_earnings),
        render: (r) =>
          r.total_earnings != null && Number.isFinite(r.total_earnings)
            ? <>{`$${r.total_earnings.toLocaleString()}`}</>
            : <>{empty}</>,
      },
      {
        key: "associationEvent",
        label: tColumns("associationEvent"),
        hasData: (r) => nonEmpty(r.association) || nonEmpty(r.event),
        render: (r) => <>{formatAssociationEvent(r) || empty}</>,
      },
    ],
    [tColumns, empty]
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((col) => progeny.some(col.hasData)),
    [allColumns, progeny]
  );

  if (cards.length === 0 && progeny.length === 0) return null;

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>
        {tStats("title")}
      </h2>

      {cards.length ? (
        <div className="mt-5 flex max-w-2xl flex-col gap-4 md:max-w-none md:flex-row md:gap-4 [&>*]:md:min-w-0 [&>*]:md:flex-1">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              variant="profile-gold"
              valueSize="lg"
              label={card.label}
              value={card.value}
            />
          ))}
        </div>
      ) : null}

      {progeny.length > 0 && visibleColumns.length > 0 ? (
        <>
          <h3 className={`mt-6 ${profileSubheadingClassName}`}>{t("title")}</h3>
          <div className="mt-5 overflow-hidden rounded-md border border-white/10">
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
                {visibleRows.map((p, i) => (
                  <TableRow
                    key={`${p.name}-${p.year ?? "na"}-${i}`}
                    className="border-b border-white/10 text-white/60 last:border-b-0"
                  >
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key}>{col.render(p)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      {progeny.length > 10 ? (
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="unstyled"
            size="none"
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
