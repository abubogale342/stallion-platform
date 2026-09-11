import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

export default function ResourcesLoading() {
  return (
    <PageLoadingSkeleton
      blocks={[
        { className: "h-8 w-64 animate-pulse rounded bg-zinc-800" },
        { className: "h-12 animate-pulse rounded-xl bg-zinc-900" },
        { className: "h-80 animate-pulse rounded-lg bg-zinc-900" },
      ]}
    />
  );
}
