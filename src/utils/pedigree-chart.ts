import type {
  PedigreeChart,
  PedigreeChartAdditionalRegistration,
  PedigreeChartCell,
  PedigreeChartColumn,
} from "@/types/stallion";
import {
  formatPedigreeGenerationLabel,
  parseStallionPedigreeRows,
  type ParsedStallionPedigreeRecord,
} from "@/utils/pedigree";

type PlacedCell = PedigreeChartCell & { generation: number };

/** Standard pedigree grid: gen 1 → 2 rows, gen 2 → 4, gen 3 → 8, … */
function pedigreeChartRowCount(maxGeneration: number): number {
  return 2 ** Math.max(1, maxGeneration);
}

function toAdditionalRegistrations(
  record: ParsedStallionPedigreeRecord
): PedigreeChartAdditionalRegistration[] | undefined {
  if (record.additionalRegistrations.length === 0) return undefined;
  return record.additionalRegistrations.map((reg) => ({
    association_name: reg.association_name,
    country: reg.country,
    registration_number: reg.registration_number,
  }));
}

function recordToCell(
  record: ParsedStallionPedigreeRecord,
  generation: number,
  rowStart: number,
  rowSpan: number
): PlacedCell {
  return {
    key: `g${generation}-${record.type}-${record.id}`,
    name: record.displayName,
    horse_name: record.name,
    primary_registration: record.primaryRegistration,
    additional_registrations: toAdditionalRegistrations(record),
    meta_lines: record.metaLines,
    kind: record.type === "dam" ? "female" : "male",
    row_start: rowStart,
    row_span: rowSpan,
    generation,
  };
}

function placeAncestors(
  records: ParsedStallionPedigreeRecord[],
  maxGeneration: number,
  progenyTreeId: string | null,
  childGeneration: number,
  rowStart: number,
  rowSpan: number,
  cells: PlacedCell[]
) {
  const parentGeneration = childGeneration + 1;
  if (parentGeneration > maxGeneration) return;

  const parents = records.filter(
    (record) =>
      record.generation === parentGeneration &&
      (progenyTreeId
        ? record.progenyId === progenyTreeId
        : record.progenyId == null)
  );

  const sire = parents.find((record) => record.type === "sire");
  const dam = parents.find((record) => record.type === "dam");
  const halfSpan = Math.max(1, Math.floor(rowSpan / 2));

  if (sire) {
    cells.push(recordToCell(sire, parentGeneration, rowStart, halfSpan));
    placeAncestors(
      records,
      maxGeneration,
      sire.id,
      sire.generation,
      rowStart,
      halfSpan,
      cells
    );
  }

  if (dam) {
    const damStart = rowStart + halfSpan;
    const damSpan = Math.max(1, rowSpan - halfSpan);
    cells.push(recordToCell(dam, parentGeneration, damStart, damSpan));
    placeAncestors(
      records,
      maxGeneration,
      dam.id,
      dam.generation,
      damStart,
      damSpan,
      cells
    );
  }
}

export function buildPedigreeChartFromStallionRows(
  rows: Record<string, unknown>[],
  options?: { maxGenerations?: number }
): PedigreeChart {
  const records = parseStallionPedigreeRows(rows);
  const maxGenInData = records.reduce(
    (max, record) => Math.max(max, record.generation),
    0
  );

  if (maxGenInData === 0) {
    return { row_count: 2, columns: [] };
  }

  const cappedMax =
    options?.maxGenerations != null
      ? Math.min(options.maxGenerations, maxGenInData)
      : maxGenInData;

  const included = records.filter((record) => record.generation <= cappedMax);

  if (process.env.NODE_ENV === "development") {
    const orphans = records.filter(
      (record) => record.generation >= 2 && record.progenyId == null
    );
    if (orphans.length > 0) {
      console.warn(
        `[pedigree-chart] ${orphans.length} ancestor row(s) at generation ≥ 2 have no progeny_id link and will be omitted from the chart.`,
        orphans.map((r) => ({ id: r.id, generation: r.generation, name: r.name }))
      );
    }
  }

  const rowCount = pedigreeChartRowCount(cappedMax);
  const cells: PlacedCell[] = [];

  placeAncestors(included, cappedMax, null, 0, 1, rowCount, cells);

  const columns: PedigreeChartColumn[] = [];
  for (let generation = 1; generation <= cappedMax; generation++) {
    const generationCells = cells
      .filter((cell) => cell.generation === generation)
      .sort((a, b) => a.row_start - b.row_start)
      .map(({ generation: _generation, ...cell }) => cell);

    if (generationCells.length === 0) continue;

    columns.push({
      generation,
      label: formatPedigreeGenerationLabel(generation),
      cells: generationCells,
    });
  }

  return { row_count: rowCount, columns };
}

export function slicePedigreeChart(
  chart: PedigreeChart,
  visibleColumnCount: number
): PedigreeChart {
  const count = Math.max(1, visibleColumnCount);
  const columns = chart.columns.slice(0, count);
  if (columns.length === 0) {
    return { row_count: 2, columns: [] };
  }

  const lastGeneration = columns[columns.length - 1]?.generation ?? 1;
  const sliceRowCount = pedigreeChartRowCount(lastGeneration);
  const fullRowCount = chart.row_count;

  if (sliceRowCount >= fullRowCount) {
    return { row_count: sliceRowCount, columns };
  }

  // Cells are laid out for the full tree depth; rescale row tracks when showing
  // fewer generations (e.g. gen 1–2 of a 5-deep tree must fit in 4 rows, not 32).
  const scale = sliceRowCount / fullRowCount;

  return {
    row_count: sliceRowCount,
    columns: columns.map((column) => ({
      ...column,
      cells: column.cells.map((cell) => {
        const offset = (cell.row_start ?? 1) - 1;
        const span = cell.row_span ?? 1;
        return {
          ...cell,
          row_start: Math.round(offset * scale) + 1,
          row_span: Math.max(1, Math.round(span * scale)),
        };
      }),
    })),
  };
}
