"use client";

import type { CmsBlock } from "@/types/cms";
import BlockListEditor from "./editor/BlockListEditor";

export default function CmsGuiEditor({
  blocks,
  onChange,
}: {
  blocks: CmsBlock[];
  onChange: (next: CmsBlock[]) => void;
}) {
  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <p className="text-xs font-medium text-slate-400">Visual editor</p>
      <BlockListEditor blocks={blocks} onChange={onChange} />
    </div>
  );
}
