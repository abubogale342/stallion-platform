import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import EmptyState from "@/ui/EmptyState";
import Pagination from "@/ui/Pagination";
import { fetchPublishedBlogListPage } from "@/services/blog.server";
import { buildLocaleAlternates } from "@/utils/seo";

type BlogListPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ page?: string }>;
};

const POSTS_PER_PAGE = 9;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
  searchParams,
}: BlogListPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const resolved = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number.parseInt(resolved?.page ?? "1", 10) || 1);

  // Page 2 and beyond are distinct URLs and must not claim page 1 as their
  // canonical, or search engines collapse the archive into a single page.
  const alternates = buildLocaleAlternates(locale, "/blog");
  if (page > 1) {
    alternates.canonical = `${String(alternates.canonical)}?page=${page}`;
  }

  return {
    title: t("title"),
    description: t("subtitle"),
    alternates,
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      type: "website",
    },
  };
}

export default async function BlogListPage({
  params,
  searchParams,
}: BlogListPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolved = searchParams ? await searchParams : undefined;
  const currentPage = Math.max(
    1,
    Number.parseInt(resolved?.page ?? "1", 10) || 1
  );

  const [t, format, result] = await Promise.all([
    getTranslations("blog"),
    getFormatter(),
    fetchPublishedBlogListPage(locale, {
      page: currentPage,
      pageSize: POSTS_PER_PAGE,
    }),
  ]);

  const posts = result.rows;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold text-white">{t("title")}</h1>
        <p className="text-sm text-zinc-400">{t("subtitle")}</p>
      </header>

      {posts.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-zinc-600"
              >
                {post.featuredImageUrl ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                    <Image
                      src={post.featuredImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col gap-2 p-4">
                  {post.publishedAt ? (
                    <time
                      dateTime={post.publishedAt}
                      className="text-xs uppercase tracking-wide text-zinc-500"
                    >
                      {format.dateTime(new Date(post.publishedAt), {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  ) : null}

                  <h2 className="text-lg font-semibold text-white">
                    {post.title}
                  </h2>

                  {post.excerpt ? (
                    <p className="line-clamp-3 text-sm text-zinc-400">
                      {post.excerpt}
                    </p>
                  ) : null}

                  <span className="mt-auto pt-2 text-xs font-medium text-sky-400">
                    {t("readMore")}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 ? (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          pageSize={result.pageSize}
          total={result.total}
          variant="public"
          // The public variant uses the locale-aware Link, which adds the prefix.
          hrefPath="/blog"
          className="mt-10"
        />
      ) : null}
    </div>
  );
}
