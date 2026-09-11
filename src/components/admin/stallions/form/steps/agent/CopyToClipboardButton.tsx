"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/ui/Button";

/**
 * Copies outreach copy so an admin can paste it into the channel by hand.
 *
 * `navigator.clipboard` is unavailable on insecure origins and can be refused
 * by permissions policy, so a failure is reported in the button label rather
 * than thrown — the admin needs to know to select the text manually, not to see
 * a blank button that silently did nothing.
 */
export default function CopyToClipboardButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flash = (next: "copied" | "failed") => {
    setState(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), 2000);
  };

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      // Copying an empty draft would report success while putting nothing on
      // the clipboard, which reads as the button being broken.
      disabled={!value.trim()}
      aria-live="polite"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
