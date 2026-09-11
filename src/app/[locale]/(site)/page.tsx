import CmsRenderer from "@/components/cms/CmsRenderer";
import { fetchCmsPage, generateCmsPageMetadata } from "@/services/cms";
import type { CmsContentLocale } from "@/types/cms";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function toCmsLocale(locale: string): CmsContentLocale {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateCmsPageMetadata("landing", toCmsLocale(locale));
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cmsLocale = toCmsLocale(locale);
  const { blocks, published } = await fetchCmsPage("landing", cmsLocale);
  if (!published) {
    return null;
  }
  return <CmsRenderer blocks={blocks} variant="landing" locale={cmsLocale} />;
}
