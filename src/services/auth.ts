import { createClient } from "@/services/supabase";

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await createClient().auth.getSession();

  if (error || !session?.access_token) return null;
  return session.access_token;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendPasswordResetEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await createClient().auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: `${origin}/auth/reset-password` }
  );
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateAccountPassword(
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient().auth.updateUser({ password });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
