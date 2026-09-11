import { createClient } from "@/services/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FormRacingRow, FormRacingSummary } from "@/types/stallion-form";
import { DEFAULT_STALLION_CURRENCY } from "@/utils/common";

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

const RACING_RESULT_SELECT =
  "id, race_name, race_date, year, track, race_number, distance, finish_position, " +
  "speed_index, earnings, currency, result_note, chart_url, video_url, admin_notes";

function mapRacingRow(row: Record<string, unknown>): FormRacingRow {
  const raceDate =
    typeof row.race_date === "string"
      ? row.race_date.slice(0, 10)
      : "";
  return {
    id: String(row.id ?? ""),
    race_name: typeof row.race_name === "string" ? row.race_name : "",
    race_date: raceDate,
    year: row.year != null ? String(row.year) : "",
    track: typeof row.track === "string" ? row.track : "",
    distance: typeof row.distance === "string" ? row.distance : "",
    finish_position:
      row.finish_position != null ? String(row.finish_position) : "",
    speed_index: row.speed_index != null ? String(row.speed_index) : "",
    earnings: row.earnings != null ? String(row.earnings) : "",
    currency:
      typeof row.currency === "string" && row.currency.trim()
        ? row.currency
        : DEFAULT_STALLION_CURRENCY,
    race_number: row.race_number != null ? String(row.race_number) : "",
    result_note: typeof row.result_note === "string" ? row.result_note : "",
    chart_url: typeof row.chart_url === "string" ? row.chart_url : "",
    video_url: typeof row.video_url === "string" ? row.video_url : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
  };
}

function racingRowToInsert(
  stallionId: string,
  fields: FormRacingRow
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    race_name: fields.race_name.trim() || null,
    race_date: fields.race_date.trim() || null,
    year: parseOptionalInt(fields.year),
    track: fields.track.trim() || null,
    distance: fields.distance.trim() || null,
    finish_position: parseOptionalInt(fields.finish_position),
    speed_index: parseOptionalInt(fields.speed_index),
    earnings: parseOptionalNumeric(fields.earnings),
    currency: fields.currency.trim() || DEFAULT_STALLION_CURRENCY,
    race_number: parseOptionalInt(fields.race_number),
    result_note: fields.result_note.trim() || null,
    chart_url: fields.chart_url.trim() || null,
    video_url: fields.video_url.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

function racingRowToUpdate(fields: FormRacingRow): Record<string, unknown> {
  return {
    race_name: fields.race_name.trim() || null,
    race_date: fields.race_date.trim() || null,
    year: parseOptionalInt(fields.year),
    track: fields.track.trim() || null,
    distance: fields.distance.trim() || null,
    finish_position: parseOptionalInt(fields.finish_position),
    speed_index: parseOptionalInt(fields.speed_index),
    earnings: parseOptionalNumeric(fields.earnings),
    currency: fields.currency.trim() || DEFAULT_STALLION_CURRENCY,
    race_number: parseOptionalInt(fields.race_number),
    result_note: fields.result_note.trim() || null,
    chart_url: fields.chart_url.trim() || null,
    video_url: fields.video_url.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

export async function createRacingResult(
  stallionId: string,
  fields: FormRacingRow
): Promise<{ ok: true; record: FormRacingRow } | { ok: false; error: string }> {
  const { data, error } = await createClient()
    .from("stallion_racing_results")
    .insert(racingRowToInsert(stallionId, fields) as never)
    .select(RACING_RESULT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create racing result.",
    };
  }

  return { ok: true, record: mapRacingRow(data as unknown as Record<string, unknown>) };
}

export async function updateRacingResult(
  id: string,
  fields: FormRacingRow
): Promise<{ ok: true; record: FormRacingRow } | { ok: false; error: string }> {
  const { data, error } = await createClient()
    .from("stallion_racing_results")
    .update(racingRowToUpdate(fields) as never)
    .eq("id", id)
    .select(RACING_RESULT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update racing result.",
    };
  }

  return { ok: true, record: mapRacingRow(data as unknown as Record<string, unknown>) };
}

export async function deleteRacingResult(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_racing_results")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function summaryToDb(summary: FormRacingSummary): Record<string, unknown> {
  return {
    career_starts: parseOptionalInt(summary.career_starts),
    career_firsts: parseOptionalInt(summary.career_firsts),
    career_seconds: parseOptionalInt(summary.career_seconds),
    career_thirds: parseOptionalInt(summary.career_thirds),
    career_earnings: parseOptionalNumeric(summary.career_earnings),
    highest_rating: parseOptionalNumeric(summary.highest_rating),
    source: summary.source.trim() || null,
  };
}

export function racingSummaryHasData(summary: FormRacingSummary): boolean {
  const payload = summaryToDb(summary);
  return Object.values(payload).some((v) => v != null);
}

export async function upsertRacingSummaryWithClient(
  supabase: SupabaseClient,
  stallionId: string,
  summary: FormRacingSummary
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = summaryToDb(summary);
  const hasData = Object.values(payload).some((v) => v != null);
  if (!hasData) {
    const { error } = await supabase
      .from("stallion_racing_summary")
      .delete()
      .eq("stallion_id", stallionId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from("stallion_racing_summary")
    .upsert(
      { stallion_id: stallionId, ...payload },
      { onConflict: "stallion_id" }
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function upsertRacingSummary(
  stallionId: string,
  summary: FormRacingSummary
): Promise<{ ok: true } | { ok: false; error: string }> {
  return upsertRacingSummaryWithClient(createClient(), stallionId, summary);
}
