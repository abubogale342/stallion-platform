import Skeleton from "./Skeleton";

type SkeletonBlock = {
  className: string;
};

type PageLoadingSkeletonProps = {
  blocks: SkeletonBlock[];
};

export default function PageLoadingSkeleton({
  blocks,
}: PageLoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => (
        <Skeleton key={`${block.className}-${idx}`} className={block.className} />
      ))}
    </div>
  );
}
