"use client";

import { signOut } from "@/services/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/ui/Button";

type Props = {
  className?: string;
};

export default function SignOutButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        "border border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800"
      }
    >
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
