"use client";

import { createClient } from "@/services/supabase";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import AccentLink from "@/ui/AccentLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();

    async function establishSession() {
      const tokenHash = searchParams.get("token_hash");
      const type = (searchParams.get("type") as EmailOtpType | null) ?? "recovery";

      if (tokenHash) {
        const { error: verifyError } = await client.auth.verifyOtp({
          type: type === "recovery" ? "recovery" : type,
          token_hash: tokenHash,
        });
        if (verifyError && !cancelled) {
          setError("This reset link is missing, expired, or already used.");
          return;
        }
      }

      const {
        data: { session },
      } = await client.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setError("This reset link is missing, expired, or already used.");
        return;
      }
      setReady(true);
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </p>
        <AccentLink href="/auth/forgot-password" variant="inline">
          Request a new reset link
        </AccentLink>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-zinc-500">
        Checking reset link…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <SetPasswordForm
        title="Set a new password"
        submitLabel="Update password"
        onSuccess={() => {
          router.push("/login?reset=1");
          router.refresh();
        }}
      />
    </div>
  );
}
