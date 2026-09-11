import { createClient } from "@/services/supabase";
import type {
  FormBreedingStatistics,
  FormFoalCropRow,
  FormProgenyRow,
} from "@/types/stallion-form";
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

function mapProgenyRow(row: Record<string, unknown>): FormProgenyRow {
  return {
    id: String(row.id ?? ""),
    progeny_name: typeof row.progeny_name === "string" ? row.progeny_name : "",
    year: row.year != null ? String(row.year) : "",
    association: typeof row.association === "string" ? row.association : "",
    event: typeof row.event === "string" ? row.event : "",
    discipline: typeof row.discipline === "string" ? row.discipline : "",
    achievement: typeof row.achievement === "string" ? row.achievement : "",
    total_earnings:
      row.total_earnings != null ? String(row.total_earnings) : "",
  };
}

function mapFoalCropRow(row: Record<string, unknown>): FormFoalCropRow {
  return {
    id: String(row.id ?? ""),
    foal_crop_year:
      row.foal_crop_year != null ? String(row.foal_crop_year) : "",
    number_of_foals:
      row.number_of_foals != null ? String(row.number_of_foals) : "",
  };
}

function progenyToInsert(
  stallionId: string,
  fields: FormProgenyRow
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    progeny_name: fields.progeny_name.trim() || "Unknown",
    year: parseOptionalInt(fields.year),
    discipline: fields.discipline.trim() || null,
    achievement: fields.achievement.trim() || null,
    association: fields.association.trim() || null,
    event: fields.event.trim() || null,
    total_earnings: parseOptionalNumeric(fields.total_earnings),
  };
}

function progenyToUpdate(fields: FormProgenyRow): Record<string, unknown> {
  return {
    progeny_name: fields.progeny_name.trim() || "Unknown",
    year: parseOptionalInt(fields.year),
    discipline: fields.discipline.trim() || null,
    achievement: fields.achievement.trim() || null,
    association: fields.association.trim() || null,
    event: fields.event.trim() || null,
    total_earnings: parseOptionalNumeric(fields.total_earnings),
  };
}

export async function createProgenyRecord(
  stallionId: string,
  fields: FormProgenyRow
): Promise<
  { ok: true; record: FormProgenyRow } | { ok: false; error: string }
> {
  if (!fields.progeny_name.trim()) {
    return { ok: false, error: "Progeny name is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_progeny")
    .insert(progenyToInsert(stallionId, fields) as never)
    .select("id, progeny_name, year, discipline, achievement, total_earnings")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create progeny record.",
    };
  }

  return {
    ok: true,
    record: {
      ...mapProgenyRow(data as Record<string, unknown>),
      association: fields.association,
      event: fields.event,
    },
  };
}

export async function updateProgenyRecord(
  id: string,
  fields: FormProgenyRow
): Promise<
  { ok: true; record: FormProgenyRow } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallion_progeny")
    .update(progenyToUpdate(fields) as never)
    .eq("id", id)
    .select("id, progeny_name, year, discipline, achievement, total_earnings")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update progeny record.",
    };
  }

  return {
    ok: true,
    record: {
      ...mapProgenyRow(data as Record<string, unknown>),
      association: fields.association,
      event: fields.event,
    },
  };
}

export async function deleteProgenyRecord(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_progeny")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function foalCropToInsert(
  stallionId: string,
  fields: FormFoalCropRow
): Record<string, unknown> {
  const year = parseOptionalInt(fields.foal_crop_year);
  return {
    stallion_id: stallionId,
    foal_crop_year: year ?? new Date().getFullYear(),
    number_of_foals: parseOptionalInt(fields.number_of_foals),
  };
}

function foalCropToUpdate(fields: FormFoalCropRow): Record<string, unknown> {
  const year = parseOptionalInt(fields.foal_crop_year);
  return {
    foal_crop_year: year,
    number_of_foals: parseOptionalInt(fields.number_of_foals),
  };
}

export async function createFoalCrop(
  stallionId: string,
  fields: FormFoalCropRow
): Promise<{ ok: true; record: FormFoalCropRow } | { ok: false; error: string }> {
  if (!fields.foal_crop_year.trim()) {
    return { ok: false, error: "Foal crop year is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_foal_crops")
    .insert(foalCropToInsert(stallionId, fields) as never)
    .select("id, foal_crop_year, number_of_foals")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create foal crop.",
    };
  }

  return { ok: true, record: mapFoalCropRow(data as Record<string, unknown>) };
}

export async function updateFoalCrop(
  id: string,
  fields: FormFoalCropRow
): Promise<{ ok: true; record: FormFoalCropRow } | { ok: false; error: string }> {
  const { data, error } = await createClient()
    .from("stallion_foal_crops")
    .update(foalCropToUpdate(fields) as never)
    .eq("id", id)
    .select("id, foal_crop_year, number_of_foals")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update foal crop.",
    };
  }

  return { ok: true, record: mapFoalCropRow(data as Record<string, unknown>) };
}

export async function deleteFoalCrop(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_foal_crops")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function breedingStatisticsToDb(
  stats: FormBreedingStatistics
): Record<string, unknown> {
  return {
    total_registered_progeny: parseOptionalInt(stats.total_registered_progeny),
    progeny_started_in_competition: parseOptionalInt(
      stats.progeny_started_in_competition
    ),
    performance_earners: parseOptionalInt(stats.performance_earners),
    total_reported_offspring_earnings: parseOptionalNumeric(
      stats.total_reported_offspring_earnings
    ),
    total_reported_offspring_earnings_currency:
      stats.total_reported_offspring_earnings_currency.trim() ||
      DEFAULT_STALLION_CURRENCY,
  };
}

export function breedingStatisticsHasData(
  stats: FormBreedingStatistics
): boolean {
  return (
    stats.total_registered_progeny.trim() !== "" ||
    stats.progeny_started_in_competition.trim() !== "" ||
    stats.performance_earners.trim() !== "" ||
    stats.total_reported_offspring_earnings.trim() !== ""
  );
}

export async function updateBreedingStatistics(
  stallionId: string,
  stats: FormBreedingStatistics
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallions")
    .update(breedingStatisticsToDb(stats) as never)
    .eq("id", stallionId);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Failed to update breeding statistics.",
    };
  }
  return { ok: true };
}
