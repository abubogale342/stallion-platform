import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Public site origin for absolute URLs (sitemap, canonical, JSON-LD).
 * Set NEXT_PUBLIC_SITE_URL in production; falls back to localhost for dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Canonical + hreflang alternates for a locale-prefixed route.
 * `path` is the unlocalized route (e.g. "/mares" or "/mares/some-slug").
 */
export function buildLocaleAlternates(
  locale: string,
  path: string
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = absoluteUrl(`/${l}${path}`);
  }
  languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
  return {
    canonical: absoluteUrl(`/${locale}${path}`),
    languages,
  };
}

type HorseProfileJsonLdInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  locale: string;
  /** Unlocalized profile path, e.g. "/mares/some-slug". */
  path: string;
  /** Directory the profile belongs to, e.g. { label: "Donor Mares", path: "/mares" }. */
  directory: { label: string; path: string };
  siteName?: string;
};

/**
 * schema.org JSON-LD for a horse profile page (used identically for stallions
 * and mares — schema.org has no Horse type, so ProfilePage + Thing).
 */
export function buildHorseProfileJsonLd({
  name,
  description,
  imageUrl,
  locale,
  path,
  directory,
  siteName = "Leading Sires Registry",
}: HorseProfileJsonLdInput): Record<string, unknown> {
  const url = absoluteUrl(`/${locale}${path}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        url,
        name,
        ...(description ? { description } : {}),
        inLanguage: locale,
        isPartOf: {
          "@type": "WebSite",
          name: siteName,
          url: SITE_URL,
        },
        mainEntity: {
          "@type": "Thing",
          name,
          url,
          ...(description ? { description } : {}),
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: siteName,
            item: absoluteUrl(`/${locale}`),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: directory.label,
            item: absoluteUrl(`/${locale}${directory.path}`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name,
            item: url,
          },
        ],
      },
    ],
  };
}

/**
 * Canonical + hreflang for a route that does not exist in every locale.
 *
 * `buildLocaleAlternates` assumes a path is live in all languages, which is
 * true of the static site but not of blog posts: a post published only in
 * English must not advertise a Portuguese URL that would 404. Pass the
 * locales the post is actually published in.
 */
export function buildAvailableLocaleAlternates(
  locale: string,
  path: string,
  availableLocales: readonly string[]
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of availableLocales) {
    languages[l] = absoluteUrl(`/${l}${path}`);
  }
  if (availableLocales.includes(routing.defaultLocale)) {
    languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
  }
  return {
    canonical: absoluteUrl(`/${locale}${path}`),
    languages,
  };
}

type BlogArticleJsonLdInput = {
  headline: string;
  description?: string;
  imageUrl?: string;
  locale: string;
  slug: string;
  datePublished?: string;
  dateModified?: string;
  siteName?: string;
};

/** schema.org Article JSON-LD for a blog post page. */
export function buildBlogArticleJsonLd({
  headline,
  description,
  imageUrl,
  locale,
  slug,
  datePublished,
  dateModified,
  siteName = "Leading Sires Registry",
}: BlogArticleJsonLdInput): Record<string, unknown> {
  const url = absoluteUrl(`/${locale}/blog/${slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline,
        url,
        mainEntityOfPage: url,
        inLanguage: locale,
        ...(description ? { description } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: SITE_URL,
        },
        isPartOf: {
          "@type": "WebSite",
          name: siteName,
          url: SITE_URL,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: siteName,
            item: absoluteUrl(`/${locale}`),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: absoluteUrl(`/${locale}/blog`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: headline,
            item: url,
          },
        ],
      },
    ],
  };
}
