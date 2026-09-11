import { createClient } from "npm:@supabase/supabase-js@2";

const PRIVATE_BUCKET = "stallion-photos";
const PUBLIC_BUCKET = "stallion-photos-public";

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

function normalizePath(path: string | null | undefined): string {
  return (path ?? "").trim().replace(/^\/+/, "");
}

function isManagedPhotoPath(path: string): boolean {
  return path.startsWith("stallions/") && !path.includes("..");
}

function isCopyAlreadyDoneError(message: string | undefined): boolean {
  const text = (message ?? "").toLowerCase();
  return text.includes("already exists") || text.includes("duplicate");
}

Deno.serve(async (req) => {
  const headers = corsHeaders();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." }, headers);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(
      500,
      { error: "Function is not configured with required Supabase secrets." },
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

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "reconcile").trim();
    const stallionId = String(body?.stallion_id ?? "").trim();

    if (!stallionId) {
      return jsonResponse(400, { error: "stallion_id is required." }, headers);
    }
    if (action !== "reconcile" && action !== "remove") {
      return jsonResponse(400, { error: "Unknown action." }, headers);
    }

    const { data: canEdit, error: editError } = await authClient.rpc(
      "can_edit_stallion",
      { p_id: stallionId }
    );
    if (editError) {
      return jsonResponse(400, { error: editError.message }, headers);
    }
    if (canEdit !== true) {
      return jsonResponse(403, { error: "You cannot edit this horse." }, headers);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "remove") {
      const { data: role } = await authClient.rpc("current_app_role");
      if (role !== "owner" && role !== "admin") {
        return jsonResponse(
          403,
          { error: "Only an owner or admin can remove public photos." },
          headers
        );
      }
      const result = await removeAllPublicPhotos(admin, stallionId);
      return jsonResponse(200, { ok: true, ...result }, headers);
    }

    const result = await reconcilePublicPhotos(admin, stallionId);
    return jsonResponse(200, { ok: true, ...result }, headers);
  } catch (err) {
    return jsonResponse(
      500,
      { error: `Unexpected error: ${(err as Error).message}` },
      headers
    );
  }
});

type AdminClient = ReturnType<typeof createClient>;

async function listPublicBucketPaths(
  admin: AdminClient,
  stallionId: string
): Promise<Set<string>> {
  const prefixes = [
    `stallions/${stallionId}/images/primary`,
    `stallions/${stallionId}/images/gallery`,
  ];
  const paths = new Set<string>();
  for (const prefix of prefixes) {
    const { data, error } = await admin.storage.from(PUBLIC_BUCKET).list(prefix);
    if (error || !data) continue;
    for (const entry of data) {
      if (entry.id) paths.add(`${prefix}/${entry.name}`);
    }
  }
  return paths;
}

async function reconcilePublicPhotos(admin: AdminClient, stallionId: string) {
  const { data: rows, error } = await admin
    .from("stallion_images")
    .select("id, filename")
    .eq("stallion_id", stallionId);

  if (error) {
    return { copied: 0, removed: 0, failed: 1 };
  }

  const desiredPaths = new Set(
    (rows ?? [])
      .map((row) => normalizePath(row.filename))
      .filter((path) => path && isManagedPhotoPath(path))
  );

  const existingPublicPaths = await listPublicBucketPaths(admin, stallionId);

  let copied = 0;
  let failed = 0;

  for (const path of desiredPaths) {
    if (existingPublicPaths.has(path)) continue;
    const { error: copyError } = await admin.storage
      .from(PRIVATE_BUCKET)
      .copy(path, path, { destinationBucket: PUBLIC_BUCKET });
    if (copyError && !isCopyAlreadyDoneError(copyError.message)) {
      failed += 1;
      continue;
    }
    copied += 1;
  }

  const pathsToRemove = [...existingPublicPaths].filter(
    (path) => !desiredPaths.has(path)
  );

  let removed = 0;
  if (pathsToRemove.length > 0) {
    const { error: removeError } = await admin.storage
      .from(PUBLIC_BUCKET)
      .remove(pathsToRemove);
    if (removeError) {
      failed += pathsToRemove.length;
    } else {
      removed = pathsToRemove.length;
    }
  }

  const syncedIds = (rows ?? [])
    .filter((row) => desiredPaths.has(normalizePath(row.filename)))
    .map((row) => row.id);
  if (syncedIds.length > 0) {
    await admin
      .from("stallion_images")
      .update({ public_synced_at: new Date().toISOString() })
      .in("id", syncedIds);
  }

  return { copied, removed, failed };
}

async function removeAllPublicPhotos(admin: AdminClient, stallionId: string) {
  const existingPublicPaths = await listPublicBucketPaths(admin, stallionId);
  if (existingPublicPaths.size === 0) return { removed: 0, failed: 0 };

  const { error } = await admin.storage
    .from(PUBLIC_BUCKET)
    .remove([...existingPublicPaths]);

  if (error) {
    return { removed: 0, failed: existingPublicPaths.size };
  }

  await admin
    .from("stallion_images")
    .update({ public_synced_at: null })
    .eq("stallion_id", stallionId);

  return { removed: existingPublicPaths.size, failed: 0 };
}
