import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders();

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const filename = String(body?.filename ?? "").trim();
    const bucket = String(body?.bucket ?? "stallion-images").trim();
    const expiresIn = Math.max(60, Math.min(Number(body?.expiresIn ?? 3600), 3600));

    if (!filename) {
      return new Response(
        JSON.stringify({ error: "Missing required field: filename" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured with Supabase secrets." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const objectPath = filename.replace(/^\/+/, "");

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);

    if (error || !data?.signedUrl) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Unable to create signed URL." }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        signedUrl: data.signedUrl,
        expiresIn,
        bucket,
        filename: objectPath,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${(err as Error).message}` }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
