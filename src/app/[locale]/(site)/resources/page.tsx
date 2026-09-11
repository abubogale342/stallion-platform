import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import DirectoryFilters from "@/components/directory/DirectoryFilters";
import DirectoryLogo from "@/components/directory/DirectoryLogo";
import AccentLink from "@/ui/AccentLink";
import EmptyState from "@/ui/EmptyState";
import Pagination from "@/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";
import {
  fetchResourcesDirectoryPage,
  fetchResourcesFilterOptions,
} from "@/services/directory";
import { cn } from "@/utils/common";
import { buildLocaleAlternates } from "@/utils/seo";

const headerCellClass =
  "py-0 text-[14px] font-medium uppercase tracking-[2px] text-grey";

/**
 * The business-name column stays put while the rest of the table scrolls under
 * it, matching the associations directory. The inset shadow draws the freeze
 * boundary; an opaque background stops the scrolled cells showing through.
 */
const frozenCellClass =
  "sticky left-0 z-10 shadow-[inset_-1px_0_0_0_var(--color-line)]";

type ResourcesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string;
    country?: string;
    focus?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "resources.directory",
  });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: buildLocaleAlternates(locale, "/resources"),
    openGraph: { title: t("title"), description: t("subtitle") },
    twitter: { title: t("title"), description: t("subtitle") },
  };
}

export default async function ResourcesDirectoryPage({
  params,
  searchParams,
}: ResourcesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("resources.directory");
  const tCommon = await getTranslations("common");

  const sp = searchParams ? await searchParams : undefined;
  const currentPage = Math.max(1, Number.parseInt(sp?.page ?? "1", 10) || 1);
  const search = sp?.q?.trim() ?? "";
  const country = sp?.country?.trim() || "All";
  const focus = sp?.focus?.trim() || "All";

  const [result, filterOptions] = await Promise.all([
    fetchResourcesDirectoryPage({
      page: currentPage,
      pageSize: 10,
      filters: { search, country, facet: focus },
    }),
    fetchResourcesFilterOptions(),
  ]);
  const resources = result.rows;

  // Carried onto every pagination link so paging preserves the active filters.
  const filterSearchParams = {
    q: search || undefined,
    country: country !== "All" ? country : undefined,
    focus: focus !== "All" ? focus : undefined,
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 px-5 py-6 lg:gap-8 lg:px-[70px] lg:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.28px] text-white lg:text-[48px] lg:leading-[60px] lg:tracking-[-1px]">
          {t("title")}
        </h1>
        <p className="max-w-3xl text-[16px] leading-7 text-grey">
          {t("subtitle")}
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-[156px] animate-pulse rounded-lg bg-surface" />
        }
      >
        <DirectoryFilters
          basePath="/resources"
          namespace="resources.directory.filters"
          facetParam="focus"
          options={filterOptions}
        />
      </Suspense>

      {resources.length === 0 ? (
        <EmptyState variant="public">{t("empty")}</EmptyState>
      ) : (
        // One table at every width. Narrow screens scroll it horizontally with
        // the first column frozen rather than collapsing it into cards.
        <div className="overflow-hidden rounded-lg border border-line bg-black">
          <Table minWidth="min-w-200" wrapperClassName="table-scroll">
            <TableHead className="bg-surface">
              <TableRow className="h-12">
                <TableHeaderCell
                  className={cn(
                    headerCellClass,
                    frozenCellClass,
                    "w-[28.3%] bg-surface"
                  )}
                >
                  {t("columns.businessName")}
                </TableHeaderCell>
                <TableHeaderCell className={cn(headerCellClass, "w-[14.3%]")}>
                  {t("columns.country")}
                </TableHeaderCell>
                <TableHeaderCell className={cn(headerCellClass, "w-[18.6%]")}>
                  {t("columns.focus")}
                </TableHeaderCell>
                <TableHeaderCell className={cn(headerCellClass, "w-[27.8%]")}>
                  {t("columns.website")}
                </TableHeaderCell>
                <TableHeaderCell className={cn(headerCellClass, "w-[11.0%]")}>
                  {t("columns.notes")}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resources.map((row, idx) => {
                const isLast = idx === resources.length - 1;
                // The divider is inset 16px each side per the design, so it is
                // drawn as a pseudo-element rather than a full-bleed border.
                // The frozen cell's background would hide the row's copy, so it
                // redraws the hairline out to the freeze boundary itself.
                const dividerClass = isLast
                  ? ""
                  : "after:absolute after:bottom-0 after:h-px after:bg-line";
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "h-12",
                      !isLast && "relative",
                      dividerClass,
                      !isLast && "after:inset-x-4"
                    )}
                  >
                    <TableCell
                      className={cn(
                        "py-0 text-[14px] font-medium tracking-[0.28px] text-white",
                        frozenCellClass,
                        "bg-black",
                        dividerClass,
                        !isLast && "after:left-4 after:right-0"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <DirectoryLogo src={row.logoUrl} name={row.name} />
                        <span className="truncate">
                          {row.name || tCommon("empty")}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="py-0 text-[14px] text-grey">
                      {row.country || tCommon("empty")}
                    </TableCell>
                    <TableCell className="py-0 text-[14px] text-grey">
                      {row.focus || tCommon("empty")}
                    </TableCell>
                    <TableCell className="py-0 text-[14px] text-grey">
                      {row.website ? (
                        <AccentLink href={row.website} variant="inline" external>
                          {row.website.replace(/^https?:\/\//, "")}
                        </AccentLink>
                      ) : (
                        tCommon("empty")
                      )}
                    </TableCell>
                    <TableCell className="py-0 text-[14px] text-grey">
                      {row.notes || tCommon("empty")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {result.total > 0 ? (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          pageSize={result.pageSize}
          total={result.total}
          variant="public"
          hrefPath="/resources"
          hrefSearchParams={filterSearchParams}
        />
      ) : null}
    </div>
  );
}
