import type { Metadata } from "next";
import FathomAnalytics from "@/components/analytics/FathomAnalytics";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { fetchCmsPublishedNav, fetchCmsSiteLayout } from "@/services/cms";
import type { CmsContentLocale } from "@/types/cms";
import { getLocale } from "next-intl/server";

// `default` is the static fallback title shown immediately in the streamed
// shell while a page's async `generateMetadata` is still resolving (Next 16
// streams metadata, so without this the tab briefly falls back to the URL).
// `template` appends the site name to page-specific titles.
export const metadata: Metadata = {
  title: {
    default: "Leading Sires Registry",
    template: "%s | Leading Sires Registry",
  },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as CmsContentLocale;
  const [nav, siteLayout] = await Promise.all([
    fetchCmsPublishedNav(),
    fetchCmsSiteLayout(locale),
  ]);

  return (
    <>
      <FathomAnalytics />
      <Navbar
        showLandingNav={nav.landing}
        showAbout={nav.about}
        showPricing={nav.pricing}
        content={siteLayout.header ?? undefined}
      />
      <main className="w-full min-h-screen">
        {children}
      </main>
      <Footer
        showLandingNav={nav.landing}
        showAbout={nav.about}
        showPricing={nav.pricing}
        content={siteLayout.footer ?? undefined}
        navLabels={siteLayout.header ?? undefined}
      />
    </>
  );
}
