"use client";

import type { PedigreeChart } from "@/types/stallion";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { usePedigreeChartDisplay } from "@/hooks/use-pedigree-chart-display";
import Button from "@/ui/Button";
import { useTranslations } from "next-intl";
import PedigreeRow from "./pedigree/PedigreeRow";

type PedigreeBlockProps = {
  chart?: PedigreeChart | null;
};

export default function PedigreeBlock({ chart }: PedigreeBlockProps) {
  const t = useTranslations("profile.pedigree");
  const {
    columns,
    columnCount,
    columnTemplate,
    chartMinHeightClass,
    gridTemplateRows,
    scrollContainerRef,
    canScrollHorizontally,
    isMobile,
    useFluidColumnWidth,
    canRemoveGeneration,
    canAddGeneration,
    setVisibleColumnCount,
    availableGenerationsForAdd,
    hasPedigreeData,
  } = usePedigreeChartDisplay(chart);

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <h2 className={profileSectionTitleClassName}>{t("title")}</h2>
        <div className="profile-canvas-muted hidden items-center gap-5 text-sm text-white/70 md:flex">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 bg-[rgba(14,16,20,0.85)]" />
            {t("legendMale")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 bg-pedigree-female" />
            {t("legendFemale")}
          </span>
          <span>{t("legendAnnotation")}</span>
        </div>
      </div>

      {!hasPedigreeData ? (
        <p className="mt-4 text-sm text-white/50">
          {t("empty")}
        </p>
      ) : (
        <>
          <div
            ref={scrollContainerRef}
            className="mt-4 -mx-5 overflow-x-auto overscroll-x-contain px-5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] touch-pan-x sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
          >
            <div
              className={
                useFluidColumnWidth
                  ? "w-full min-w-0 align-top"
                  : "w-full min-w-max align-top"
              }
            >
              <div
                className={`profile-pedigree-headers grid text-center text-base font-medium text-white/80 ${
                  useFluidColumnWidth ? "w-full min-w-0" : "w-full min-w-max"
                }`}
                style={{ gridTemplateColumns: columnTemplate }}
              >
                {columns.map((column) => (
                  <p
                    key={column.generation}
                    className="min-w-0 px-2 pb-3 break-words leading-snug"
                  >
                    {t("generation", { number: column.generation })}
                  </p>
                ))}
              </div>

              <div
                className={`flex flex-col overflow-hidden rounded-md border border-b-0 border-white/10 ${chartMinHeightClass}`}
              >
                <div
                  className={`grid min-h-0 flex-1 items-stretch ${chartMinHeightClass ? "h-full min-h-full" : ""} ${useFluidColumnWidth ? "w-full min-w-0" : "min-w-max"}`}
                  style={{
                    gridTemplateColumns: columnTemplate,
                    gridTemplateRows,
                  }}
                >
                  {columns.map((column, columnIndex) =>
                    column.cells.map((cell) => (
                      <PedigreeRow
                        key={cell.key}
                        cell={cell}
                        isMobile={isMobile}
                        showColumnBorder={columnIndex < columnCount - 1}
                        style={{
                          gridColumn: columnIndex + 1,
                          gridRow: `${cell.row_start ?? 1} / span ${cell.row_span ?? 1}`,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {canScrollHorizontally || (isMobile && columnCount > 1) ? (
            <p className="mt-2 text-center text-xs text-white/45 md:hidden">
              {t("swipeHint")}
            </p>
          ) : null}
          {canScrollHorizontally && !isMobile ? (
            <p className="mt-2 hidden text-center text-xs text-white/45 md:block">
              {t("scrollHint")}
            </p>
          ) : null}
        </>
      )}

      {hasPedigreeData && (canRemoveGeneration || canAddGeneration) ? (
        <div className="mt-4 flex items-center justify-between">
          <Button
            type="button"
            variant="unstyled"
            size="none"
            disabled={!canRemoveGeneration}
            onClick={() =>
              setVisibleColumnCount((current) => Math.max(1, current - 1))
            }
            className="gap-2 rounded-sm border border-white/15 bg-surface px-4 py-2 text-[13px] text-white/60 hover:bg-white/5"
          >
            {t("removeGeneration")}
            <span className="text-base leading-none">−</span>
          </Button>
          <Button
            type="button"
            variant="unstyled"
            size="none"
            disabled={!canAddGeneration}
            onClick={() =>
              setVisibleColumnCount((current) =>
                Math.min(availableGenerationsForAdd, current + 1)
              )
            }
            className="gap-2 rounded-sm border border-white/15 bg-surface px-4 py-2 text-[13px] text-gold-alt hover:bg-white/5"
          >
            {t("addGeneration")}
            <span className="text-base leading-none">+</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
