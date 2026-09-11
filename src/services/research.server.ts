import "server-only";
import { createServerClient } from "@/services/supabase.server";
import {
  normalizeResearchLocale,
  RESEARCH_LOCALE_LABELS,
  type ResearchLocale,
} from "@/utils/common";

export type ResearchStallionListRow = {
  id: string;
  stallion_id: string;
  description: string | null;
  extracted_summary: string | null;
  created_at: string | null;
  stallion: {
    id: string;
    stallion_name: string | null;
    publish_status: "draft" | "published" | null;
  } | null;
};

export type FetchResearchStallionsPageResult = {
  rows: ResearchStallionListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

export async function fetchResearchStallionsPage(params?: {
  page?: number;
  pageSize?: number;
}): Promise<FetchResearchStallionsPageResult> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 5);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerClient();

  const { data, count, error } = await supabase
    .from("stallion_research_snippets")
    .select("id, stallion_id, description, extracted_summary, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: error.message,
    };
  }

  type SnippetRow = {
    id: string;
    stallion_id: string;
    description: string | null;
    extracted_summary: string | null;
    created_at: string | null;
  };

  type StallionLookupRow = {
    id: string;
    stallion_name: string | null;
    publish_status: "draft" | "published" | null;
  };

  const snippets = (data ?? []) as SnippetRow[];
  const stallionIds = Array.from(new Set(snippets.map((r) => r.stallion_id)));

  const { data: stallionsData, error: stallionsError } = stallionIds.length
    ? await supabase
        .from("stallions")
        .select("id, stallion_name, publish_status")
        .in("id", stallionIds)
    : { data: [] as StallionLookupRow[], error: null };

  if (stallionsError) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: stallionsError.message,
    };
  }

  const stallionById = new Map(
    ((stallionsData ?? []) as StallionLookupRow[]).map((s) => [s.id, s])
  );

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: snippets.map((row) => ({
      ...row,
      stallion: stallionById.get(row.stallion_id) ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages,
    error: null,
  };
}

export type ResearchSnippetDetailImage = {
  id: string;
  title: string;
  src: string | null;
  imageBucketPath: string;
  locale: ResearchLocale;
  localeLabel: string;
};

export type FetchResearchSnippetDetailResult =
  | {
      ok: true;
      snippet: {
        id: string;
        stallion_id: string;
        description: string | null;
        extracted_summary: string | null;
      };
      stallion: { id: string; stallion_name: string | null };
      images: ResearchSnippetDetailImage[];
      imagesError: string | null;
    }
  | { ok: false };

export async function fetchResearchSnippetDetail(
  id: string
): Promise<FetchResearchSnippetDetailResult> {
  const supabase = await createServerClient();

  const { data: snippet, error: snippetError } = await supabase
    .from("stallion_research_snippets")
    .select("id, stallion_id, description, extracted_summary")
    .eq("id", id)
    .maybeSingle();

  if (snippetError || !snippet) {
    return { ok: false };
  }

  type ResearchSnippetRow = {
    id: string;
    stallion_id: string;
    description: string | null;
    extracted_summary: string | null;
  };

  const row = snippet as ResearchSnippetRow;

  const { data: stallion, error: stallionError } = await supabase
    .from("stallions")
    .select("id, stallion_name")
    .eq("id", row.stallion_id)
    .maybeSingle();

  if (stallionError || !stallion) {
    return { ok: false };
  }

  type StallionRow = {
    id: string;
    stallion_name: string | null;
  };

  const stallionRow = stallion as StallionRow;

  const { data: snippetImages, error: snippetImagesError } = await supabase
    .from("stallion_research_snippets_images")
    .select("id, image_bucket_path, name, locale")
    .eq("snippet_id", row.id)
    .order("created_at", { ascending: false });

  type ResearchImageRow = {
    id: string;
    image_bucket_path: string;
    name: string | null;
    locale: string | null;
  };

  const imageRows = (snippetImages ?? []) as ResearchImageRow[];
  const signedImages = await Promise.all(
    imageRows.map(async (image, idx) => {
      const { data: signed, error: signedUrlError } = await supabase.storage
        .from("stallion-research")
        .createSignedUrl(image.image_bucket_path, 60 * 60);
      const locale = normalizeResearchLocale(image.locale);
      return {
        id: image.id,
        title: image.name?.trim() || `Research Image ${idx + 1}`,
        src: signedUrlError ? null : (signed?.signedUrl ?? null),
        imageBucketPath: image.image_bucket_path,
        locale,
        localeLabel: RESEARCH_LOCALE_LABELS[locale],
      };
    })
  );

  return {
    ok: true,
    snippet: row,
    stallion: stallionRow,
    images: signedImages,
    imagesError: snippetImagesError?.message ?? null,
  };
}
