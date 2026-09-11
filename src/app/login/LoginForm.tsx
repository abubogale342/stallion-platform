"use client";

import { signInWithPassword } from "@/services/auth";
import AccentLink from "@/ui/AccentLink";
import Button from "@/ui/Button";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import PasswordInput from "@/ui/PasswordInput";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function safeRedirectPath(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/dashboard";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  return trimmed;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"));
  const resetNotice = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signInWithPassword(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Sign in
        </h1>
        <p className="text-sm text-zinc-400">
          Use your Supabase account email and password.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-6"
      >
        {resetNotice ? (
          <p className="rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            Password updated. Sign in with your new password.
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium normal-case tracking-normal text-zinc-400">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            variant="public"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border-zinc-700 py-2"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium normal-case tracking-normal text-zinc-400">
            Password
          </Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            variant="public"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border-zinc-700 py-2"
          />
        </div>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          loading={loading}
          className="w-full rounded py-2.5 text-sm"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm">
          <AccentLink href="/auth/forgot-password" variant="inline">
            Forgot password?
          </AccentLink>
        </p>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <AccentLink href="/" variant="inline">
          Back to home
        </AccentLink>
      </p>
    </div>
  );
}
