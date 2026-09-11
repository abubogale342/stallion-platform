import "server-only";
import type { Stallion } from "@/types/stallion";
import { createServiceRoleClient } from "@/services/supabase.admin";
import { createServerClient } from "@/services/supabase.server";
import {
  bucketForStallionImagePath,
  normalizeStallionImageStoragePath,
} from "@/utils/stallion";

function isResolvableStoragePath(path: string): boolean {
  return !(
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  );
}

async function signWithEdgeFunction(params: {
  filename: string;
  bucket: string;
  expiresIn: number;
  accessToken?: string | null;
}): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !apiKey) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: apiKey,
  };
  if (params.accessToken) {
    headers.Authorization = `Bearer ${params.accessToken}`;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-stallion-image-signed-url`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as { signedUrl?: string };
    return payload.signedUrl ?? null;
  } catch {
    return null;
  }
}

export async function signStallionImageStorageUrl(params: {
  filename: string;
  bucket?: string;
  expiresIn?: number;
  accessToken?: string | null;
}): Promise<string | null> {
  const path = normalizeStallionImageStoragePath(params.filename);
  if (!path) return null;
  if (!isResolvableStoragePath(path)) return path;

  const bucket = params.bucket ?? bucketForStallionImagePath(path);
  const expiresIn = Math.max(60, Math.min(params.expiresIn ?? 3600, 3600));

  const admin = createServiceRoleClient();
  if (admin) {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (!error && data?.signedUrl) return data.signedUrl;

  return signWithEdgeFunction({
    filename: path,
    bucket,
    expiresIn,
    accessToken: params.accessToken,
  });
}

export async function attachSignedStallionMediaUrls(
  stallion: Stallion,
  expiresIn = 3600
): Promise<Stallion> {
  const media = stallion.media;
  if (!media) return stallion;

  let primary = media.primary_image_url;
  if (primary?.trim() && isResolvableStoragePath(primary.trim())) {
    primary =
      (await signStallionImageStorageUrl({ filename: primary, expiresIn })) ??
      primary;
  }

  const gallery = media.gallery
    ? await Promise.all(
        media.gallery.map(async (item) => {
          const path = item.filename?.trim();
          if (!path || !isResolvableStoragePath(path)) return item;
          const signed = await signStallionImageStorageUrl({
            filename: path,
            expiresIn,
          });
          return signed ? { ...item, filename: signed } : item;
        })
      )
    : media.gallery;

  return {
    ...stallion,
    media: {
      ...media,
      primary_image_url: primary,
      gallery,
    },
  };
}
