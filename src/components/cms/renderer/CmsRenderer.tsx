import type { CmsBlock } from "@/types/cms";
import type { CmsContentLocale } from "@/types/cms";
import AboutPageRenderer from "./pages/AboutPageRenderer";
import LandingPageRenderer from "./pages/LandingPageRenderer";
import PricingPageRenderer from "./pages/PricingPageRenderer";
import type { CmsPageVariant } from "./types";

export type { CmsPageVariant } from "./types";

export default async function CmsRenderer({
  blocks,
  variant,
  locale,
}: {
  blocks: CmsBlock[];
  variant: CmsPageVariant;
  locale: CmsContentLocale;
}) {
  switch (variant) {
    case "landing":
      return <LandingPageRenderer blocks={blocks} locale={locale} />;
    case "about":
      return <AboutPageRenderer blocks={blocks} locale={locale} />;
    case "pricing":
      return <PricingPageRenderer blocks={blocks} locale={locale} />;
    default:
      return null;
  }
}
