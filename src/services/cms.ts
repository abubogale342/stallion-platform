import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/services/supabase";
import { CMS_DEFAULTS, CMS_DEFAULT_TITLES } from "@/utils/cms";
import {
  DEFAULT_FOOTER_LAYOUT,
  DEFAULT_HEADER_LAYOUT,
} from "@/utils/cms-layout-defaults";
import {
  normalizeFooterLayout,
  normalizeHeaderLayout,
  resolveFooterLayout,
  resolveHeaderLayout,
} from "@/utils/cms-layout-i18n";
import {
  normalizeBlocks,
  normalizeLocalizedTitle,
  resolveLocalized,
} from "@/utils/cms-i18n";
import {
  CMS_SLUGS,
  type CmsBlock,
  type CmsContentLocale,
  type CmsFooterLayout,
  type CmsHeaderLayout,
  type CmsLayoutSlug,
  type CmsSlug,
  type LocalizedString,
  type ResolvedFooterContent,
  type ResolvedHeaderContent,
} from "@/types/cms";

const SITE_NAME = "Leading Sires Registry";

function parseTitleFromRow(raw: unknown): LocalizedString | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    return normalizeLocalizedTitle(raw);
  }
  if (typeof raw === "object") {
    return normalizeLocalizedTitle(raw as LocalizedString);
  }
  return null;
}

function parseBlocksFromRow(raw: unknown, slug: CmsSlug): CmsBlock[] {
  const defaults = CMS_DEFAULTS[slug];
  const blocksArray = Array.isArray(raw) ? (raw as CmsBlock[]) : [];
  const blocks = blocksArray.length > 0 ? blocksArray : defaults;
  return normalizeBlocks(blocks);
}

/** Dedupes Supabase reads when both `generateMetadata` and the page call `fetchCmsPage` in the same request. */
export const fetchCmsPage = cache(async function fetchCmsPage(
  slug: CmsSlug,
  locale: CmsContentLocale = "en"
): Promise<{ title: LocalizedString | null; blocks: CmsBlock[]; published: boolean }> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("title, blocks, published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("fetchCmsPage", slug, error.message);
    return {
      title: CMS_DEFAULT_TITLES[slug],
      blocks: CMS_DEFAULTS[slug],
      published: true,
    };
  }

  const defaults = CMS_DEFAULTS[slug];

  if (!data) {
    console.warn(`fetchCmsPage: no row for "${slug}", using site defaults`);
    return {
      title: CMS_DEFAULT_TITLES[slug],
      blocks: defaults,
      published: true,
    };
  }

  if (data.published === false) {
    return {
      title: parseTitleFromRow(data.title),
      blocks: [],
      published: false,
    };
  }

  const blocks = parseBlocksFromRow(data.blocks, slug);

  return {
    title: parseTitleFromRow(data.title) ?? CMS_DEFAULT_TITLES[slug],
    blocks,
    published: true,
  };
});

export async function generateCmsPageMetadata(
  slug: CmsSlug,
  locale: CmsContentLocale = "en"
): Promise<Metadata> {
  const { title, published } = await fetchCmsPage(slug, locale);

  if (!published) {
    return { title: SITE_NAME };
  }

  const t = resolveLocalized(title, locale).trim();
  if (t) {
    return { title: `${t} | ${SITE_NAME}` };
  }

  if (slug === "landing") {
    return { title: SITE_NAME };
  }

  const fallback =
    slug === "about"
      ? locale === "pt-BR"
        ? "Sobre nós"
        : "About us"
      : locale === "pt-BR"
        ? "Preços"
        : "Pricing";
  return { title: `${fallback} | ${SITE_NAME}` };
}

export async function fetchCmsPublishedNav(): Promise<{
  landing: boolean;
  about: boolean;
  pricing: boolean;
}> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("slug, published")
    .in("slug", CMS_SLUGS);

  if (error) {
    console.error("fetchCmsPublishedNav", error.message);
    return { landing: true, about: true, pricing: true };
  }

  const published = new Set(
    (data ?? [])
      .filter((row) => row.published !== false)
      .map((row) => row.slug as string)
  );

  return {
    landing: published.has("landing"),
    about: published.has("about"),
    pricing: published.has("pricing"),
  };
}

export const fetchCmsLayout = cache(async function fetchCmsLayout(
  slug: CmsLayoutSlug,
  locale: CmsContentLocale = "en"
): Promise<{
  header: ResolvedHeaderContent | null;
  footer: ResolvedFooterContent | null;
  published: boolean;
}> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("layout, published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("fetchCmsLayout", slug, error.message);
  }

  if (!data || data.published === false) {
    return { header: null, footer: null, published: false };
  }

  if (slug === "header") {
    const layout = normalizeHeaderLayout(data.layout ?? DEFAULT_HEADER_LAYOUT);
    return {
      header: resolveHeaderLayout(layout, locale),
      footer: null,
      published: true,
    };
  }

  const layout = normalizeFooterLayout(data.layout ?? DEFAULT_FOOTER_LAYOUT);
  return {
    header: null,
    footer: resolveFooterLayout(layout, locale),
    published: true,
  };
});

export async function fetchCmsSiteLayout(
  locale: CmsContentLocale = "en"
): Promise<{
  header: ResolvedHeaderContent | null;
  footer: ResolvedFooterContent | null;
}> {
  const [headerResult, footerResult] = await Promise.all([
    fetchCmsLayout("header", locale),
    fetchCmsLayout("footer", locale),
  ]);

  return {
    header: headerResult.published ? headerResult.header : null,
    footer: footerResult.published ? footerResult.footer : null,
  };
}

export function mergeCmsLayoutForEditor(
  slug: CmsLayoutSlug,
  row: { layout: unknown } | null | undefined
): CmsHeaderLayout | CmsFooterLayout {
  if (slug === "header") {
    return normalizeHeaderLayout(row?.layout ?? DEFAULT_HEADER_LAYOUT);
  }
  return normalizeFooterLayout(row?.layout ?? DEFAULT_FOOTER_LAYOUT);
}

export function mergeCmsBlocksForEditor(
  slug: CmsSlug,
  row: { blocks: unknown; title: unknown } | null | undefined
): { title: LocalizedString | null; blocks: CmsBlock[] } {
  const defaults = CMS_DEFAULTS[slug];
  const defaultTitle = CMS_DEFAULT_TITLES[slug];
  if (!row) {
    return { title: defaultTitle, blocks: defaults };
  }
  const raw = row.blocks as unknown;
  const blocksArray = Array.isArray(raw) ? (raw as CmsBlock[]) : [];
  return {
    title: parseTitleFromRow(row.title) ?? defaultTitle,
    blocks: normalizeBlocks(blocksArray.length > 0 ? blocksArray : defaults),
  };
}
