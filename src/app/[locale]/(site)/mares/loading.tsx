import PageLoadingSkeleton from "@/ui/PageLoadingSkeleton";

/** Light skeleton so there is no dark flash before the mare directory paints. */
export default function MaresLoading() {
  return (
    <div className="profile-light min-h-screen p-6">
      <PageLoadingSkeleton
        blocks={[
          { className: "h-8 w-56 animate-pulse rounded bg-zinc-800" },
          { className: "h-16 animate-pulse rounded-xl bg-surface" },
          { className: "h-96 animate-pulse rounded-lg bg-surface" },
        ]}
      />
    </div>
  );
}
