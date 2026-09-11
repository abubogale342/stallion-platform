"use client";

import { sendPasswordResetEmail } from "@/services/auth";
import AccentLink from "@/ui/AccentLink";
import Button from "@/ui/Button";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await sendPasswordResetEmail(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Reset password
        </h1>
        <p className="text-sm text-zinc-400">
          Enter your email and we will send a reset link if an account exists.
        </p>
      </div>
      {done ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          If that email is on file, a reset link is on its way.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-6"
        >
          {error ? (
            <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium normal-case tracking-normal text-zinc-400">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              variant="public"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border-zinc-700 py-2"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full rounded py-2.5 text-sm">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="text-center text-sm text-zinc-500">
        <AccentLink href="/login" variant="inline">
          Back to sign in
        </AccentLink>
      </p>
    </div>
  );
}
