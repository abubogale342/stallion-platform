import CmsRenderer from "@/components/cms/CmsRenderer";
import { fetchCmsPage, generateCmsPageMetadata } from "@/services/cms";
import type { CmsContentLocale } from "@/types/cms";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function toCmsLocale(locale: string): CmsContentLocale {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateCmsPageMetadata("pricing", toCmsLocale(locale));
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cmsLocale = toCmsLocale(locale);
  const { blocks, published } = await fetchCmsPage("pricing", cmsLocale);
  if (!published) {
    return null;
  }
  return <CmsRenderer blocks={blocks} variant="pricing" locale={cmsLocale} />;
}
