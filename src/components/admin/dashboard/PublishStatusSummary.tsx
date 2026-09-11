export default function PublishStatusSummary({
  published,
  draft,
}: {
  published: number;
  draft: number;
}) {
  const total = published + draft;

  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Publish status
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Published</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-300/90">
            {published}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Draft</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-amber-300/90">
            {draft}
          </p>
        </div>
      </div>
      {total > 0 ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500/70"
            style={{ width: `${Math.round((published / total) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
