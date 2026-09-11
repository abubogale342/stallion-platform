import { fetchCmsPagesList } from "@/services/cms.server";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";
import type { CmsBlock, CmsSlug } from "@/types/cms";
import {
  isFooterLayoutPtBrComplete,
  isHeaderLayoutPtBrComplete,
  normalizeFooterLayout,
  normalizeHeaderLayout,
} from "@/utils/cms-layout-i18n";
import { isPtBrTranslationComplete, normalizeLocalizedTitle } from "@/utils/cms-i18n";
import Link from "next/link";

const ROUTES: Record<CmsSlug, { label: string; publicPath: string }> = {
  landing: { label: "Landing page", publicPath: "/" },
  about: { label: "About us", publicPath: "/about" },
  pricing: { label: "Pricing", publicPath: "/pricing" },
};

const LAYOUT_ROUTES = {
  header: { label: "Site header", editPath: "/dashboard/pages/header/edit" },
  footer: { label: "Site footer", editPath: "/dashboard/pages/footer/edit" },
} as const;

const PREVIEW_LOCALES = ["en", "pt-BR"] as const;

export default async function ManagePagesPage() {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { rows, error } = await fetchCmsPagesList();

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Manage Pages</h1>
        <p className="mt-2 text-sm text-slate-500">
          Edit marketing copy stored in Supabase. Changes appear on the public site after you save.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-300">
          Could not load pages ({error}). Apply the mini CMS migration if this table is missing.
        </p>
      ) : null}

      <div className="w-full overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
        <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">Site layout</p>
        </div>
        <ul className="divide-y divide-slate-800/80">
          {(["header", "footer"] as const).map((slug) => {
            const meta = LAYOUT_ROUTES[slug];
            const row = rows.find((r) => r.slug === slug);
            const layout =
              slug === "header"
                ? normalizeHeaderLayout(row?.layout)
                : normalizeFooterLayout(row?.layout);
            const ptComplete =
              slug === "header"
                ? isHeaderLayoutPtBrComplete(layout as ReturnType<typeof normalizeHeaderLayout>)
                : isFooterLayoutPtBrComplete(layout as ReturnType<typeof normalizeFooterLayout>);

            return (
              <li
                key={slug}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm sm:px-6"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-200">
                    {meta.label}
                    <span
                      className={
                        ptComplete
                          ? "rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400"
                          : "rounded bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400"
                      }
                    >
                      {ptComplete ? "PT complete" : "PT incomplete"}
                    </span>
                    {row?.published === false ? (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Unpublished
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Shown on all public pages
                    {row?.updated_at ? (
                      <span className="text-slate-600">
                        {" "}
                        · Updated {new Date(row.updated_at).toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={meta.editPath}
                  className="rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-950/70"
                >
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
        <div className="border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-slate-300">Pages</p>
        </div>
        <ul className="divide-y divide-slate-800/80">
          {rows.map((row) => {
            const meta = ROUTES[row.slug as CmsSlug];
            if (!meta) return null;
            const title = normalizeLocalizedTitle(row.title);
            const displayTitle = title.en.trim() || meta.label;
            const blocks = Array.isArray(row.blocks) ? (row.blocks as CmsBlock[]) : [];
            const ptComplete = blocks.length > 0 && isPtBrTranslationComplete(blocks);
            return (
              <li
                key={row.slug}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm sm:px-6"
              >
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-200">
                    {displayTitle}
                    {blocks.length > 0 ? (
                      <span
                        className={
                          ptComplete
                            ? "rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400"
                            : "rounded bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400"
                        }
                      >
                        {ptComplete ? "PT complete" : "PT incomplete"}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="text-slate-600">{meta.label}</span>
                    {" · "}
                    Preview:{" "}
                    {PREVIEW_LOCALES.map((locale, i) => (
                      <span key={locale}>
                        {i > 0 ? " · " : null}
                        <Link
                          href={`/${locale}${meta.publicPath === "/" ? "" : meta.publicPath}`}
                          className="text-sky-500/90 hover:text-sky-400 hover:underline"
                        >
                          /{locale}
                          {meta.publicPath === "/" ? "" : meta.publicPath}
                        </Link>
                      </span>
                    ))}
                    {row.updated_at ? (
                      <span className="text-slate-600">
                        {" "}
                        · Updated {new Date(row.updated_at).toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/dashboard/pages/${row.slug}/edit`}
                  className="rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-950/70"
                >
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-sm">
        <Link href="/dashboard" className="text-sky-400/90 hover:text-sky-300 hover:underline">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}
