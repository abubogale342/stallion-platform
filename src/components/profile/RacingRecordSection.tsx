"use client";

import { useMemo, useState } from "react";
import type {
  RacingRecordEntry,
  Stallion,
} from "@/types/stallion";
import {
  profileSectionTitleClassName,
  profileStatLabelClassName,
  profileTableHeaderClassName,
} from "@/components/profile/sectionTitle";
import Button from "@/ui/Button";
import { formatStudFeeAmount } from "@/utils/stallion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";
import { useTranslations } from "next-intl";

const VISIBLE_ROW_LIMIT = 4;

function nonEmpty(val: string | number | undefined | null): boolean {
  if (val == null) return false;
  return String(val).trim() !== "";
}

function formatRacingEarnings(entry: RacingRecordEntry): string {
  if (!entry.earnings) return "";
  const { value, currency } = entry.earnings;
  if (!Number.isFinite(value)) return "";
  return `${currency} ${value.toLocaleString()}`.trim();
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d7a81e] bg-[#f6cb4a] text-[11px] font-semibold text-black">
        1
      </span>
    );
  }
  if (position === 2) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#868b94] bg-[#a2a6ad] text-[11px] font-semibold text-black">
        2
      </span>
    );
  }
  if (position === 3) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#ab6723] bg-[#d1893b] text-[11px] font-semibold text-black">
        3
      </span>
    );
  }
  return <span className="text-white/60">{position}</span>;
}

type RacingColDef = {
  key: string;
  label: string;
  hasData: (rec: RacingRecordEntry) => boolean;
  render: (rec: RacingRecordEntry) => React.ReactNode;
};

export default function RacingRecordSection({
  stallion,
}: {
  stallion: Stallion;
}) {
  const t = useTranslations("profile.racingRecord");
  const tSummary = useTranslations("profile.racingRecord.summary");
  const tColumns = useTranslations("profile.racingRecord.columns");
  const tCommon = useTranslations("common");
  const empty = tCommon("empty");
  const [showAll, setShowAll] = useState(false);
  const summary = stallion.racing_summary;
  const records = useMemo(
    () => stallion.racing_records ?? [],
    [stallion.racing_records]
  );

  const formatNumber = (value: number | undefined): string => {
    if (value == null || !Number.isFinite(value)) return empty;
    return value.toLocaleString();
  };

  const careerEarnings = summary?.career_earnings;
  const cards: { label: string; display: string }[] = [];

  if (careerEarnings && Number.isFinite(careerEarnings.value)) {
    cards.push({
      label: tSummary("careerEarnings"),
      // Match the earnings format used by the racing table below (e.g. "AUD 12,400").
      display: `${careerEarnings.currency ?? ""} ${formatStudFeeAmount(careerEarnings.value)}`.trim(),
    });
  }
  for (const [label, value] of [
    [tSummary("starts"), summary?.career_starts],
    [tSummary("firsts"), summary?.career_firsts],
    [tSummary("seconds"), summary?.career_seconds],
    [tSummary("thirds"), summary?.career_thirds],
    [tSummary("speedIndex"), summary?.highest_rating],
  ] as [string, number | undefined][]) {
    if (value != null && Number.isFinite(value)) {
      cards.push({ label, display: formatNumber(value) });
    }
  }
  const hasSummary = cards.length > 0;

  const allColumns: RacingColDef[] = useMemo(
    () => [
      {
        key: "race",
        label: tColumns("race"),
        hasData: (r) => nonEmpty(r.race_name),
        render: (r) => (
          <span className="text-white">{r.race_name?.trim() || empty}</span>
        ),
      },
      {
        key: "year",
        label: tColumns("year"),
        hasData: (r) => r.year != null,
        render: (r) => <>{r.year ?? empty}</>,
      },
      {
        key: "track",
        label: tColumns("track"),
        hasData: (r) => nonEmpty(r.track),
        render: (r) => <>{r.track?.trim() || empty}</>,
      },
      {
        key: "distance",
        label: tColumns("distance"),
        hasData: (r) => nonEmpty(r.distance),
        render: (r) => <>{r.distance?.trim() || empty}</>,
      },
      {
        key: "position",
        label: tColumns("position"),
        hasData: (r) => r.finish_position != null,
        render: (r) =>
          r.finish_position != null ? (
            <PositionBadge position={r.finish_position} />
          ) : (
            <>{empty}</>
          ),
      },
      {
        key: "speedIndex",
        label: tColumns("speedIndex"),
        hasData: (r) => r.speed_index != null,
        render: (r) => <>{r.speed_index != null ? r.speed_index : empty}</>,
      },
      {
        key: "earnings",
        label: tColumns("earnings"),
        hasData: (r) => formatRacingEarnings(r) !== "",
        render: (r) => <>{formatRacingEarnings(r) || empty}</>,
      },
    ],
    [tColumns, empty]
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((col) => records.some(col.hasData)),
    [allColumns, records]
  );

  if (!hasSummary && records.length === 0) {
    return null;
  }

  const visibleRecords = showAll
    ? records
    : records.slice(0, VISIBLE_ROW_LIMIT);
  const canShowMore = records.length > VISIBLE_ROW_LIMIT && !showAll;

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>
        {t("title")}
      </h2>

      {hasSummary ? (
        <div
          className={`mt-5 grid gap-4 ${
            cards.length === 1
              ? "md:grid-cols-1"
              : cards.length === 2
                ? "md:grid-cols-2"
                : cards.length === 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-4"
          }`}
        >
          {cards.map((item) => (
            <div
              key={item.label}
              className="rounded border border-white/10 bg-surface px-5 py-4 text-center"
            >
              <p className={profileStatLabelClassName}>{item.label}</p>
              <p className="mt-2 text-[34px] font-medium leading-none text-gold">
                {item.display}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {records.length > 0 && visibleColumns.length > 0 ? (
        <>
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
                {visibleRecords.map((rec, idx) => (
                  <TableRow
                    key={`${rec.race_name ?? "race"}-${rec.race_date ?? ""}-${idx}`}
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
        </>
      ) : null}
    </section>
  );
}
