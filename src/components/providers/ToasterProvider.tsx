"use client";

import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-xl",
          title: "text-zinc-100",
          description: "text-zinc-400",
        },
      }}
    />
  );
}
