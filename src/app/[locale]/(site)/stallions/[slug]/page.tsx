import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { fetchStallionByProfileSegment } from "@/services/stallion.server"
import { getTranslations } from "next-intl/server";
import { isUuidString } from "@/utils/common";
import { buildHorseProfileJsonLd, buildLocaleAlternates } from "@/utils/seo";
import StallionHeroSection from "@/components/profile/StallionHeroSection";
import ProfileSectionNav from "@/components/profile/ProfileSectionNav";
import OverviewBlock from "@/components/profile/OverviewBlock";
import BreedingDetails from "@/components/profile/BreedingDetails";
import BreedingSummaryBlock from "@/components/profile/BreedingSummaryBlock";
import PedigreeBlock from "@/components/profile/PedigreeBlock";
import PerformanceTable from "@/components/profile/PerformanceTable";
import RacingRecordSection from "@/components/profile/RacingRecordSection";
import NotableProgeny from "@/components/profile/NotableProgeny";
import FoalCropsTable from "@/components/profile/FoalCropsTable";
import HealthCard from "@/components/profile/HealthCard";
import ColourTestingSection from "@/components/profile/ColourTestingSection";
import PhotoGallery from "@/components/profile/PhotoGallery";
import OwnersServiceProvidersSection from "@/components/profile/OwnersServiceProvidersSection";
import BreedingIncentivesSection from "@/components/profile/BreedingIncentivesSection";
import ProfileSourceDisclaimer from "@/components/profile/ProfileSourceDisclaimer";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const SITE_NAME = "Leading Sires Registry";

/**
 * Request-memoized stallion fetch so `generateMetadata` and the page component
 * share a single round-trip per request instead of fetching twice.
 */
const getStallion = cache((segment: string, locale: string) =>
  fetchStallionByProfileSegment(segment, locale)
);

/** Join a list with commas and an Oxford "and" — e.g. ["A","B","C"] → "A, B, and C". */
function formatList(items: string[]): string {
  const parts = items.map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug: segment } = await params;

  let stallion;
  try {
    stallion = await getStallion(segment, locale);
  } catch {
    stallion = null;
  }

  if (!stallion) {
    // Empty object → inherit the layout's default title ("Leading Sires Registry").
    return {};
  }

  const name = stallion.stallion_name?.trim() || "Stallion";
  const breed = stallion.breed_label?.trim();
  const country = stallion.country_of_residence?.trim();
  const disciplines = stallion.discipline_focus
    ?.map((d) => d.trim())
    .filter(Boolean) ?? [];

  // Page-specific title; the layout's `title.template` appends " | Leading Sires Registry",
  // e.g. "Amaroo Bet Hes A Blueboon — Quarter Horse Stallion Profile | Leading Sires Registry".
  const titleSubject = breed ? `${breed} Stallion Profile` : "Stallion Profile";
  const title = `${name} — ${titleSubject}`;
  // Open Graph / Twitter titles don't inherit the template, so spell out the full title.
  const fullTitle = `${title} | ${SITE_NAME}`;

  // Description — e.g. "Amaroo Bet Hes A Blueboon is a Quarter Horse stallion standing in
  // Australia, competing in Cow Horse, Ranch, and Campdrafting. View full profile, pedigree,
  // and breeding details on Leading Sires Registry."
  let description = `${name} is a ${breed ? `${breed} ` : ""}stallion`;
  if (country) description += ` standing in ${country}`;
  if (disciplines.length > 0)
    description += `, competing in ${formatList(disciplines)}`;
  description += `. View full profile, pedigree, and breeding details on ${SITE_NAME}.`;

  const canonicalSlug = (stallion.slug ?? "").trim().toLowerCase() || segment;

  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, `/stallions/${canonicalSlug}`),
    openGraph: { title: fullTitle, description },
    twitter: { title: fullTitle, description },
  };
}

export default async function StallionProfilePage({ params }: PageProps) {
  const { locale, slug: segment } = await params;
  setRequestLocale(locale);

  let stallion;
  try {
    stallion = await getStallion(segment, locale);
  } catch (error) {
    console.error("Network Error:", error);
    return notFound();
  }

  if (!stallion) {
    return notFound();
  }

  if (isUuidString(segment)) {
    const canonical = (stallion.slug ?? "").trim().toLowerCase();
    const raw = segment.trim().toLowerCase();
    if (canonical && canonical !== raw) {
      permanentRedirect(
        getPathname({ locale, href: `/stallions/${canonical}` })
      );
    }
  }

  const tNav = await getTranslations("nav");
  const jsonLd = buildHorseProfileJsonLd({
    name: stallion.stallion_name ?? "",
    locale,
    path: `/stallions/${(stallion.slug ?? segment).trim().toLowerCase()}`,
    directory: { label: tNav("stallionDirectory"), path: "/stallions" },
    siteName: SITE_NAME,
  });

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StallionHeroSection stallion={stallion} />
      <div className="mt-20 sm:mt-24 lg:mt-28 space-y-12 sm:space-y-14 lg:space-y-16">
        <div>
          <ProfileSectionNav />
          <hr className="mt-3 mx-5 border-0 border-t border-line sm:mx-8 lg:mx-10" />
        </div>
        <div id="overview" className="scroll-mt-24">
          <OverviewBlock stallion={stallion} />
        </div>
        <div id="pedigree" className="scroll-mt-24">
          <PedigreeBlock chart={stallion.pedigree_chart} />
        </div>
        <div id="performance" className="scroll-mt-24 space-y-12 sm:space-y-14 lg:space-y-16">
          <PerformanceTable
            records={stallion.performance_records || []}
            performanceSummary={stallion.performance_summary ?? undefined}
          />
          <RacingRecordSection stallion={stallion} />
        </div>
        <div id="notable-progeny" className="scroll-mt-24">
          <NotableProgeny stallion={stallion} />
        </div>
        <div id="breeding-statistics" className="scroll-mt-24 space-y-12 sm:space-y-14 lg:space-y-16">
          <FoalCropsTable stallion={stallion} />
          <BreedingSummaryBlock stallion={stallion} />
          <BreedingDetails stallion={stallion} />
        </div>
        <OwnersServiceProvidersSection stallion={stallion} />
        <BreedingIncentivesSection />
        <div id="genetic-testing" className="scroll-mt-24">
          <HealthCard stallion={stallion} />
        </div>
        <div id="color-testing" className="scroll-mt-24">
          <ColourTestingSection stallion={stallion} />
        </div>
        <div id="media" className="scroll-mt-24">
          <PhotoGallery stallion={stallion} />
        </div>
        <ProfileSourceDisclaimer />
      </div>
    </div>
  );
}
