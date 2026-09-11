"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PedigreeChart } from "@/types/stallion";
import { slicePedigreeChart } from "@/utils/pedigree-chart";
import { PEDIGREE_ROW_MIN_HEIGHT_REM, PROFILE_PEDIGREE_MAX_GENERATIONS } from "@/utils/pedigree";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

const COLUMN_MIN_WIDTH = "13rem";

const EMPTY_CHART: PedigreeChart = { row_count: 2, columns: [] };

export function usePedigreeChartDisplay(chart?: PedigreeChart | null) {
  const fullChart = useMemo(
    () => chart ?? EMPTY_CHART,
    [chart]
  );

  const availableGenerations = fullChart.columns.length;

  const defaultVisible = Math.min(
    PROFILE_PEDIGREE_MAX_GENERATIONS,
    Math.max(availableGenerations, 1)
  );

  const [visibleColumnCount, setVisibleColumnCount] = useState(defaultVisible);

  useEffect(() => {
    setVisibleColumnCount((prev) => {
      if (availableGenerations === 0) return 1;
      if (prev > availableGenerations) return availableGenerations;
      if (prev < defaultVisible) return defaultVisible;
      return prev;
    });
  }, [availableGenerations, defaultVisible]);

  const clampedColumnCount = Math.min(
    Math.max(visibleColumnCount, 1),
    availableGenerations || 1
  );

  const displayChart = useMemo(
    () => slicePedigreeChart(fullChart, clampedColumnCount),
    [fullChart, clampedColumnCount]
  );

  const columns = displayChart.columns;
  const rowCount = displayChart.row_count;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollHorizontally, setCanScrollHorizontally] = useState(false);

  const columnCount = columns.length;
  const isMobile = useIsMobileViewport();
  const useFluidColumnWidth = columnCount <= 3 && !isMobile;
  const columnTemplate =
    columnCount > 0
      ? useFluidColumnWidth
        ? `repeat(${columnCount}, minmax(0, 1fr))`
        : `repeat(${columnCount}, minmax(${COLUMN_MIN_WIDTH}, 1fr))`
      : undefined;

  const chartMinHeightClass =
    clampedColumnCount <= 2
      ? "md:min-h-[420px]"
      : clampedColumnCount === 3
        ? "md:min-h-[560px]"
        : "";

  const gridTemplateRows = useMemo(() => {
    const rowTrack =
      clampedColumnCount <= 3
        ? `minmax(${PEDIGREE_ROW_MIN_HEIGHT_REM}rem, 1fr)`
        : `minmax(${PEDIGREE_ROW_MIN_HEIGHT_REM}rem, auto)`;
    return `repeat(${rowCount}, ${rowTrack})`;
  }, [rowCount, clampedColumnCount]);

  const canRemoveGeneration = columnCount > 1;
  const canAddGeneration =
    availableGenerations > 0 && columnCount < availableGenerations;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollState = () => {
      setCanScrollHorizontally(container.scrollWidth > container.clientWidth + 1);
    };

    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);

    const inner = container.firstElementChild;
    if (inner) observer.observe(inner);

    return () => observer.disconnect();
  }, [columnCount, rowCount, columns, columnTemplate]);

  return {
    availableGenerations,
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
    availableGenerationsForAdd: availableGenerations,
    hasPedigreeData: availableGenerations > 0,
  };
}
