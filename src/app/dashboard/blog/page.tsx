import Link from "next/link";
import AccessDenied from "@/components/admin/AccessDenied";
import EmptyState from "@/ui/EmptyState";
import { requireDashboardPage } from "@/services/dashboard-page";
import { fetchBlogAdminList } from "@/services/blog.server";
import { routing } from "@/i18n/routing";
import { localeDisplayLabels } from "@/utils/blog";

export default async function BlogAdminPage() {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) return <AccessDenied />;

  const { posts, error } = await fetchBlogAdminList();
  const labels = localeDisplayLabels(routing.locales);

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Blog
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Write, translate and publish articles. Each language publishes
            independently.
          </p>
        </div>

        <Link
          href="/dashboard/blog/new"
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
        >
          New post
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState variant="admin">
          No posts yet. Create the first one.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            // The default locale's title is the post's working name; fall back
            // to whichever language does have one so a post is never nameless.
            const titles = routing.locales
              .map((locale) => post.translations[locale]?.title?.trim())
              .filter((title): title is string => Boolean(title));
            const displayTitle = titles[0] ?? post.slug;

            return (
              <li key={post.id}>
                <Link
                  href={`/dashboard/blog/${post.id}/edit`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {displayTitle}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      /{post.slug}
                    </p>
                  </div>

                  {/* Per-locale status at a glance — without this, independent
                      publishing is impossible to manage. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {routing.locales.map((locale) => {
                      const translation = post.translations[locale];
                      const state = !translation
                        ? "empty"
                        : translation.status === "published"
                          ? "live"
                          : "draft";

                      return (
                        <span
                          key={locale}
                          className={
                            state === "live"
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300"
                              : state === "draft"
                                ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300"
                                : "rounded-full bg-slate-700/40 px-2 py-0.5 text-[11px] text-slate-500"
                          }
                          title={labels[locale] ?? locale}
                        >
                          {locale} ·{" "}
                          {state === "live"
                            ? "Published"
                            : state === "draft"
                              ? "Draft"
                              : "—"}
                        </span>
                      );
                    })}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
