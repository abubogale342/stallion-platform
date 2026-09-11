"use client";

import Button from "@/ui/Button";
import Label from "@/ui/Label";
import PasswordInput from "@/ui/PasswordInput";
import { useState } from "react";
import { updateAccountPassword } from "@/services/auth";

export default function SetPasswordForm({
  title,
  submitLabel,
  onSuccess,
}: {
  title: string;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await updateAccountPassword(password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/80 p-6"
    >
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      {error ? (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="new-password" className="text-xs font-medium normal-case tracking-normal text-zinc-400">
          New password
        </Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          variant="public"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border-zinc-700 py-2"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password" className="text-xs font-medium normal-case tracking-normal text-zinc-400">
          Confirm password
        </Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          minLength={8}
          variant="public"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded border-zinc-700 py-2"
        />
      </div>
      <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full rounded py-2.5 text-sm">
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
