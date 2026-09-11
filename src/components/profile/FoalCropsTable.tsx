"use client";

import type { Stallion } from "@/types/stallion";
import { profileSectionTitleWhiteClassName } from "@/components/profile/sectionTitle";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatCard from "@/components/common/StatCard";
import { useTranslations } from "next-intl";

export default function FoalCropsTable({ stallion }: { stallion: Stallion }) {
  const t = useTranslations("profile.foalCrop");
  const rows = (stallion.foal_crops ?? [])
    .slice()
    .sort((a, b) => a.foal_crop_year - b.foal_crop_year);
  const chartRows = rows.map((r) => ({
    year: String(r.foal_crop_year),
    foals: r.number_of_foals ?? 0,
  }));
  const totalFoals = rows.reduce((sum, r) => sum + (r.number_of_foals ?? 0), 0);
  const totalYears = rows.length;

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleWhiteClassName}>
        {t("title")}
      </h2>

      <div className="mt-5 flex max-w-2xl flex-col gap-4 md:max-w-none md:flex-row md:gap-4 [&>*]:md:min-w-0 [&>*]:md:flex-1">
        <StatCard
          variant="profile-gold"
          valueSize="lg"
          label={t("totalFoals")}
          value={totalFoals}
        />
        <StatCard
          variant="profile-gold"
          valueSize="lg"
          label={t("totalYears")}
          value={totalYears}
        />
      </div>

      <div
        className={`mt-5 rounded-md border border-white/10 bg-surface p-4 md:p-5 ${
          rows.length < 10 ? "lg:w-1/2" : ""
        }`}
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              margin={{ top: 12, right: 10, left: 18, bottom: 8 }}
              barCategoryGap="12%"
            >
              <CartesianGrid stroke="#2b2f35" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: "#8f949b", fontSize: 12 }}
                axisLine={{ stroke: "#2b2f35" }}
                tickLine={{ stroke: "#2b2f35" }}
              />
              <YAxis
                width={48}
                tick={{ fill: "#8f949b", fontSize: 12 }}
                axisLine={{ stroke: "#2b2f35" }}
                tickLine={{ stroke: "#2b2f35" }}
                label={{
                  value: t("chartAxis"),
                  angle: -90,
                  position: "insideLeft",
                  fill: "#a4aab3",
                  offset: -2,
                }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#efefef",
                  color: "#111",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [String(value ?? "0"), t("tooltipFoals")]}
                labelFormatter={(label) => t("tooltipYear", { year: label })}
              />
              <Bar dataKey="foals" fill="#303338" radius={[4, 4, 0, 0]} barSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
