import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import BlogBodyRenderer from "@/components/blog/BlogBodyRenderer";
import {
  fetchPublishedBlogPost,
  fetchPublishedLocalesForSlug,
} from "@/services/blog.server";
import {
  buildAvailableLocaleAlternates,
  buildBlogArticleJsonLd,
} from "@/utils/seo";

type BlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Request-memoised so `generateMetadata` and the page share one round-trip. */
const getPost = cache((locale: string, slug: string) =>
  fetchPublishedBlogPost(locale, slug)
);

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) return {};

  const availableLocales = await fetchPublishedLocalesForSlug(slug);

  return {
    title: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    alternates: buildAvailableLocaleAlternates(
      locale,
      `/blog/${post.slug}`,
      availableLocales.length > 0 ? availableLocales : [locale]
    ),
    openGraph: {
      title: post.title,
      ...(post.excerpt ? { description: post.excerpt } : {}),
      type: "article",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.featuredImageUrl ? { images: [post.featuredImageUrl] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale, slug);
  // Not published in this locale — no fallback to another language.
  if (!post) notFound();

  const [t, format] = await Promise.all([
    getTranslations("blog"),
    getFormatter(),
  ]);

  const jsonLd = buildBlogArticleJsonLd({
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.featuredImageUrl ? { imageUrl: post.featuredImageUrl } : {}),
    locale,
    slug: post.slug,
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
  });

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="text-xs font-medium text-sky-400 hover:text-sky-300"
      >
        ← {t("backToBlog")}
      </Link>

      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          {post.title}
        </h1>

        {post.publishedAt ? (
          <time
            dateTime={post.publishedAt}
            className="block text-xs uppercase tracking-wide text-zinc-500"
          >
            {format.dateTime(new Date(post.publishedAt), {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        ) : null}

        {post.excerpt ? (
          <p className="text-base text-zinc-400">{post.excerpt}</p>
        ) : null}
      </header>

      {post.featuredImageUrl ? (
        <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-900">
          <Image
            src={post.featuredImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-8">
        <BlogBodyRenderer body={post.body} />
      </div>
    </article>
  );
}
