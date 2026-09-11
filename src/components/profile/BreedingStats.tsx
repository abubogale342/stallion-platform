"use client";

import type { Stallion } from "@/types/stallion";
import Section from "./Section";
import { formatCurrency } from "@/utils/common";
import StatCard from "@/components/common/StatCard";
import { useLocale, useTranslations } from "next-intl";

export default function BreedingStats({ stallion }: { stallion: Stallion }) {
  const t = useTranslations("profile.breedingStatistics");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const empty = tCommon("empty");
  const s = stallion.breeding_statistics;

  return (
    <Section
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {!s ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-[16px] leading-relaxed text-zinc-500 md:text-[17px]">
          {t("empty")}
        </div>
      ) : (
        <div className="relative">
          <div className="flex flex-col gap-3 transition-all duration-500 md:flex-row md:gap-4 [&>*]:md:min-w-0 [&>*]:md:flex-1">
            <StatCard
              variant="profile-stats"
              label={t("totalProgeny")}
              value={s.total_registered_progeny ?? empty}
            />
            <StatCard
              variant="profile-stats"
              label={t("progenyStarted")}
              value={s.progeny_started_in_competition ?? empty}
            />
            <StatCard
              variant="profile-stats"
              label={t("performanceEarners")}
              value={s.performance_earners ?? empty}
            />
            <StatCard
              variant="profile-stats"
              label={t("totalOffspringEarnings")}
              value={
                s.total_reported_offspring_earnings
                  ? formatCurrency(
                      s.total_reported_offspring_earnings.value,
                      s.total_reported_offspring_earnings.currency,
                      locale
                    )
                  : empty
              }
            />
          </div>
        </div>
      )}
    </Section>
  );
}
