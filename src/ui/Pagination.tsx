"use client";

import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Button from "./Button";
import { buildPageList } from "@/utils/common";
import { cn } from "@/utils/common";

type PaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  variant?: "public" | "admin";
  /** Serializable link target for server-rendered pages (preferred over buildHref). */
  hrefPath?: string;
  /** Array values become repeated params (e.g. several bloodline conditions). */
  hrefSearchParams?: Record<string, string | string[] | undefined>;
  /** Client-only: use hrefPath + hrefSearchParams from server components instead. */
  buildHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
};

function buildPageHref(
  pathname: string,
  baseParams: Record<string, string | string[] | undefined> | undefined,
  page: number
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(baseParams ?? {})) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      const trimmed = entry?.trim();
      if (trimmed) params.append(key, trimmed);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function pageButtonClass(
  variant: "public" | "admin",
  active: boolean,
  disabled: boolean
) {
  if (disabled) {
    return variant === "admin"
      ? "pointer-events-none rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-600 sm:px-3 sm:text-sm"
      : "flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-[#262626] text-sm font-bold text-[#aaa] opacity-50";
  }
  if (active) {
    return variant === "admin"
      ? "min-w-[2.25rem] rounded border border-sky-500/50 bg-sky-950/40 px-2 py-1 text-center text-xs font-medium text-sky-100 sm:text-sm"
      : "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#121212] text-sm font-bold text-[#c09a64]";
  }
  return variant === "admin"
    ? "min-w-[2.25rem] rounded border border-slate-700 px-2 py-1 text-center text-xs text-slate-300 hover:border-slate-500 hover:text-white sm:text-sm"
    : "flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#262626] text-sm font-bold text-[#aaa] transition-colors hover:border-[#c09a64]/40 hover:text-white";
}

type PaginationBodyProps = PaginationProps & {
  variant: "public" | "admin";
  previousLabel: string;
  nextLabel: string;
  pageNumbersAria: string;
  pageAria: (page: string) => string;
  showingLabel: React.ReactNode;
  pageOfLabel: React.ReactNode;
  LinkComponent: typeof NextLink | typeof Link;
};

function PaginationBody({
  page,
  totalPages,
  pageSize,
  total,
  variant,
  hrefPath,
  hrefSearchParams,
  buildHref,
  onPageChange,
  className,
  previousLabel,
  nextLabel,
  pageNumbersAria,
  pageAria,
  showingLabel,
  pageOfLabel,
  LinkComponent,
}: PaginationBodyProps) {
  if (total === 0) return null;

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const pageStart = (page - 1) * pageSize;
  const pageItems = buildPageList(page, totalPages);
  const useLinks = Boolean(buildHref || hrefPath);

  const resolveHref = (targetPage: number): string => {
    if (buildHref) return buildHref(targetPage);
    if (hrefPath) return buildPageHref(hrefPath, hrefSearchParams, targetPage);
    return "#";
  };

  const summaryClass =
    variant === "admin"
      ? "text-sm text-slate-400"
      : "text-sm text-zinc-400";
  const pageOfClass =
    variant === "admin"
      ? "text-center text-xs text-slate-500 sm:text-sm"
      : "text-center text-xs text-zinc-500 sm:text-sm";

  const renderPageControl = (
    targetPage: number,
    label: string,
    disabled: boolean,
    active = false
  ) => {
    const cls = active
      ? pageButtonClass(variant, true, false)
      : pageButtonClass(variant, false, disabled);

    const pageAriaLabel =
      typeof label === "string" && /^\d+$/.test(label)
        ? pageAria(label)
        : undefined;

    if (useLinks) {
      if (disabled) {
        return (
          <span aria-disabled className={cls}>
            {label}
          </span>
        );
      }
      return (
        <LinkComponent
          href={resolveHref(targetPage)}
          aria-label={pageAriaLabel}
          aria-current={active ? "page" : undefined}
          className={cls}
        >
          {label}
        </LinkComponent>
      );
    }

    return (
      <Button
        type="button"
        variant="unstyled"
        size="none"
        disabled={disabled}
        onClick={() => onPageChange?.(targetPage)}
        aria-label={pageAriaLabel}
        aria-current={active ? "page" : undefined}
        className={cls}
      >
        {label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        summaryClass,
        className
      )}
    >
      <div className="shrink-0">{showingLabel}</div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1">
          {renderPageControl(prevPage, previousLabel, page === 1)}
          <nav
            className="flex items-center gap-1"
            aria-label={pageNumbersAria}
          >
            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className={
                    variant === "admin" ? "px-1 text-slate-500" : "px-1 text-zinc-500"
                  }
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <span key={item}>
                  {renderPageControl(item, String(item), false, item === page)}
                </span>
              )
            )}
          </nav>
          {renderPageControl(nextPage, nextLabel, page === totalPages)}
        </div>
        {pageOfLabel != null && (
          <span className={pageOfClass}>{pageOfLabel}</span>
        )}
      </div>
    </div>
  );
}

function AdminPagination(props: PaginationProps) {
  const { page, pageSize, total, totalPages } = props;
  const pageStart = (page - 1) * pageSize;

  return (
    <PaginationBody
      {...props}
      variant="admin"
      LinkComponent={NextLink}
      previousLabel="Previous"
      nextLabel="Next"
      pageNumbersAria="Page numbers"
      pageAria={(p) => `Page ${p}`}
      showingLabel={
        <>
          Showing {pageStart + 1}–{Math.min(pageStart + pageSize, total)} of {total}
        </>
      }
      pageOfLabel={
        <>
          Page {page} of {totalPages}
        </>
      }
    />
  );
}

function PublicPagination(props: PaginationProps) {
  const t = useTranslations("common.pagination");
  const { page, pageSize, total } = props;
  const pageStart = (page - 1) * pageSize;

  return (
    <PaginationBody
      {...props}
      variant="public"
      LinkComponent={Link}
      previousLabel="‹"
      nextLabel="›"
      pageNumbersAria={t("pageNumbersAria")}
      pageAria={(p) => t("pageAria", { page: p })}
      showingLabel={
        <span className="text-[14px] font-bold text-[#aaa]">
          {t("showing", {
            start: pageStart + 1,
            end: Math.min(pageStart + pageSize, total),
            total,
          })}
        </span>
      }
      pageOfLabel={null}
    />
  );
}

export default function Pagination(props: PaginationProps) {
  if (props.variant === "admin") {
    return <AdminPagination {...props} />;
  }
  return <PublicPagination {...props} />;
}
