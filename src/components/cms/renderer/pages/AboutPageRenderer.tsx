import type { CmsBlock, CmsContentLocale } from "@/types/cms";
import BlockList from "../BlockList";
import RenderBlock from "../RenderBlock";

export default async function AboutPageRenderer({
  blocks,
  locale,
}: {
  blocks: CmsBlock[];
  locale: CmsContentLocale;
}) {
  const landingTextCounter = { n: 0 };
  const gridIdx = blocks.findIndex((b) => b.type === "grid");
  const head = gridIdx === -1 ? blocks : blocks.slice(0, gridIdx);
  const grid = gridIdx === -1 ? null : blocks[gridIdx];
  const foot = gridIdx === -1 ? [] : blocks.slice(gridIdx + 1);

  const headContent = await BlockList({
    blocks: head,
    variant: "about",
    locale,
    landingTextCounter,
    nested: false,
  });

  const gridContent = grid
    ? await RenderBlock({
        block: grid,
        variant: "about",
        locale,
        landingTextCounter,
        prev: undefined,
        nested: false,
      })
    : null;

  const footContent =
    foot.length > 0
      ? await BlockList({
          blocks: foot,
          variant: "about",
          locale,
          landingTextCounter,
          nested: false,
        })
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-20 px-6 pb-24">
      <header className="pt-16 text-center">{headContent}</header>
      <hr className="border-t border-zinc-900" />
      {grid ? (
        <div className="w-full min-w-0" data-cms-block="grid">
          {gridContent}
        </div>
      ) : null}
      {footContent ? <footer className="pt-16">{footContent}</footer> : null}
    </div>
  );
}
