import { NextResponse } from "next/server";
import {
  bucketForStallionImagePath,
  normalizeStallionImageStoragePath,
} from "@/utils/stallion";
import { createServerClient } from "@/services/supabase.server";
import { createServiceRoleClient } from "@/services/supabase.admin";
import { signStallionImageStorageUrl } from "@/services/stallion-image-sign.server";

/**
 * Server proxy for signed image URLs (public pages + admin preview).
 */
export async function POST(request: Request) {
  let body: { filename?: string; bucket?: string; expiresIn?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const path = normalizeStallionImageStoragePath(body.filename);
  if (!path) {
    return NextResponse.json({ error: "Missing filename." }, { status: 400 });
  }

  const bucket = body.bucket ?? bucketForStallionImagePath(path);
  const expiresIn = Math.max(60, Math.min(Number(body.expiresIn ?? 3600), 3600));

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const signedUrl = await signStallionImageStorageUrl({
    filename: path,
    bucket,
    expiresIn,
    accessToken: session?.access_token,
  });

  if (!signedUrl) {
    const hasPrivilegedKey = Boolean(createServiceRoleClient());
    return NextResponse.json(
      {
        error: hasPrivilegedKey
          ? `Unable to sign "${path}" in bucket "${bucket}". The object may be missing from storage.`
          : "Unable to create signed URL. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to .env, then restart the dev server.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ signedUrl, bucket, filename: path });
}
