import Link from "next/link";
import { notFound } from "next/navigation";
import ResearchImageActions from "@/components/research/ResearchImageActions";
import ResearchImagesSection from "@/components/research/ResearchImagesSection";
import { fetchResearchSnippetDetail } from "@/services/research.server";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";

export default async function ResearchStallionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { id } = await params;
  const result = await fetchResearchSnippetDetail(id);

  if (!result.ok) {
    return notFound();
  }

  const { snippet: row, stallion: stallionRow, images: signedImages, imagesError } = result;

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard/research-stallions"
          className="inline-flex text-xs font-medium uppercase tracking-wider text-sky-400/80 hover:text-sky-300"
        >
          ← Back to Reseach Stallions
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {stallionRow.stallion_name?.trim() || "Unnamed Stallion"}
        </h1>
        {row.description?.trim() || row.extracted_summary?.trim() ? (
          <p className="max-w-3xl text-sm text-slate-400">
            {row.description?.trim() || row.extracted_summary?.trim()}
          </p>
        ) : null}
      </div>

      <ResearchImagesSection snippetId={row.id}>
        {imagesError ? (
          <div className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            Failed to load research images: {imagesError}
          </div>
        ) : signedImages.length === 0 ? (
          <p className="text-sm text-slate-500">No research images uploaded yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {signedImages.map((img) => (
              <li
                key={img.id}
                className="space-y-3 rounded-lg border border-slate-800/90 bg-slate-950/40 p-4"
              >
                {img.src ? (
                  <a href={img.src} target="_blank" rel="noreferrer">
                    <img
                      src={img.src}
                      alt={img.title}
                      className="h-56 w-full rounded bg-zinc-900 object-cover transition-opacity hover:opacity-90"
                    />
                  </a>
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded bg-zinc-900 text-xs text-slate-500">
                    Unable to render image
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-300">{img.title}</p>
                  <span className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {img.localeLabel}
                  </span>
                </div>
                <ResearchImageActions
                  imageId={img.id}
                  imageBucketPath={img.imageBucketPath}
                  initialName={img.title}
                />
              </li>
            ))}
          </ul>
        )}
      </ResearchImagesSection>
    </div>
  );
}
