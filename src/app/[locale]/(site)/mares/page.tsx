import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MareDirectoryFilters from "@/components/stallion/MareDirectoryFilters";
import StallionDirectoryList from "@/components/stallion/StallionDirectoryList";
import { fetchStallionsPageServer } from "@/services/stallion.server";
import EmptyState from "@/ui/EmptyState";
import Pagination from "@/ui/Pagination";
import { parseDirectoryBreedFilter } from "@/utils/stallion";
import {
  parseBloodlinesFromPageSearchParams,
  serializeBloodlineConditions,
  usesLegacyKeywordAsAncestor,
} from "@/utils/bloodline-search";
import { buildLocaleAlternates } from "@/utils/seo";

type MareDirectoryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    breed?: string;
    discipline?: string;
    color?: string;
    geneticProfile?: string;
    etStatus?: string;
    embryoAvailability?: string;
    /** Repeated bloodline conditions: "name|generations|line". */
    bloodline?: string | string[];
    /** Legacy pedigree params, still honoured for shared links. */
    generation?: string;
    generationLine?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mares" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildLocaleAlternates(locale, "/mares"),
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
    },
    twitter: {
      title: t("title"),
      description: t("metaDescription"),
    },
  };
}

export default async function MareDirectoryPage({
  params,
  searchParams,
}: MareDirectoryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("mares");
  const sp = searchParams ? await searchParams : undefined;
  const keyword = sp?.q?.trim() ?? "";
  const country = sp?.country?.trim() || "All";
  const breed = parseDirectoryBreedFilter(sp?.breed);
  const discipline = sp?.discipline?.trim() || "All";
  const color = sp?.color?.trim() || "All";
  const geneticProfile = sp?.geneticProfile?.trim() || "All";
  const etStatus = sp?.etStatus?.trim() || "All";
  const embryoAvailability = sp?.embryoAvailability?.trim() || "All";
  const page = Math.max(1, Number(sp?.page ?? "1") || 1);
  const pageSize = 10;

  const bloodlines = parseBloodlinesFromPageSearchParams(sp);
  // Legacy links put the ancestor name in `q`; it filters the pedigree there,
  // not the horse's own name.
  const nameKeyword = usesLegacyKeywordAsAncestor(sp) ? "" : keyword;

  const result = await fetchStallionsPageServer({
    page,
    pageSize,
    keyword: nameKeyword,
    country,
    breed,
    discipline,
    color,
    geneticProfile,
    horseType: "mare",
    etStatus,
    embryoAvailability,
    bloodlines,
  });

  const filterProps = {
    total: result.total,
    filteredCount: result.rows.length,
  };

  return (
    // White theme, matching the donor mare profile (Figma 645:6410 / UX spec).
    <div className="profile-light flex min-h-screen flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-[327px] lg:shrink-0 lg:border-r lg:border-line lg:bg-surface">
        <div
          className="sticky top-20 flex flex-col gap-4 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded bg-surface" />
            }
          >
            <MareDirectoryFilters {...filterProps} />
          </Suspense>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-5 py-6 lg:px-9">
        {/* Page title */}
        <h1 className="profile-canvas-text text-[28px] font-semibold leading-9 tracking-[-0.28px] text-white lg:text-[40px] lg:leading-[56px] lg:tracking-[-0.4px]">
          {t("title")}
        </h1>

        {/* Mobile: collapsible filter */}
        <div className="lg:hidden">
          <Suspense
            fallback={
              <div className="h-14 animate-pulse rounded-lg bg-surface" />
            }
          >
            <MareDirectoryFilters {...filterProps} mobileCollapsible />
          </Suspense>
        </div>

        {/* Mare cards */}
        <StallionDirectoryList
          stallions={result.rows}
          searchKeyword={nameKeyword}
          bloodlineNames={bloodlines.map((condition) => condition.name)}
          hrefBase="/mares"
        />

        {result.total > 0 ? (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            pageSize={result.pageSize}
            total={result.total}
            variant="public"
            hrefPath="/mares"
            hrefSearchParams={{
              q: nameKeyword || undefined,
              country: country !== "All" ? country : undefined,
              breed: breed !== "All" ? breed : undefined,
              discipline: discipline !== "All" ? discipline : undefined,
              color: color !== "All" ? color : undefined,
              geneticProfile:
                geneticProfile !== "All" ? geneticProfile : undefined,
              etStatus: etStatus !== "All" ? etStatus : undefined,
              embryoAvailability:
                embryoAvailability !== "All" ? embryoAvailability : undefined,
              bloodline: serializeBloodlineConditions(bloodlines),
            }}
          />
        ) : null}

        {result.total === 0 ? (
          <EmptyState variant="public">{t("noResults")}</EmptyState>
        ) : null}
      </div>
    </div>
  );
}
