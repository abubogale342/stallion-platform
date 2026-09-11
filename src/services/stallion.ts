import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import type { HorseType, SemenAvailability, StallionBreed } from "@/types/stallion";
import type { FormGalleryItem, FormMareEtDetails, StallionFormValues } from "@/types/stallion-form";
import {
  bucketForStallionImagePath,
  normalizeStallionImageStoragePath,
  STALLION_PHOTOS_BUCKET,
  validationMessagesFromRpcDetails,
} from "@/utils/stallion";
import {
  createClient,
  createClient as createBrowserSupabaseClient,
} from "@/services/supabase";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rpcAuthErrorMessage(error: { message?: string; code?: string }): string {
  const msg = error.message ?? "";
  if (
    error.code === "PGRST301" ||
    /jwt|401|not authenticated|permission denied/i.test(msg)
  ) {
    return "Your session expired or you are not signed in. Sign in again and retry.";
  }
  return msg || "Request failed.";
}

// --- select.ts ---

export const BREED_MAP: Record<string, StallionBreed> = {
  QH: "Quarter Horse",
  Paint: "Paint",
  Appaloosa: "Appaloosa",
};

export const BREED_TO_DB_MAP: Record<StallionBreed, string> = {
  "Quarter Horse": "QH",
  Paint: "Paint",
  Appaloosa: "Appaloosa",
};

/** Serialized `semen_availability` for PostgREST `.eq` (exact array match). */
export const AVAILABILITY_TO_DB_ARRAY_LITERAL_MAP: Record<
  Exclude<SemenAvailability, "Method not disclosed">,
  string
> = {
  Fresh: "{Fresh}",
  Chilled: "{Chilled}",
  Cooled: "{Cooled}",
  Frozen: "{Frozen}",
  ICSI: "{ICSI}",
  Combination: "{Chilled,Frozen}",
  "Live Cover": "{Live Cover}",
};

export const BREEDING_SERVICE_PROVIDER_SELECT = `
  id,
  stallion_id,
  breeding_service_provider,
  name,
  contact_name,
  website,
  country,
  email,
  phone,
  sort_order,
  admin_notes,
  created_at,
  resources_directory:breeding_service_provider (
    name,
    website,
    country
  )
`;

export const STALLION_OWNER_LINK_SELECT = `
  owner_id,
  public_display_name_only,
  sort_order,
  is_primary,
  owners (*)
`;

export const STALLION_PEDIGREE_SELECT = `
  id,
  stallion_id,
  pedigree_id,
  generation,
  progeny_id,
  created_at,
  pedigrees:pedigree_id (
    name,
    type,
    birth_year,
    height,
    pedigree_registrations (
      id,
      association_name,
      country,
      registration_number,
      is_primary,
      sort_order
    )
  )
`;

/** Staff wizard select; includes columns anon cannot read. */
export const STALLION_PEDIGREE_ADMIN_SELECT = `
  id,
  stallion_id,
  pedigree_id,
  generation,
  progeny_id,
  created_at,
  needs_review,
  admin_notes,
  pedigrees:pedigree_id (
    name,
    type,
    birth_year,
    height,
    pedigree_registrations (
      id,
      association_name,
      country,
      registration_number,
      is_primary,
      sort_order
    )
  )
`;

export const STALLION_WITH_RELATIONS_SELECT = `
  *,
  stallion_owners(*, owners!stallion_owners_owner_id_fkey(*)),
  stallion_performance_records(*),
  stallion_progeny(*),
  stallion_images(*),
  stallion_foal_crops(*),
  stallion_racing_results(*),
  stallion_racing_summary(*),
  stallion_genetic_tests(*),
  stallion_colour_tests(*)
`;

/**
 * Same as STALLION_WITH_RELATIONS_SELECT plus mare_et_details. The ET columns
 * must stay explicit: anon has column-level SELECT grants that exclude
 * admin_notes, so embedding mare_et_details(*) would fail for public reads.
 * Typed as plain string: supabase-js's type-level select parser can't handle
 * this many embeds; call sites cast rows to Record<string, unknown> anyway.
 */
export const MARE_WITH_RELATIONS_SELECT: string = `
  *,
  stallion_owners(*, owners!stallion_owners_owner_id_fkey(*)),
  stallion_performance_records(*),
  stallion_progeny(*),
  stallion_images(*),
  stallion_foal_crops(*),
  stallion_racing_results(*),
  stallion_racing_summary(*),
  stallion_genetic_tests(*),
  stallion_colour_tests(*),
  mare_et_details(id, stallion_id, et_status, clinic_name, clinic_location, flush_history, embryo_fee, embryo_fee_currency, embryo_availability, last_verified_at, international_availability)
`;

