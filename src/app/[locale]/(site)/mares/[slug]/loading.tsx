import LoadingDocumentTitle from "@/components/common/LoadingDocumentTitle";
import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

/** Light skeleton so there is no dark flash before the mare profile paints. */
export default function MareProfileLoading() {
  return (
    <>
      <LoadingDocumentTitle title="Leading Sires Registry" />
      <div className="profile-light min-h-screen p-6">
        <PageLoadingSkeleton
          blocks={[
            { className: "h-10 w-72 animate-pulse rounded bg-zinc-800" },
            { className: "h-40 animate-pulse rounded-xl bg-surface" },
            { className: "h-64 animate-pulse rounded-xl bg-surface" },
            { className: "h-64 animate-pulse rounded-xl bg-surface" },
          ]}
        />
      </div>
    </>
  );
}
