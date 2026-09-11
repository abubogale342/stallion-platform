import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

export default function StallionsLoading() {
  return (
    <PageLoadingSkeleton
      blocks={[
        { className: "h-8 w-56 animate-pulse rounded bg-zinc-800" },
        { className: "h-16 animate-pulse rounded-xl bg-zinc-900" },
        { className: "h-96 animate-pulse rounded-lg bg-zinc-900" },
      ]}
    />
  );
}
