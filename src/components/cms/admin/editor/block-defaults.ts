import { CMS_DEFAULTS } from "@/utils/cms";
import type { CmsBlock } from "@/types/cms";
import { emptyLocalized } from "@/utils/cms-i18n";

const landingHeroDefault = CMS_DEFAULTS.landing.find(
  (block): block is Extract<CmsBlock, { type: "landing_hero" }> =>
    block.type === "landing_hero"
);

export const CMS_BLOCK_DEFAULTS: Record<CmsBlock["type"], CmsBlock> = {
  heading: { type: "heading", level: 2, text: emptyLocalized() },
  text: { type: "text", text: emptyLocalized() },
  button: {
    type: "button",
    label: emptyLocalized(),
    href: "/",
    variant: "secondary",
    align: "left",
  },
  buttons: {
    type: "buttons",
    items: [{ label: emptyLocalized(), href: "/", variant: "secondary" }],
    align: "left",
  },
  image: { type: "image", src: "", alt: emptyLocalized(), align: "left" },
  video: { type: "video", url: "", align: "left" },
  landing_hero: landingHeroDefault ?? {
    type: "landing_hero",
    imageSrc: "/splash_page.png",
    overline: emptyLocalized(),
    titleBeforeAccent: emptyLocalized(),
    titleAccent: emptyLocalized(),
    subtitle: emptyLocalized(),
    description: emptyLocalized(),
    tags: [],
    cta: { label: emptyLocalized(), href: "/" },
    secondaryCta: { label: emptyLocalized(), href: "/mares" },
    referenceLeftTitle: emptyLocalized(),
    referenceLeftText: emptyLocalized(),
    referenceRightTitle: emptyLocalized(),
    referenceRightText: emptyLocalized(),
    industryTitle: emptyLocalized(),
    industryText: emptyLocalized(),
    regions: [],
    stats: [],
    learnMore: { label: emptyLocalized(), href: "/" },
    readyTitle: emptyLocalized(),
    readySubtitle: emptyLocalized(),
    readyCta: { label: emptyLocalized(), href: "/" },
  },
  grid: { type: "grid", columns: 2, cells: [[], []], align: "left" },
};
