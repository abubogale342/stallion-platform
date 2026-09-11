"use server";

import { requireRole } from "@/services/auth.server";
import { createServerClient } from "@/services/supabase.server";
import { parseCmsBlocks } from "@/utils/cms";
import { normalizeLocalizedTitle } from "@/utils/cms-i18n";
import {
  normalizeFooterLayout,
  normalizeHeaderLayout,
} from "@/utils/cms-layout-i18n";
import {
  isCmsLayoutSlug,
  isCmsSlug,
  type CmsFooterLayout,
  type CmsHeaderLayout,
  type CmsLayoutSlug,
  type LocalizedString,
} from "@/types/cms";
import { routing } from "@/i18n/routing";
import { revalidatePath } from "next/cache";

export type CmsPageListRow = {
  slug: string;
  title: LocalizedString | string | null;
  blocks: unknown;
  layout: unknown;
  updated_at: string | null;
  published: boolean | null;
};

function revalidatePublicCmsPaths() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/about`);
    revalidatePath(`/${locale}/pricing`);
    revalidatePath(`/${locale}`, "layout");
  }
  revalidatePath("/dashboard/pages");
}

export async function fetchCmsPagesList(): Promise<{
  rows: CmsPageListRow[];
  error: string | null;
}> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("cms_pages")
    .select("slug, title, blocks, layout, updated_at, published")
    .order("slug");

  return {
    rows: (data ?? []) as CmsPageListRow[],
    error: error?.message ?? null,
  };
}

export async function fetchCmsPageForEdit(slug: string): Promise<{
  row: {
    title: unknown;
    blocks: unknown;
    published: boolean | null;
  } | null;
  error: string | null;
}> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("cms_pages")
    .select("title, blocks, published")
    .eq("slug", slug)
    .maybeSingle();

  return {
    row: data as {
      title: unknown;
      blocks: unknown;
      published: boolean | null;
    } | null,
    error: error?.message ?? null,
  };
}

export async function saveCmsPage(
  slug: string,
  payload: { title: LocalizedString; blocks: unknown; published: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCmsSlug(slug)) {
    return { ok: false, error: "Invalid page." };
  }

  const parsed = parseCmsBlocks(payload.blocks);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const auth = await requireRole("owner", "admin");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const title = normalizeLocalizedTitle(payload.title);

  const { error } = await auth.supabase
    .from("cms_pages")
    .update({
      title,
      blocks: parsed.blocks,
      published: payload.published,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePublicCmsPaths();

  return { ok: true };
}

export async function fetchCmsLayoutForEdit(slug: string): Promise<{
  row: {
    layout: unknown;
    published: boolean | null;
    title: unknown;
  } | null;
  error: string | null;
}> {
  if (!isCmsLayoutSlug(slug)) {
    return { row: null, error: "Invalid layout." };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("cms_pages")
    .select("layout, published, title")
    .eq("slug", slug)
    .maybeSingle();

  return {
    row: data as {
      layout: unknown;
      published: boolean | null;
      title: unknown;
    } | null,
    error: error?.message ?? null,
  };
}

export async function saveCmsLayout(
  slug: CmsLayoutSlug,
  payload: {
    layout: CmsHeaderLayout | CmsFooterLayout;
    published: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCmsLayoutSlug(slug)) {
    return { ok: false, error: "Invalid layout." };
  }

  const auth = await requireRole("owner", "admin");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const layout =
    slug === "header"
      ? normalizeHeaderLayout(payload.layout)
      : normalizeFooterLayout(payload.layout);

  const { error } = await auth.supabase
    .from("cms_pages")
    .update({
      layout,
      published: payload.published,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePublicCmsPaths();

  return { ok: true };
}
