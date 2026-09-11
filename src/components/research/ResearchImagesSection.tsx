"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AddNewResearchModal from "@/components/research/AddNewResearchModal";
import { ResearchImagesRefreshContext } from "@/components/research/research-images-refresh-context";

export default function ResearchImagesSection({
  snippetId,
  children,
}: {
  snippetId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <ResearchImagesRefreshContext.Provider value={{ refresh }}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
            Research Images
          </h2>
          <AddNewResearchModal
            snippetId={snippetId}
            showStallionNameInput={false}
            buttonLabel="Add Images"
            title="Add Research Images"
            onAfterUpload={refresh}
          />
        </div>

        <div className="relative min-h-[4rem]">
          {isPending ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-800/80 bg-black/55 backdrop-blur-sm"
              aria-busy="true"
              aria-live="polite"
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-[#c09a64]" />
              <span className="text-sm text-slate-300">Loading images…</span>
            </div>
          ) : null}
          <div
            className={
              isPending ? "pointer-events-none select-none opacity-50" : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
    </ResearchImagesRefreshContext.Provider>
  );
}
