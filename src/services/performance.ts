import { createClient } from "@/services/supabase";
import type { FormPerformanceRow } from "@/types/stallion-form";

export const PERFORMANCE_RECORD_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type PerformanceRecordMonth = (typeof PERFORMANCE_RECORD_MONTHS)[number];

const MONTH_ALIASES: Record<string, PerformanceRecordMonth> = {
  jan: "Jan",
  january: "Jan",
  "1": "Jan",
  "01": "Jan",
  feb: "Feb",
  february: "Feb",
  "2": "Feb",
  "02": "Feb",
  mar: "Mar",
  march: "Mar",
  "3": "Mar",
  "03": "Mar",
  apr: "Apr",
  april: "Apr",
  "4": "Apr",
  "04": "Apr",
  may: "May",
  "5": "May",
  "05": "May",
  jun: "Jun",
  june: "Jun",
  "6": "Jun",
  "06": "Jun",
  jul: "Jul",
  july: "Jul",
  "7": "Jul",
  "07": "Jul",
  aug: "Aug",
  august: "Aug",
  "8": "Aug",
  "08": "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  "9": "Sep",
  "09": "Sep",
  oct: "Oct",
  october: "Oct",
  "10": "Oct",
  nov: "Nov",
  november: "Nov",
  "11": "Nov",
  dec: "Dec",
  december: "Dec",
  "12": "Dec",
};

/** DB check: `month` must be NULL or one of `PERFORMANCE_RECORD_MONTHS`. */
export function normalizePerformanceRecordMonth(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((PERFORMANCE_RECORD_MONTHS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return MONTH_ALIASES[trimmed.toLowerCase()] ?? null;
}

export type PerformanceRecordRow = FormPerformanceRow & { stallion_id: string };

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function rowToInsert(
  stallionId: string,
  fields: FormPerformanceRow
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    achievement: fields.achievement.trim() || "—",
    year: parseOptionalInt(fields.year),
    month: normalizePerformanceRecordMonth(fields.month),
    discipline: fields.discipline.trim() || null,
    class: fields.class.trim() || null,
    level: fields.level.trim() || null,
    association: fields.association.trim() || null,
    event: fields.event.trim() || null,
    score: parseOptionalNumeric(fields.score),
    earnings: parseOptionalNumeric(fields.earnings),
    currency: fields.currency.trim() || null,
    starts: parseOptionalNumeric(fields.starts),
    firsts: parseOptionalNumeric(fields.firsts),
    seconds: parseOptionalNumeric(fields.seconds),
    thirds: parseOptionalNumeric(fields.thirds),
    highest_rating: parseOptionalNumeric(fields.highest_rating),
    performance_summary: fields.performance_summary.trim() || null,
    judges: fields.judges.trim() || null,
    comments: fields.comments.trim() || null,
    reference: fields.reference.trim() || null,
  };
}

function rowToUpdate(fields: FormPerformanceRow): Record<string, unknown> {
  return {
    achievement: fields.achievement.trim() || "—",
    year: parseOptionalInt(fields.year),
    month: normalizePerformanceRecordMonth(fields.month),
    discipline: fields.discipline.trim() || null,
    class: fields.class.trim() || null,
    level: fields.level.trim() || null,
    association: fields.association.trim() || null,
    event: fields.event.trim() || null,
    score: parseOptionalNumeric(fields.score),
    earnings: parseOptionalNumeric(fields.earnings),
    currency: fields.currency.trim() || null,
  };
}

/**
 * Every column the admin can edit. It previously omitted `score`, which is why
 * the create path had to splice the submitted value back onto the response.
 */
const PERFORMANCE_RECORD_SELECT =
  "id, achievement, year, month, discipline, class, level, association, event, score, earnings, currency, starts, firsts, seconds, thirds, highest_rating, performance_summary, judges, comments, reference";

function mapDbRow(row: Record<string, unknown>): FormPerformanceRow {
  return {
    id: String(row.id ?? ""),
    year: row.year != null ? String(row.year) : "",
    month: typeof row.month === "string" ? row.month : "",
    association: typeof row.association === "string" ? row.association : "",
    event: typeof row.event === "string" ? row.event : "",
    class: typeof row.class === "string" ? row.class : "",
    discipline: typeof row.discipline === "string" ? row.discipline : "",
    achievement: typeof row.achievement === "string" ? row.achievement : "",
    level: typeof row.level === "string" ? row.level : "",
    score: row.score != null ? String(row.score) : "",
    earnings: row.earnings != null ? String(row.earnings) : "",
    currency: typeof row.currency === "string" ? row.currency : "",
    starts: row.starts != null ? String(row.starts) : "",
    firsts: row.firsts != null ? String(row.firsts) : "",
    seconds: row.seconds != null ? String(row.seconds) : "",
    thirds: row.thirds != null ? String(row.thirds) : "",
    highest_rating: row.highest_rating != null ? String(row.highest_rating) : "",
    performance_summary:
      typeof row.performance_summary === "string" ? row.performance_summary : "",
    judges: typeof row.judges === "string" ? row.judges : "",
    comments: typeof row.comments === "string" ? row.comments : "",
    reference: typeof row.reference === "string" ? row.reference : "",
  };
}

export async function createPerformanceRecord(
  stallionId: string,
  fields: FormPerformanceRow
): Promise<
  { ok: true; record: FormPerformanceRow } | { ok: false; error: string }
> {
  if (!fields.achievement.trim() && !fields.event.trim()) {
    return { ok: false, error: "Event or achievement is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_performance_records")
    .insert(rowToInsert(stallionId, fields) as never)
    .select(PERFORMANCE_RECORD_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create performance record.",
    };
  }

  return { ok: true, record: mapDbRow(data as Record<string, unknown>) };
}

export async function updatePerformanceRecord(
  id: string,
  fields: FormPerformanceRow
): Promise<
  { ok: true; record: FormPerformanceRow } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallion_performance_records")
    .update(rowToUpdate(fields) as never)
    .eq("id", id)
    .select(PERFORMANCE_RECORD_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update performance record.",
    };
  }

  return { ok: true, record: mapDbRow(data as Record<string, unknown>) };
}

export async function deletePerformanceRecord(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_performance_records")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
