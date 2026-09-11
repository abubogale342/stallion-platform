"use client";

import { createClient } from "@/services/supabase";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";

function otpTypeFromQuery(raw: string | null): EmailOtpType | null {
  if (raw === "invite" || raw === "recovery" || raw === "magiclink" || raw === "email") {
    return raw;
  }
  return null;
}

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();

    async function establishSession() {
      const tokenHash = searchParams.get("token_hash");
      const type = otpTypeFromQuery(searchParams.get("type")) ?? "invite";

      if (tokenHash) {
        const { error: verifyError } = await client.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (verifyError && !cancelled) {
          setError(
            "This invite link is missing, expired, or already used. Ask an owner to resend the invite."
          );
          setReady(false);
          return;
        }
      }

      const {
        data: { session },
      } = await client.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setError(
          "This invite link is missing, expired, or already used. Ask an owner to resend the invite."
        );
        setReady(false);
        return;
      }
      setError(null);
      setReady(true);
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-200">
        <p>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-zinc-500">
        Checking invite…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <SetPasswordForm
        title="Create your password"
        submitLabel="Save password and continue"
        onSuccess={() => {
          router.push("/dashboard");
          router.refresh();
        }}
      />
    </div>
  );
}
