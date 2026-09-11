import Link from "next/link";
import {
  COUNTRY_OWNERSHIP_FIELD_LABEL,
  COUNTRY_OWNERSHIP_HELPER_TEXT,
} from "@/utils/stallion";
import type { AdminDashboardStats } from "@/types/admin-dashboard";
import BreakdownTable from "./BreakdownTable";
import CountryDisciplineMatrix from "./CountryDisciplineMatrix";
import DashboardStatCard from "./DashboardStatCard";
import PublishStatusSummary from "./PublishStatusSummary";

export default function DashboardReporting({
  stats,
}: {
  stats: AdminDashboardStats;
}) {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Overview
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Registry summary across stallions, disciplines, research, images, and
          genetic testing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardStatCard
          label="Total stallions"
          value={stats.totals.stallions}
        />
        <DashboardStatCard
          label="Published"
          value={stats.byPublishStatus.published}
        />
        <DashboardStatCard
          label="Draft"
          value={stats.byPublishStatus.draft}
        />
        <DashboardStatCard
          label="Review"
          value={stats.review.stallionResearches}
          hint="Stallion research snippets"
          href="/dashboard/research-stallions"
        />
        <DashboardStatCard
          label="With any image"
          value={stats.photos.withImage}
          hint="Any stallion_images row with filename"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          label="Without image"
          value={stats.photos.withoutImage}
        />
        <DashboardStatCard
          label="With genetic tests"
          value={stats.geneticTesting.withResults}
        />
        <DashboardStatCard
          label="Without genetic tests"
          value={stats.geneticTesting.withoutResults}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PublishStatusSummary
          published={stats.byPublishStatus.published}
          draft={stats.byPublishStatus.draft}
        />
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Quick links
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/pages"
              className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-950/50"
            >
              Manage Pages
            </Link>
            <Link
              href="/dashboard/stallions"
              className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-950/50"
            >
              Manage Horses
            </Link>
            <Link
              href="/dashboard/research-stallions"
              className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-950/50"
            >
              Research Stallions
            </Link>
            <Link
              href="/stallions"
              className="rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Public directory
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title={`By ${COUNTRY_OWNERSHIP_FIELD_LABEL.toLowerCase()}`}
          description={COUNTRY_OWNERSHIP_HELPER_TEXT}
          labelColumnHeader={COUNTRY_OWNERSHIP_FIELD_LABEL}
          rows={stats.byCountry}
          emptyMessage="No stallions with a country of ownership recorded."
        />
        <BreakdownTable
          title="By discipline"
          rows={stats.byDiscipline}
          emptyMessage="No stallions linked to discipline families."
        />
      </div>

      <CountryDisciplineMatrix rows={stats.countryDiscipline} />
    </div>
  );
}
