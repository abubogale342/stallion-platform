import type {
  CmsContentLocale,
  CmsFooterLayout,
  CmsHeaderLayout,
  LocalizedString,
  ResolvedFooterContent,
  ResolvedHeaderContent,
} from "@/types/cms";
import {
  DEFAULT_FOOTER_LAYOUT,
  DEFAULT_HEADER_LAYOUT,
} from "@/utils/cms-layout-defaults";
import { normalizeLocalizedString, resolveLocalized } from "@/utils/cms-i18n";

function normalizeLayoutField(
  value: unknown
): LocalizedString {
  if (value && typeof value === "object" && ("en" in value || "pt-BR" in value)) {
    return normalizeLocalizedString(value as LocalizedString | string);
  }
  return normalizeLocalizedString(
    (value as LocalizedString | string | undefined | null) ?? ""
  );
}

export function normalizeHeaderLayout(raw: unknown): CmsHeaderLayout {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const defaults = DEFAULT_HEADER_LAYOUT;
  return {
    brand: normalizeLayoutField(row.brand ?? defaults.brand),
    registry: normalizeLayoutField(row.registry ?? defaults.registry),
    stallionDirectory: normalizeLayoutField(
      row.stallionDirectory ?? defaults.stallionDirectory
    ),
    mareDirectory: normalizeLayoutField(
      row.mareDirectory ?? defaults.mareDirectory
    ),
    // Stored header rows predate this field, so the default fills it in and no
    // migration is needed to backfill existing CMS content.
    blog: normalizeLayoutField(row.blog ?? defaults.blog),
    about: normalizeLayoutField(row.about ?? defaults.about),
    pricing: normalizeLayoutField(row.pricing ?? defaults.pricing),
    resources: normalizeLayoutField(row.resources ?? defaults.resources),
    commercialDirectory: normalizeLayoutField(
      row.commercialDirectory ?? defaults.commercialDirectory
    ),
    associationsRegistries: normalizeLayoutField(
      row.associationsRegistries ?? defaults.associationsRegistries
    ),
    login: normalizeLayoutField(row.login ?? defaults.login),
  };
}

export function normalizeFooterLayout(raw: unknown): CmsFooterLayout {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const defaults = DEFAULT_FOOTER_LAYOUT;
  return {
    brandTitle: normalizeLayoutField(row.brandTitle ?? defaults.brandTitle),
    tagline: normalizeLayoutField(row.tagline ?? defaults.tagline),
    breeds: normalizeLayoutField(row.breeds ?? defaults.breeds),
    regionsLine1: normalizeLayoutField(row.regionsLine1 ?? defaults.regionsLine1),
    regionsLine2: normalizeLayoutField(row.regionsLine2 ?? defaults.regionsLine2),
    linksHeading: normalizeLayoutField(row.linksHeading ?? defaults.linksHeading),
    submitListing: normalizeLayoutField(row.submitListing ?? defaults.submitListing),
    contactHeading: normalizeLayoutField(
      row.contactHeading ?? defaults.contactHeading
    ),
    contactEmail:
      typeof row.contactEmail === "string" && row.contactEmail.trim()
        ? row.contactEmail.trim()
        : defaults.contactEmail,
    copyright: normalizeLayoutField(row.copyright ?? defaults.copyright),
    termsOfUse: normalizeLayoutField(row.termsOfUse ?? defaults.termsOfUse),
    privacyPolicy: normalizeLayoutField(
      row.privacyPolicy ?? defaults.privacyPolicy
    ),
  };
}

export function resolveHeaderLayout(
  layout: CmsHeaderLayout,
  locale: CmsContentLocale
): ResolvedHeaderContent {
  return {
    brand: resolveLocalized(layout.brand, locale),
    registry: resolveLocalized(layout.registry, locale),
    stallionDirectory: resolveLocalized(layout.stallionDirectory, locale),
    mareDirectory: resolveLocalized(layout.mareDirectory, locale),
    blog: resolveLocalized(layout.blog, locale),
    about: resolveLocalized(layout.about, locale),
    pricing: resolveLocalized(layout.pricing, locale),
    resources: resolveLocalized(layout.resources, locale),
    commercialDirectory: resolveLocalized(layout.commercialDirectory, locale),
    associationsRegistries: resolveLocalized(
      layout.associationsRegistries,
      locale
    ),
    login: resolveLocalized(layout.login, locale),
  };
}

export function resolveFooterLayout(
  layout: CmsFooterLayout,
  locale: CmsContentLocale
): ResolvedFooterContent {
  return {
    brandTitle: resolveLocalized(layout.brandTitle, locale),
    tagline: resolveLocalized(layout.tagline, locale),
    breeds: resolveLocalized(layout.breeds, locale),
    regionsLine1: resolveLocalized(layout.regionsLine1, locale),
    regionsLine2: resolveLocalized(layout.regionsLine2, locale),
    linksHeading: resolveLocalized(layout.linksHeading, locale),
    submitListing: resolveLocalized(layout.submitListing, locale),
    contactHeading: resolveLocalized(layout.contactHeading, locale),
    contactEmail: layout.contactEmail,
    copyright: resolveLocalized(layout.copyright, locale),
    termsOfUse: resolveLocalized(layout.termsOfUse, locale),
    privacyPolicy: resolveLocalized(layout.privacyPolicy, locale),
  };
}

function layoutLocalizedFieldsComplete(
  fields: LocalizedString[]
): boolean {
  return fields.every((field) => field["pt-BR"].trim().length > 0);
}

export function isHeaderLayoutPtBrComplete(layout: CmsHeaderLayout): boolean {
  return layoutLocalizedFieldsComplete([
    layout.brand,
    layout.registry,
    layout.stallionDirectory,
    layout.mareDirectory,
    layout.blog,
    layout.about,
    layout.pricing,
    layout.resources,
    layout.commercialDirectory,
    layout.associationsRegistries,
    layout.login,
  ]);
}

export function isFooterLayoutPtBrComplete(layout: CmsFooterLayout): boolean {
  return layoutLocalizedFieldsComplete([
    layout.brandTitle,
    layout.tagline,
    layout.breeds,
    layout.regionsLine1,
    layout.regionsLine2,
    layout.linksHeading,
    layout.submitListing,
    layout.contactHeading,
    layout.copyright,
    layout.termsOfUse,
    layout.privacyPolicy,
  ]);
}
