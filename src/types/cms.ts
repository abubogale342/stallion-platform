/**
 * Mini CMS block model stored in public.cms_pages.blocks (jsonb).
 */
export type CmsSlug = "landing" | "about" | "pricing";

export type CmsLayoutSlug = "header" | "footer";

export type CmsContentLocale = "en" | "pt-BR";

export type LocalizedString = {
  en: string;
  "pt-BR": string;
};

export type CmsAlign = "left" | "center" | "right";

export type CmsLink = {
  label: LocalizedString;
  href: string;
};

export type CmsBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4 | 5 | 6;
      text: LocalizedString;
      align?: CmsAlign;
      pricingCard?: boolean;
    }
  | { type: "text"; text: LocalizedString; align?: CmsAlign }
  | {
      type: "button";
      label: LocalizedString;
      href: string;
      variant?: "primary" | "secondary";
      align?: CmsAlign;
    }
  | {
      type: "buttons";
      items: {
        label: LocalizedString;
        href: string;
        variant?: "primary" | "secondary";
      }[];
      align?: CmsAlign;
    }
  | {
      type: "image";
      src: string;
      alt?: LocalizedString;
      caption?: LocalizedString;
      align?: CmsAlign;
    }
  | { type: "video"; url: string; caption?: LocalizedString; align?: CmsAlign }
  | {
      type: "landing_hero";
      imageSrc?: string;
      overline: LocalizedString;
      titleBeforeAccent: LocalizedString;
      titleAccent: LocalizedString;
      subtitle: LocalizedString;
      description: LocalizedString;
      tags: LocalizedString[];
      cta: CmsLink;
      /** Optional second hero button (e.g. Donor Mares directory). */
      secondaryCta?: CmsLink;
      referenceLeftTitle: LocalizedString;
      referenceLeftText: LocalizedString;
      referenceRightTitle: LocalizedString;
      referenceRightText: LocalizedString;
      industryTitle: LocalizedString;
      industryText: LocalizedString;
      regions: LocalizedString[];
      stats: { value: LocalizedString; label: LocalizedString }[];
      learnMore: CmsLink;
      readyTitle: LocalizedString;
      readySubtitle: LocalizedString;
      readyCta: CmsLink;
    }
  | { type: "grid"; columns: 2 | 3; cells: CmsBlock[][]; align?: CmsAlign };

export type CmsHeaderLayout = {
  brand: LocalizedString;
  registry: LocalizedString;
  stallionDirectory: LocalizedString;
  mareDirectory: LocalizedString;
  blog: LocalizedString;
  about: LocalizedString;
  pricing: LocalizedString;
  resources: LocalizedString;
  commercialDirectory: LocalizedString;
  associationsRegistries: LocalizedString;
  login: LocalizedString;
};

export type CmsFooterLayout = {
  brandTitle: LocalizedString;
  tagline: LocalizedString;
  breeds: LocalizedString;
  regionsLine1: LocalizedString;
  regionsLine2: LocalizedString;
  linksHeading: LocalizedString;
  submitListing: LocalizedString;
  contactHeading: LocalizedString;
  contactEmail: string;
  copyright: LocalizedString;
  termsOfUse: LocalizedString;
  privacyPolicy: LocalizedString;
};

export type ResolvedHeaderContent = {
  brand: string;
  registry: string;
  stallionDirectory: string;
  mareDirectory: string;
  blog: string;
  about: string;
  pricing: string;
  resources: string;
  commercialDirectory: string;
  associationsRegistries: string;
  login: string;
};

export type ResolvedFooterContent = {
  brandTitle: string;
  tagline: string;
  breeds: string;
  regionsLine1: string;
  regionsLine2: string;
  linksHeading: string;
  submitListing: string;
  contactHeading: string;
  contactEmail: string;
  copyright: string;
  termsOfUse: string;
  privacyPolicy: string;
};

export type CmsPageRecord = {
  slug: CmsSlug;
  title: LocalizedString | null;
  published: boolean;
  blocks: CmsBlock[];
  updated_at?: string;
};

export const CMS_SLUGS: CmsSlug[] = ["landing", "about", "pricing"];

export const CMS_LAYOUT_SLUGS: CmsLayoutSlug[] = ["header", "footer"];

export function isCmsSlug(s: string): s is CmsSlug {
  return CMS_SLUGS.includes(s as CmsSlug);
}

export function isCmsLayoutSlug(s: string): s is CmsLayoutSlug {
  return CMS_LAYOUT_SLUGS.includes(s as CmsLayoutSlug);
}
