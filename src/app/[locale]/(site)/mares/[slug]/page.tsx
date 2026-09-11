import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { fetchStallionByProfileSegment } from "@/services/stallion.server";
import { isUuidString } from "@/utils/common";
import { buildHorseProfileJsonLd, buildLocaleAlternates } from "@/utils/seo";
import StallionHeroSection from "@/components/profile/StallionHeroSection";
import ProfileSectionNav from "@/components/profile/ProfileSectionNav";
import OverviewBlock from "@/components/profile/OverviewBlock";
import BreedingSummaryBlock from "@/components/profile/BreedingSummaryBlock";
import MareEtSection from "@/components/profile/MareEtSection";
import PedigreeBlock from "@/components/profile/PedigreeBlock";
import PerformanceTable from "@/components/profile/PerformanceTable";
import RacingRecordSection from "@/components/profile/RacingRecordSection";
import NotableProgeny from "@/components/profile/NotableProgeny";
import FoalCropsTable from "@/components/profile/FoalCropsTable";
import HealthCard from "@/components/profile/HealthCard";
import ColourTestingSection from "@/components/profile/ColourTestingSection";
import PhotoGallery from "@/components/profile/PhotoGallery";
import OwnersServiceProvidersSection from "@/components/profile/OwnersServiceProvidersSection";
import ProfileSourceDisclaimer from "@/components/profile/ProfileSourceDisclaimer";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const SITE_NAME = "Leading Sires Registry";

/**
 * Request-memoized mare fetch so `generateMetadata` and the page component
 * share a single round-trip per request instead of fetching twice.
 */
const getMare = cache((segment: string, locale: string) =>
  fetchStallionByProfileSegment(segment, locale, "mare")
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

  let mare;
  try {
    mare = await getMare(segment, locale);
  } catch {
    mare = null;
  }

  if (!mare) {
    // Empty object → inherit the layout's default title ("Leading Sires Registry").
    return {};
  }

  const name = mare.stallion_name?.trim() || "Donor Mare";
  const breed = mare.breed_label?.trim();
  const country = mare.country_of_residence?.trim();
  const disciplines =
    mare.discipline_focus?.map((d) => d.trim()).filter(Boolean) ?? [];

  const titleSubject = breed
    ? `${breed} Donor Mare Profile`
    : "Donor Mare Profile";
  const title = `${name} — ${titleSubject}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  let description = `${name} is a ${breed ? `${breed} ` : ""}donor mare`;
  if (country) description += ` standing in ${country}`;
  if (disciplines.length > 0)
    description += `, competing in ${formatList(disciplines)}`;
  description += `. View full profile, pedigree, and ET program details on ${SITE_NAME}.`;

  const slug = (mare.slug ?? "").trim().toLowerCase() || segment;

  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, `/mares/${slug}`),
    openGraph: { title: fullTitle, description },
    twitter: { title: fullTitle, description },
  };
}

export default async function MareProfilePage({ params }: PageProps) {
  const { locale, slug: segment } = await params;
  setRequestLocale(locale);

  let mare;
  try {
    mare = await getMare(segment, locale);
  } catch (error) {
    console.error("Network Error:", error);
    return notFound();
  }

  if (!mare) {
    return notFound();
  }

  if (isUuidString(segment)) {
    const canonical = (mare.slug ?? "").trim().toLowerCase();
    const raw = segment.trim().toLowerCase();
    if (canonical && canonical !== raw) {
      permanentRedirect(getPathname({ locale, href: `/mares/${canonical}` }));
    }
  }

  const tNav = await getTranslations("nav");
  const jsonLd = buildHorseProfileJsonLd({
    name: mare.stallion_name ?? "",
    locale,
    path: `/mares/${(mare.slug ?? segment).trim().toLowerCase()}`,
    directory: { label: tNav("mareDirectory"), path: "/mares" },
    siteName: SITE_NAME,
  });

  return (
    // Donor mare profiles use the white theme (Figma 645:6410 / UX spec); stallion
    // profiles stay dark. See `.profile-light` in globals.css.
    <div className="profile-light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StallionHeroSection stallion={mare} />
      <div className="mt-20 sm:mt-24 lg:mt-28 space-y-12 sm:space-y-14 lg:space-y-16">
        <div>
          <ProfileSectionNav variant="mare" />
          <hr className="profile-tab-underline mt-3 mx-5 border-0 border-t border-line sm:mx-8 lg:mx-10" />
        </div>
        <div id="overview" className="scroll-mt-24">
          <OverviewBlock stallion={mare} />
        </div>
        <div id="pedigree" className="scroll-mt-24">
          <PedigreeBlock chart={mare.pedigree_chart} />
        </div>
        <div id="performance" className="scroll-mt-24 space-y-12 sm:space-y-14 lg:space-y-16">
          <PerformanceTable
            records={mare.performance_records || []}
            performanceSummary={mare.performance_summary ?? undefined}
          />
          <RacingRecordSection stallion={mare} />
        </div>
        <div id="notable-progeny" className="scroll-mt-24">
          <NotableProgeny stallion={mare} />
        </div>
        <div id="breeding-statistics" className="scroll-mt-24 space-y-12 sm:space-y-14 lg:space-y-16">
          <FoalCropsTable stallion={mare} />
          <BreedingSummaryBlock stallion={mare} />
        </div>
        <div id="et-program" className="scroll-mt-24">
          <MareEtSection stallion={mare} />
        </div>
        <OwnersServiceProvidersSection stallion={mare} />
        <div id="genetic-testing" className="scroll-mt-24">
          <HealthCard stallion={mare} />
        </div>
        <div id="color-testing" className="scroll-mt-24">
          <ColourTestingSection stallion={mare} />
        </div>
        <div id="media" className="scroll-mt-24">
          <PhotoGallery stallion={mare} />
        </div>
        <ProfileSourceDisclaimer />
      </div>
    </div>
  );
}
