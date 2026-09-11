import CmsRenderer from "@/components/cms/CmsRenderer";
import { fetchCmsPage, generateCmsPageMetadata } from "@/services/cms";
import type { CmsContentLocale } from "@/types/cms";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function toCmsLocale(locale: string): CmsContentLocale {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateCmsPageMetadata("about", toCmsLocale(locale));
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cmsLocale = toCmsLocale(locale);
  const { blocks, published } = await fetchCmsPage("about", cmsLocale);
  if (!published) {
    return null;
  }
  return <CmsRenderer blocks={blocks} variant="about" locale={cmsLocale} />;
}
