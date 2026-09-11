import { createClient } from "npm:@supabase/supabase-js@2";

const INVITE_ROLES = new Set(["admin", "data_entry"]);

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

function isInviteRole(value: string): boolean {
  return INVITE_ROLES.has(value);
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 10; i += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email
    );
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: caller } = await admin
      .from("user_profile")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (caller?.role !== "owner") {
      return jsonResponse(403, { error: "Only the owner can manage staff." }, headers);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "invite").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const redirectTo = String(body?.redirect_to ?? "").trim();

    if (!email) {
      return jsonResponse(400, { error: "Email is required." }, headers);
    }

    if (action === "revoke" || action === "unban") {
      const { data: profile } = await admin
        .from("user_profile")
        .select("auth_id, role, revoked_at")
        .eq("email", email)
        .maybeSingle();

      const authId =
        typeof profile?.auth_id === "string" && profile.auth_id
          ? profile.auth_id
          : await findAuthUserIdByEmail(admin, email);

      if (!authId) {
        return jsonResponse(400, { error: "No account found for that email." }, headers);
      }
      if (authId === user.id) {
        return jsonResponse(
          400,
          { error: "You cannot change your own access here." },
          headers
        );
      }
      if (profile?.role === "owner") {
        return jsonResponse(400, { error: "Owner access cannot be changed here." }, headers);
      }
      if (!profile) {
        return jsonResponse(400, { error: "No staff profile for that email." }, headers);
      }

      if (action === "revoke") {
        const { error: profileError } = await admin
          .from("user_profile")
          .update({ revoked_at: new Date().toISOString() })
          .eq("auth_id", authId);
        if (profileError) {
          return jsonResponse(400, { error: profileError.message }, headers);
        }

        const { error: banError } = await admin.auth.admin.updateUserById(authId, {
          ban_duration: "876000h",
        });
        if (banError) {
          return jsonResponse(400, { error: banError.message }, headers);
        }

        try {
          await admin.auth.admin.signOut(authId);
        } catch {
          /* ban still blocks new sessions */
        }

        return jsonResponse(200, { ok: true }, headers);
      }

      const { error: profileError } = await admin
        .from("user_profile")
        .update({ revoked_at: null })
        .eq("auth_id", authId);
      if (profileError) {
        return jsonResponse(400, { error: profileError.message }, headers);
      }

      const { error: unbanError } = await admin.auth.admin.updateUserById(authId, {
        ban_duration: "none",
      });
      if (unbanError) {
        return jsonResponse(400, { error: unbanError.message }, headers);
      }

      return jsonResponse(200, { ok: true }, headers);
    }

    if (!/^https?:\/\//i.test(redirectTo)) {
      return jsonResponse(400, { error: "A valid redirect_to URL is required." }, headers);
    }

    if (action === "resend") {
      const { data: profile } = await admin
        .from("user_profile")
        .select("role, first_name, last_name")
        .eq("email", email)
        .maybeSingle();

      const role = String(profile?.role ?? "");
      if (!profile || !isInviteRole(role)) {
        return jsonResponse(400, { error: "No staff profile for that email." }, headers);
      }

      const { error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          first_name: profile.first_name ?? "",
          last_name: profile.last_name ?? "",
          role,
        },
      });
      if (error) {
        return jsonResponse(400, { error: error.message }, headers);
      }
      return jsonResponse(200, { ok: true }, headers);
    }

    if (action !== "invite") {
      return jsonResponse(400, { error: "Unknown action." }, headers);
    }

    const role = String(body?.role ?? "").trim();
    const firstName = String(body?.first_name ?? "").trim();
    const lastName = String(body?.last_name ?? "").trim();

    if (!isInviteRole(role)) {
      return jsonResponse(400, { error: "Role must be admin or data_entry." }, headers);
    }

    const { data: existingProfile } = await admin
      .from("user_profile")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile) {
      return jsonResponse(
        400,
        { error: "That email already has a staff profile." },
        headers
      );
    }

    const userMeta = {
      first_name: firstName,
      last_name: lastName,
      role,
    };

    async function stampAndProvision(authId: string) {
      const { data: existingAuth } = await admin.auth.admin.getUserById(authId);
      const { error: updateError } = await admin.auth.admin.updateUserById(
        authId,
        {
          user_metadata: {
            ...(existingAuth.user?.user_metadata ?? {}),
            ...userMeta,
          },
          app_metadata: {
            ...(existingAuth.user?.app_metadata ?? {}),
            role,
          },
          ban_duration: "none",
        }
      );
      if (updateError) {
        return jsonResponse(400, { error: updateError.message }, headers);
      }

      const { error: provisionError } = await admin.rpc(
        "provision_invited_user_profile",
        { p_auth_id: authId }
      );
      if (provisionError) {
        return jsonResponse(400, { error: provisionError.message }, headers);
      }
      return jsonResponse(200, { ok: true }, headers);
    }

    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: userMeta,
      });

    if (!inviteError && invited?.user?.id) {
      return await stampAndProvision(invited.user.id);
    }

    const existingId = await findAuthUserIdByEmail(admin, email);
    if (!existingId) {
      return jsonResponse(
        400,
        { error: inviteError?.message ?? "Could not invite that email." },
        headers
      );
    }

    return await stampAndProvision(existingId);
  } catch (err) {
    return jsonResponse(
      500,
      { error: `Unexpected error: ${(err as Error).message}` },
      headers
    );
  }
});
