import { cn } from "@/utils/common";
import type { CmsBlock, CmsContentLocale } from "@/types/cms";
import RenderBlock from "./RenderBlock";
import type { CmsPageVariant, TextBlockCounter } from "./types";

export default async function BlockList({
  blocks,
  variant,
  locale,
  landingTextCounter,
  nested,
  gapClassName,
}: {
  blocks: CmsBlock[];
  variant: CmsPageVariant;
  locale: CmsContentLocale;
  landingTextCounter: TextBlockCounter;
  nested: boolean;
  gapClassName?: string;
}) {
  const gap =
    gapClassName ??
    (nested ? "gap-4" : variant === "pricing" ? "gap-6" : "gap-8");

  const items = await Promise.all(
    blocks.map(async (block, i) => {
      const content = await RenderBlock({
        block,
        variant,
        locale,
        landingTextCounter,
        prev: i > 0 ? blocks[i - 1] : undefined,
        nested,
      });

      return (
        <div
          key={`${block.type}-${i}`}
          className="w-full min-w-0"
          data-cms-block={block.type}
        >
          {content}
        </div>
      );
    })
  );

  return <div className={cn("flex w-full min-w-0 flex-col", gap)}>{items}</div>;
}
