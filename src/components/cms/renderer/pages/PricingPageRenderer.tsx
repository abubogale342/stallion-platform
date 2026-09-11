import type { CmsBlock, CmsContentLocale } from "@/types/cms";
import BlockList from "../BlockList";

export default async function PricingPageRenderer({
  blocks,
  locale,
}: {
  blocks: CmsBlock[];
  locale: CmsContentLocale;
}) {
  const landingTextCounter = { n: 0 };
  const head2 = blocks.slice(0, 2);
  const rest = blocks.slice(2);

  const headContent = await BlockList({
    blocks: head2,
    variant: "pricing",
    locale,
    landingTextCounter,
    nested: false,
  });

  const restContent = await BlockList({
    blocks: rest,
    variant: "pricing",
    locale,
    landingTextCounter,
    nested: false,
  });

  return (
    <div className="min-h-screen bg-black px-6 py-12 text-zinc-200">
      <div className="mx-auto w-full max-w-4xl space-y-12">
        <header className="text-center">{headContent}</header>
        {restContent}
      </div>
    </div>
  );
}
