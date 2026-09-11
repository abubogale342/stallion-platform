import LoadingDocumentTitle from "@/components/common/LoadingDocumentTitle";
import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

export default function StallionProfileLoading() {
  return (
    <>
      <LoadingDocumentTitle title="Leading Sires Registry" />
      <PageLoadingSkeleton
        blocks={[
          { className: "h-10 w-72 animate-pulse rounded bg-zinc-800" },
          { className: "h-40 animate-pulse rounded-xl bg-zinc-900" },
          { className: "h-64 animate-pulse rounded-xl bg-zinc-900" },
          { className: "h-64 animate-pulse rounded-xl bg-zinc-900" },
        ]}
      />
    </>
  );
}
