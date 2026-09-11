"use client";

import { cn } from "@/utils/common";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Input from "./Input";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export default function PasswordInput({
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((open) => !open)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500 transition-colors hover:text-zinc-200 focus:outline-none focus-visible:text-zinc-200"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
