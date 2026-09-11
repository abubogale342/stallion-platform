import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Optional server-only client for privileged storage reads (e.g. signed image URLs).
 * Set SUPABASE_SERVICE_ROLE_KEY in .env — never expose as NEXT_PUBLIC_*.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
