import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

export default function AssociationsLoading() {
  return (
    <PageLoadingSkeleton
      blocks={[
        { className: "h-8 w-72 animate-pulse rounded bg-zinc-800" },
        { className: "h-80 animate-pulse rounded-lg bg-zinc-900" },
      ]}
    />
  );
}
