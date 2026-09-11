import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "stallion-research";

/**
 * Language of the source material in an uploaded image. Must stay in sync with
 * stallion_research_snippets_images_locale_check in the database.
 */
const RESEARCH_LOCALES = ["en", "pt-BR"] as const;
const DEFAULT_RESEARCH_LOCALE = "en";

function normalizeResearchLocale(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return DEFAULT_RESEARCH_LOCALE;
  return (RESEARCH_LOCALES as readonly string[]).includes(raw) ? raw : null;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  headers: HeadersInit
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function sanitizeFileName(name: string, fallback: string): string {
  const base = (name || fallback).trim().toLowerCase();
  const cleaned = base
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function fileExtensionForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

Deno.serve(async (req) => {
  const headers = corsHeaders();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      405,
      { error: "Method not allowed. Use POST multipart/form-data." },
      headers
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(
      500,
      { error: "Server not configured with required Supabase secrets." },
      headers
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Missing Bearer token." }, headers);
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: "Unauthorized request." }, headers);
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(
        400,
        {
          error:
            "Invalid content type. Send multipart/form-data with snippet_uuid and images.",
        },
        headers
      );
    }

    const formData = await req.formData();
    const snippetId = String(formData.get("snippet_uuid") ?? "").trim();
    const imageParts = formData.getAll("images");
    const providedNames = formData
      .getAll("names")
      .map((n) => String(n ?? "").trim());
    const locale = normalizeResearchLocale(formData.get("locale"));

    if (!snippetId) {
      return jsonResponse(400, { error: "Missing required field: snippet_uuid" }, headers);
    }

    if (!locale) {
      return jsonResponse(
        400,
        {
          error: `Unsupported language. Expected one of: ${RESEARCH_LOCALES.join(", ")}.`,
        },
        headers
      );
    }

    const files = imageParts.filter((p): p is File => p instanceof File);
    if (files.length === 0) {
      return jsonResponse(400, { error: "At least one image is required." }, headers);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: snippet, error: snippetError } = await adminClient
      .from("stallion_research_snippets")
      .select("id")
      .eq("id", snippetId)
      .maybeSingle();

    if (snippetError || !snippet) {
      return jsonResponse(404, { error: "Snippet not found." }, headers);
    }

    const uploaded: Array<{
      id: string;
      image_bucket_path: string;
      name: string;
      locale: string;
    }> = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        return jsonResponse(400, { error: `File ${i + 1} is not an image.` }, headers);
      }

      const requestedName = providedNames[i] || file.name || `image-${i + 1}`;
      const safeName = sanitizeFileName(requestedName, `image-${i + 1}`);
      const ext = fileExtensionForType(file.type);
      const objectPath = `${snippetId}/${Date.now()}-${i + 1}-${safeName}.${ext}`;

      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(objectPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return jsonResponse(
          400,
          { error: `Upload failed for ${requestedName}: ${uploadError.message}` },
          headers
        );
      }

      const { data: inserted, error: insertError } = await adminClient
        .from("stallion_research_snippets_images")
        .insert({
          snippet_id: snippetId,
          image_bucket_path: objectPath,
          name: requestedName,
          locale,
        })
        .select("id, image_bucket_path, name, locale")
        .single();

      if (insertError || !inserted) {
        return jsonResponse(
          400,
          {
            error: `Database insert failed for ${requestedName}: ${
              insertError?.message ?? "Unknown error"
            }`,
          },
          headers
        );
      }

      uploaded.push(inserted);
    }

    return jsonResponse(
      200,
      {
        snippet_uuid: snippetId,
        uploaded_count: uploaded.length,
        files: uploaded,
      },
      headers
    );
  } catch (err) {
    return jsonResponse(
      500,
      { error: `Unexpected error: ${(err as Error).message}` },
      headers
    );
  }
});
