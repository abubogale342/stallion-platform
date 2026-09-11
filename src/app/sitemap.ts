import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { supabase } from "@/services/supabase";
import { absoluteUrl } from "@/utils/seo";
import { fetchPublishedBlogEntries } from "@/services/blog.server";

const STATIC_PATHS = [
  "",
  "/stallions",
  "/mares",
  "/about",
  "/pricing",
  "/resources",
  "/blog",
];

function localeEntry(
  path: string,
  lastModified?: Date
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(`/${locale}${path}`);
  }
  return {
    url: absoluteUrl(`/${routing.defaultLocale}${path}`),
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) =>
    localeEntry(path)
  );

  // Published profiles only — the anon client's RLS already filters drafts out,
  // but the publish_status filter keeps intent explicit.
  const { data } = await supabase
    .from("stallions")
    .select("slug, horse_type, updated_at")
    .eq("publish_status", "published")
    .not("slug", "is", null)
    .order("slug");

  for (const row of (data ?? []) as {
    slug: string | null;
    horse_type: string;
    updated_at: string | null;
  }[]) {
    const slug = row.slug?.trim().toLowerCase();
    if (!slug) continue;
    const base = row.horse_type === "mare" ? "/mares" : "/stallions";
    const lastModified = row.updated_at ? new Date(row.updated_at) : undefined;
    entries.push(localeEntry(`${base}/${slug}`, lastModified));
  }

  // Blog posts publish per locale, so `localeEntry` cannot be reused: it
  // advertises every locale for a path. A post live only in English must
  // appear once, with itself as the sole alternate — listing a pt-BR URL that
  // 404s would be an indexing error.
  const blogEntries = await fetchPublishedBlogEntries();
  const localesBySlug = new Map<string, string[]>();
  for (const entry of blogEntries) {
    const existing = localesBySlug.get(entry.slug);
    if (existing) existing.push(entry.locale);
    else localesBySlug.set(entry.slug, [entry.locale]);
  }

  for (const entry of blogEntries) {
    const locales = localesBySlug.get(entry.slug) ?? [entry.locale];
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      languages[locale] = absoluteUrl(`/${locale}/blog/${entry.slug}`);
    }

    entries.push({
      url: absoluteUrl(`/${entry.locale}/blog/${entry.slug}`),
      ...(entry.updatedAt ? { lastModified: new Date(entry.updatedAt) } : {}),
      alternates: { languages },
    });
  }

  return entries;
}
