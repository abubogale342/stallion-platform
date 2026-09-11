import { getAccessToken } from "@/services/auth";
import { createClient } from "@/services/supabase";
import { DEFAULT_RESEARCH_LOCALE, type ResearchLocale } from "@/utils/common";

export type ResearchStallionOption = {
  id: string;
  stallion_name: string | null;
};

export async function fetchResearchStallionOptions(): Promise<
  { ok: true; options: ResearchStallionOption[] } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallions")
    .select("id, stallion_name")
    .order("stallion_name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, options: (data ?? []) as ResearchStallionOption[] };
}

export async function createResearchSnippet(params: {
  stallionId: string;
  description: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_research_snippets")
    .insert({
      stallion_id: params.stallionId,
      image_path: "pending://no-image",
      description: params.description,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function uploadResearchImages(params: {
  snippetId: string;
  /** Language of the source material in this batch. Applies to every image. */
  locale?: ResearchLocale;
  images: { file: File; name: string }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, error: "You must be signed in to upload images." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return { ok: false, error: "Supabase URL is not configured." };
  }

  const formData = new FormData();
  formData.append("snippet_uuid", params.snippetId);
  formData.append("locale", params.locale ?? DEFAULT_RESEARCH_LOCALE);
  params.images.forEach((img) => {
    formData.append("images", img.file, img.file.name || `${img.name}.png`);
    formData.append("names", img.name.trim() || "Untitled image");
  });

  try {
    const response = await fetch(
      `${baseUrl}/functions/v1/upload-research-images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      return { ok: false, error: payload?.error || "Upload failed." };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

export async function renameResearchImage(params: {
  imageId: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_research_snippets_images")
    .update({ name: params.name.trim() || null })
    .eq("id", params.imageId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deleteResearchImage(params: {
  imageId: string;
  imageBucketPath: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: storageError } = await createClient()
    .storage.from("stallion-research")
    .remove([params.imageBucketPath]);

  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  const { error: deleteError } = await createClient()
    .from("stallion_research_snippets_images")
    .delete()
    .eq("id", params.imageId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}
