import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildLocaleAlternates } from "@/utils/seo";
import StallionDirectoryFilters from "@/components/stallion/StallionDirectoryFilters";
import StallionDirectoryList from "@/components/stallion/StallionDirectoryList";
import { fetchStallionsPageServer } from "@/services/stallion.server";
import EmptyState from "@/ui/EmptyState";
import Pagination from "@/ui/Pagination";
import {
  parseDirectoryAvailabilityFilter,
  parseDirectoryBreedFilter,
} from "@/utils/stallion";
import {
  parseBloodlinesFromPageSearchParams,
  serializeBloodlineConditions,
  usesLegacyKeywordAsAncestor,
} from "@/utils/bloodline-search";

type StallionDirectoryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    breed?: string;
    availability?: string;
    color?: string;
    geneticProfile?: string;
    discipline?: string;
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
  const t = await getTranslations({ locale, namespace: "stallions" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildLocaleAlternates(locale, "/stallions"),
    openGraph: { title: t("title"), description: t("metaDescription") },
    twitter: { title: t("title"), description: t("metaDescription") },
  };
}

export default async function StallionDirectoryPage({
  params,
  searchParams,
}: StallionDirectoryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("stallions");
  const sp = searchParams ? await searchParams : undefined;
  const keyword = sp?.q?.trim() ?? "";
  const country = sp?.country?.trim() || "All";
  const breed = parseDirectoryBreedFilter(sp?.breed);
  const availability = parseDirectoryAvailabilityFilter(sp?.availability);
  const color = sp?.color?.trim() || "All";
  const geneticProfile = sp?.geneticProfile?.trim() || "All";
  const discipline = sp?.discipline?.trim() || "All";
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
    availability,
    color,
    geneticProfile,
    discipline,
    bloodlines,
  });

  const filterProps = {
    total: result.total,
    filteredCount: result.rows.length,
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-[327px] lg:shrink-0 lg:border-r lg:border-[#262626] lg:bg-[#121212]">
        <div
          className="sticky top-20 flex flex-col gap-4 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded bg-zinc-900" />
            }
          >
            <StallionDirectoryFilters {...filterProps} />
          </Suspense>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-5 py-6 lg:px-9">
        {/* Page title */}
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-white lg:text-[40px] lg:leading-[56px] lg:tracking-[-0.4px]">
          {t("title")}
        </h1>

        {/* Mobile: collapsible filter */}
        <div className="lg:hidden">
          <Suspense
            fallback={
              <div className="h-14 animate-pulse rounded-lg bg-[#121212]" />
            }
          >
            <StallionDirectoryFilters {...filterProps} mobileCollapsible />
          </Suspense>
        </div>

        {/* Stallion cards */}
        <StallionDirectoryList
          stallions={result.rows}
          searchKeyword={nameKeyword}
          bloodlineNames={bloodlines.map((condition) => condition.name)}
        />

        {result.total > 0 ? (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            pageSize={result.pageSize}
            total={result.total}
            variant="public"
            hrefPath="/stallions"
            hrefSearchParams={{
              q: nameKeyword || undefined,
              country: country !== "All" ? country : undefined,
              breed: breed !== "All" ? breed : undefined,
              availability: availability !== "All" ? availability : undefined,
              color: color !== "All" ? color : undefined,
              geneticProfile: geneticProfile !== "All" ? geneticProfile : undefined,
              discipline: discipline !== "All" ? discipline : undefined,
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