// --- media.ts ---
/** Horse head/neck silhouette placeholder when no primary/gallery image is available. */
export const STALLION_IMAGE_PLACEHOLDER_SRC = "/stallion-placeholder.png";

// --- stallion-image-bucket.ts ---
export {
  STALLION_PHOTOS_BUCKET,
  LEGACY_STALLION_IMAGES_BUCKET,
  bucketForStallionImagePath,
  normalizeStallionImageStoragePath,
  isManagedStallionPhotoPath,
} from "@/utils/stallion";

// --- image-signed-url.ts ---

export type StallionImageSignedUrlParams = {
  filename: string;
  bucket?: string;
  expiresIn?: number;
};

type SignedUrlPayload = {
  signedUrl?: string;
  error?: string;
};

function isAbsoluteImageUrl(path: string): boolean {
  return (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  );
}

async function fetchSignedUrlFromEdgeFunction(params: {
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
        body: JSON.stringify({
          filename: params.filename,
          bucket: params.bucket,
          expiresIn: params.expiresIn,
        }),
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as SignedUrlPayload;
    return payload.signedUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a display URL for a private storage object.
 *
 * 1. Logged-in admin: Storage signed URL via browser session (RLS on stallion-photos).
 * 2. Public / fallback: `get-stallion-image-signed-url` Edge Function.
 *
 * Edge Function must be deployed with `verify_jwt = false` when using
 * `sb_publishable_` API keys (see supabase/config.toml).
 */
export async function getStallionImageSignedUrl(
  params: StallionImageSignedUrlParams
): Promise<string | null> {
  const path = normalizeStallionImageStoragePath(params.filename);
  if (!path) return null;
  if (isAbsoluteImageUrl(path)) return path;

  const bucket = params.bucket ?? bucketForStallionImagePath(path);
  const expiresIn = Math.max(60, Math.min(params.expiresIn ?? 3600, 3600));

  const browserClient =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : null;

  if (browserClient) {
    const { data, error } = await browserClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return fetchSignedUrlFromEdgeFunction({ filename: path, bucket, expiresIn });
}

// --- stallion-photo-storage.ts ---

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpg" ? "jpeg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpeg";
}

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildStallionPhotoStoragePath(
  stallionId: string,
  kind: "primary" | "gallery",
  file: File,
  slugHint?: string
): string {
  const ext = extensionForFile(file);
  const base = slugifySegment(slugHint ?? "") || stallionId.slice(0, 8);
  const suffix =
    kind === "primary" ? "hero" : `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `stallions/${stallionId}/images/${kind}/${base}-${suffix}.${ext}`;
}

export function validateStallionPhotoFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Use JPEG, PNG, WebP, or GIF.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadStallionPhoto(params: {
  file: File;
  stallionId: string;
  kind: "primary" | "gallery";
  slugHint?: string;
}): Promise<{ path: string } | { error: string }> {
  const validationError = validateStallionPhotoFile(params.file);
  if (validationError) {
    return { error: validationError };
  }

  const path = buildStallionPhotoStoragePath(
    params.stallionId,
    params.kind,
    params.file,
    params.slugHint
  );

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STALLION_PHOTOS_BUCKET)
    .upload(path, params.file, {
      upsert: true,
      contentType: params.file.type,
      // Upload paths include a random suffix and are never overwritten in
      // place, so it's safe to cache aggressively — this value is carried
      // through unchanged when a photo is copied to the public bucket on
      // publish.
      cacheControl: "31536000",
    });

  if (error) {
    return { error: error.message || "Upload failed." };
  }

  return { path };
}

export async function removeStallionPhotoPaths(
  paths: string[]
): Promise<void> {
  const unique = [
    ...new Set(
      paths.map((p) => p.trim().replace(/^\/+/, "")).filter(Boolean)
    ),
  ];
  if (unique.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STALLION_PHOTOS_BUCKET)
    .remove(unique);

  if (error) {
    console.error("removeStallionPhotoPaths:", error.message);
  }
}

// --- sync-stallion-images.ts ---

export type SyncStallionImagesInput = {
  primary_image_url: string;
  gallery: FormGalleryItem[];
};

export type SyncStallionImagesResult =
  | { ok: true }
  | { ok: false; error: string };

/** Persist primary + gallery rows in `stallion_images` after form save. */
export async function syncStallionImagesFromForm(
  stallionId: string,
  media: SyncStallionImagesInput,
  client: SupabaseClient
): Promise<SyncStallionImagesResult> {
  const id = stallionId.trim();
  if (!id) {
    return { ok: false, error: "Stallion id is required to sync images." };
  }

  const primaryPath = normalizeStallionImageStoragePath(media.primary_image_url);
  const galleryPaths = (media.gallery ?? [])
    .map((item) => normalizeStallionImageStoragePath(item.url))
    .filter(Boolean);

  const { data: existing, error: fetchError } = await client
    .from("stallion_images")
    .select("id, kind, position, filename")
    .eq("stallion_id", id);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const previousPaths = (existing ?? [])
    .map((row) =>
      normalizeStallionImageStoragePath(row.filename as string | undefined)
    )
    .filter(Boolean);

  const desiredPaths = new Set(
    [primaryPath, ...galleryPaths].filter(Boolean)
  );
  const pathsToDeleteFromStorage = previousPaths.filter(
    (path) =>
      !desiredPaths.has(path) &&
      bucketForStallionImagePath(path) === STALLION_PHOTOS_BUCKET
  );

  const { error: deletePrimaryError } = await client
    .from("stallion_images")
    .delete()
    .eq("stallion_id", id)
    .eq("kind", "primary");

  if (deletePrimaryError) {
    return { ok: false, error: deletePrimaryError.message };
  }

  const { error: deleteGalleryError } = await client
    .from("stallion_images")
    .delete()
    .eq("stallion_id", id)
    .eq("kind", "gallery");

  if (deleteGalleryError) {
    return { ok: false, error: deleteGalleryError.message };
  }

  if (primaryPath) {
    const { error: insertPrimaryError } = await client
      .from("stallion_images")
      .insert({
        stallion_id: id,
        kind: "primary",
        position: 1,
        filename: primaryPath,
      });

    if (insertPrimaryError) {
      return { ok: false, error: insertPrimaryError.message };
    }
  }

  if (galleryPaths.length > 0) {
    const rows = galleryPaths.map((filename, index) => ({
      stallion_id: id,
      kind: "gallery" as const,
      position: index + 1,
      filename,
    }));

    const { error: insertGalleryError } = await client
      .from("stallion_images")
      .insert(rows);

    if (insertGalleryError) {
      return { ok: false, error: insertGalleryError.message };
    }
  }

  if (pathsToDeleteFromStorage.length > 0) {
    await removeStallionPhotoPaths(pathsToDeleteFromStorage);
  }

  return { ok: true };
}

/**
 * Write `stallion_images` rows so directory/profile fetches (via `mapImages`) resolve media.
 * Call after uploads and on wizard save.
 */
export async function persistStallionMediaMetadata(
  stallionId: string,
  media: SyncStallionImagesInput,
  client: SupabaseClient
): Promise<SyncStallionImagesResult> {
  return syncStallionImagesFromForm(stallionId, media, client);
}

export async function persistStallionMediaMetadataFromBrowser(
  stallionId: string,
  media: SyncStallionImagesInput
): Promise<SyncStallionImagesResult> {
  return persistStallionMediaMetadata(stallionId, media, createClient());
}

export async function updateStallionVideoUrl(
  stallionId: string,
  videoUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = videoUrl.trim();
  const { error } = await createClient()
    .from("stallions")
    .update({ video_url: trimmed || null })
    .eq("id", stallionId);

  if (error) {
    return { ok: false, error: error.message || "Could not save video URL." };
  }

  return { ok: true };
}
// --- stallion-publish.ts ---

export type SetStallionPublishStatusResult =
  | {
      ok: true;
      stallion_id: string;
      publish_status: AdminStallionPublishStatus;
      unchanged?: boolean;
      /** Non-blocking: set when publish succeeded but syncing photos to the public bucket partially failed. */
      photoSyncWarning?: string;
    }
  | {
      ok: false;
      code: string;
      error: string;
      field?: string;
      details?: Record<string, unknown>;
      validationMessages?: string[];
    };


function parseResult(
  data: unknown,
  expectedStatus: AdminStallionPublishStatus
): SetStallionPublishStatusResult {
  if (!isRecord(data)) {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      error: "Unexpected response from server.",
    };
  }

  if (data.ok === true && typeof data.stallion_id === "string") {
    const status =
      data.publish_status === "published" || data.publish_status === "draft"
        ? data.publish_status
        : expectedStatus;
    return {
      ok: true,
      stallion_id: data.stallion_id,
      publish_status: status,
      unchanged: data.unchanged === true,
    };
  }

  const details = isRecord(data.details) ? data.details : undefined;
  const validationMessages = validationMessagesFromRpcDetails(details);

  return {
    ok: false,
    code: typeof data.code === "string" ? data.code : "UNKNOWN",
    error:
      typeof data.error === "string"
        ? data.error
        : "Failed to update publish status.",
    field: typeof data.field === "string" ? data.field : undefined,
    details,
    validationMessages:
      validationMessages.length > 0 ? validationMessages : undefined,
  };
}


export async function setStallionPublishStatusWithClient(
  supabase: SupabaseClient,
  stallionId: string,
  publishStatus: AdminStallionPublishStatus
): Promise<SetStallionPublishStatusResult> {
  const { data, error } = await supabase.rpc("set_stallion_publish_status", {
    p_stallion_id: stallionId,
    p_publish_status: publishStatus,
  });

  if (error) {
    const authFailure =
      error.code === "PGRST301" ||
      /jwt|401|not authenticated/i.test(error.message ?? "");
    return {
      ok: false,
      code: authFailure ? "NOT_AUTHENTICATED" : "RPC_ERROR",
      error: rpcAuthErrorMessage(error),
    };
  }

  return parseResult(data, publishStatus);
}

export async function setStallionPublishStatus(
  stallionId: string,
  publishStatus: AdminStallionPublishStatus
): Promise<SetStallionPublishStatusResult> {
  return setStallionPublishStatusWithClient(
    createClient(),
    stallionId,
    publishStatus
  );
}

export function publishStallion(stallionId: string) {
  return setStallionPublishStatus(stallionId, "published");
}

export function unpublishStallion(stallionId: string) {
  return setStallionPublishStatus(stallionId, "draft");
}

// --- stallion-form-rpc.ts ---

export type StallionFormRpcResult =
  | {
      ok: true;
      stallion_id: string;
      publish_status?: AdminStallionPublishStatus;
    }
  | {
      ok: false;
      code: string;
      error: string;
      field?: string;
      details?: Record<string, unknown>;
      validationMessages?: string[];
    };

function parseStallionFormRpcResult(data: unknown): StallionFormRpcResult {
  if (!isRecord(data)) {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      error: "Unexpected response from server.",
    };
  }

  if (data.ok === true && typeof data.stallion_id === "string") {
    const publishStatus =
      data.publish_status === "published" || data.publish_status === "draft"
        ? data.publish_status
        : undefined;
    return {
      ok: true,
      stallion_id: data.stallion_id,
      publish_status: publishStatus,
    };
  }

  const details = isRecord(data.details) ? data.details : undefined;
  const validationMessages = validationMessagesFromRpcDetails(details);

  return {
    ok: false,
    code: typeof data.code === "string" ? data.code : "UNKNOWN",
    error:
      typeof data.error === "string"
        ? data.error
        : "Failed to save stallion.",
    field: typeof data.field === "string" ? data.field : undefined,
    details,
    validationMessages:
      validationMessages.length > 0 ? validationMessages : undefined,
  };
}

export async function updatePerformanceStepDraftWithClient(
  supabase: SupabaseClient,
  stallionId: string,
  performanceSummary: string
): Promise<StallionFormRpcResult> {
  const id = stallionId.trim();
  if (!id) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "Stallion id is required for update.",
      field: "id",
    };
  }

  const { data, error } = await supabase
    .from("stallions")
    .update({
      performance_summary: performanceSummary.trim() || null,
    })
    .eq("id", id)
    .select("id, publish_status")
    .single();

  if (error || !data) {
    return {
      ok: false,
      code: "RPC_ERROR",
      error: error?.message ?? "Failed to save performance summary.",
    };
  }

  const row = data as { id: string; publish_status?: string };
  const publishStatus =
    row.publish_status === "published" || row.publish_status === "draft"
      ? row.publish_status
      : undefined;

  return {
    ok: true,
    stallion_id: row.id,
    publish_status: publishStatus,
  };
}

export async function createDraftStallionWithClient(
  supabase: SupabaseClient,
  stallionName: string,
  horseType: HorseType = "stallion"
): Promise<StallionFormRpcResult> {
  const name = stallionName.trim();
  if (!name) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "Registered name is required.",
      field: "stallion_name",
    };
  }

  const { data, error } = await supabase.rpc("create_stallion_from_form", {
    p_payload: {
      stallion_name: name,
      horse_type: horseType,
      save_mode: "draft",
    },
  });

  if (error) {
    const authFailure =
      error.code === "PGRST301" ||
      /jwt|401|not authenticated/i.test(error.message ?? "");
    return {
      ok: false,
      code: authFailure ? "NOT_AUTHENTICATED" : "RPC_ERROR",
      error: rpcAuthErrorMessage(error),
    };
  }

  return parseStallionFormRpcResult(data);
}

export async function createDraftStallionFromBrowser(
  stallionName: string,
  horseType: HorseType = "stallion"
): Promise<StallionFormRpcResult> {
  return createDraftStallionWithClient(createClient(), stallionName, horseType);
}

export function mareEtDetailsHasData(values: FormMareEtDetails): boolean {
  return (
    values.et_status.trim() !== "" ||
    values.clinic_name.trim() !== "" ||
    values.clinic_location.trim() !== "" ||
    values.flush_history.trim() !== "" ||
    values.embryo_fee.trim() !== "" ||
    values.embryo_fee_currency.trim() !== "" ||
    values.embryo_availability.trim() !== "" ||
    values.last_verified_at.trim() !== "" ||
    values.admin_notes.trim() !== "" ||
    values.international_availability === true
  );
}

/**
 * Persist the ET Program step for a donor mare. Direct child-table upsert under
 * the authenticated RLS policy (same pattern as stallion_images / racing summary);
 * deliberately outside update_stallion_from_form.
 */
export async function upsertMareEtDetailsWithClient(
  supabase: SupabaseClient,
  stallionId: string,
  values: FormMareEtDetails
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = stallionId.trim();
  if (!id) {
    return { ok: false, error: "Stallion id is required." };
  }

  const toNull = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const feeRaw = values.embryo_fee.trim();
  const embryo_fee = feeRaw === "" ? null : Number(feeRaw);
  if (embryo_fee != null && !Number.isFinite(embryo_fee)) {
    return { ok: false, error: "Embryo fee must be a number." };
  }

  if (!mareEtDetailsHasData(values)) {
    const { error } = await supabase
      .from("mare_et_details")
      .delete()
      .eq("stallion_id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("mare_et_details").upsert(
    {
      stallion_id: id,
      et_status: toNull(values.et_status),
      clinic_name: toNull(values.clinic_name),
      clinic_location: toNull(values.clinic_location),
      flush_history: toNull(values.flush_history),
      embryo_fee,
      embryo_fee_currency: toNull(values.embryo_fee_currency),
      embryo_availability: toNull(values.embryo_availability),
      last_verified_at: toNull(values.last_verified_at),
      international_availability: values.international_availability,
      admin_notes: toNull(values.admin_notes),
    },
    { onConflict: "stallion_id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function stripTempId<T extends { tempId?: string }>(
  rows: T[]
): Omit<T, "tempId">[] {
  return rows.map(({ tempId: _tempId, ...rest }) => rest);
}

export function formValuesToRpcPayload(
  values: StallionFormValues
): Record<string, unknown> {
  const {
    performance_records: _perf,
    racing_records: _racing,
    racing_summary: _racingSummary,
    notable_progeny: _progeny,
    foal_crops: _crops,
    primary_image_url: _primary,
    gallery: _gallery,
    publish_status: _publish,
    stud_fees,
    breeding_service_providers,
    genetic_tests,
    colour_tests,
    owner_links: _owner_links,
    et_details: _et_details,
    year_of_birth,
    ...rest
  } = values;

  return {
    ...rest,
    date_of_birth: year_of_birth.trim() || null,
    save_mode: "draft",
    stud_fees: stripTempId(stud_fees).map(({ value, currency }) => ({
      value,
      currency,
    })),
    breeding_service_providers: breeding_service_providers.map(
      ({ id: _id, ...rest }) => rest
    ),
    genetic_tests: genetic_tests.map(({ id: _id, ...rest }) => rest),
    colour_tests: colour_tests.map(({ id: _id, ...rest }) => rest),
  };
}

export async function updateStallionDraftWithClient(
  supabase: SupabaseClient,
  values: StallionFormValues
): Promise<StallionFormRpcResult> {
  const id = values.id?.trim();
  const name = values.stallion_name?.trim();
  if (!id) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "Stallion id is required for update.",
      field: "id",
    };
  }
  if (!name) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "Registered name is required.",
      field: "stallion_name",
    };
  }

  const { data, error } = await supabase.rpc("update_stallion_from_form", {
    p_payload: formValuesToRpcPayload(values),
  });

  if (error) {
    const authFailure =
      error.code === "PGRST301" ||
      /jwt|401|not authenticated/i.test(error.message ?? "");
    return {
      ok: false,
      code: authFailure ? "NOT_AUTHENTICATED" : "RPC_ERROR",
      error: rpcAuthErrorMessage(error),
    };
  }

  return parseStallionFormRpcResult(data);
}
