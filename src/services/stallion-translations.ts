import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import type {
  StallionProfileTranslationFormValues,
  StallionProfileTranslationRow,
  TranslatableProfileLocale,
} from "@/types/stallion-translations";
import type { Stallion } from "@/types/stallion";
import { coatColourLabel } from "@/utils/coat-colour-i18n";
import {
  formatBreedLabelFallback,
  joinDisciplineCoverage,
  splitDisciplineCoverageText,
} from "@/utils/stallion-profile-i18n";
import {
  breedingMethodLabelsHaveContent,
  normalizeBreedingMethodLabels,
} from "@/utils/semen-availability-i18n";

export type UpsertStallionProfileTranslationResult =
  | { ok: true; row: StallionProfileTranslationRow }
  | { ok: false; error: string };

function mapRow(raw: Record<string, unknown>): StallionProfileTranslationRow {
  return {
    id: String(raw.id),
    stallion_id: String(raw.stallion_id),
    locale: String(raw.locale),
    summary: typeof raw.summary === "string" ? raw.summary : null,
    performance_summary:
      typeof raw.performance_summary === "string"
        ? raw.performance_summary
        : null,
    breeding_summary:
      typeof raw.breeding_summary === "string" ? raw.breeding_summary : null,
    coat_colour: typeof raw.coat_colour === "string" ? raw.coat_colour : null,
    breed_label: typeof raw.breed_label === "string" ? raw.breed_label : null,
    discipline_coverage:
      typeof raw.discipline_coverage === "string" ? raw.discipline_coverage : null,
    breeding_method_labels: normalizeBreedingMethodLabels(raw.breeding_method_labels),
    publish_status:
      raw.publish_status === "published" ? "published" : "draft",
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}

export type SetStallionProfileTranslationPublishResult =
  | { ok: true; publish_status: AdminStallionPublishStatus }
  | { ok: false; error: string };

export function stallionProfileTranslationHasContent(
  row: Pick<
    StallionProfileTranslationRow,
    | "summary"
    | "performance_summary"
    | "breeding_summary"
    | "coat_colour"
    | "breed_label"
    | "discipline_coverage"
    | "breeding_method_labels"
  >
): boolean {
  return Boolean(
    row.summary?.trim() ||
      row.performance_summary?.trim() ||
      row.breeding_summary?.trim() ||
      row.coat_colour?.trim() ||
      row.breed_label?.trim() ||
      row.discipline_coverage?.trim() ||
      breedingMethodLabelsHaveContent(row.breeding_method_labels)
  );
}

export function applyPublishedProfileTranslation(
  stallion: Stallion,
  translation: StallionProfileTranslationRow,
  locale: string
): Stallion {
  return mergeLocalizedProfileIdentity(stallion, locale, translation);
}

export function applyLocaleProfileIdentityFallbacks(
  stallion: Stallion,
  locale: string
): Stallion {
  return mergeLocalizedProfileIdentity(stallion, locale, null);
}

function mergeLocalizedProfileIdentity(
  stallion: Stallion,
  locale: string,
  translation: StallionProfileTranslationRow | null
): Stallion {
  if (locale === "en") return stallion;

  const englishDisciplines = (stallion.discipline_focus ?? []).filter(Boolean);
  const translatedDiscipline = translation?.discipline_coverage?.trim();
  const discipline_focus = translatedDiscipline
    ? splitDisciplineCoverageText(translatedDiscipline)
    : englishDisciplines;

  const breedSource = stallion.breed ?? stallion.breed_label;
  const breed_label =
    translation?.breed_label?.trim() ||
    formatBreedLabelFallback(breedSource, locale) ||
    stallion.breed_label;

  return {
    ...stallion,
    summary: translation?.summary?.trim() || stallion.summary,
    performance_summary:
      translation?.performance_summary?.trim() || stallion.performance_summary,
    breeding_notes:
      translation?.breeding_summary?.trim() || stallion.breeding_notes,
    coat_colour:
      coatColourLabel(stallion.coat_colour, locale, translation?.coat_colour) ??
      stallion.coat_colour,
    breed_label: breed_label as Stallion["breed_label"],
    discipline_focus:
      discipline_focus.length > 0 ? discipline_focus : stallion.discipline_focus,
    discipline_coverage_description:
      translatedDiscipline ||
      (englishDisciplines.length > 0
        ? joinDisciplineCoverage(englishDisciplines)
        : stallion.discipline_coverage_description),
    breeding_method_labels: translation
      ? normalizeBreedingMethodLabels(translation.breeding_method_labels)
      : undefined,
  };
}

export async function fetchStallionProfileTranslationWithClient(
  client: SupabaseClient,
  stallionId: string,
  locale: string
): Promise<StallionProfileTranslationRow | null> {
  const { data, error } = await client
    .from("stallion_profile_translations")
    .select("*")
    .eq("stallion_id", stallionId)
    .eq("locale", locale)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function fetchPublishedStallionProfileTranslationWithClient(
  client: SupabaseClient,
  stallionId: string,
  locale: string
): Promise<StallionProfileTranslationRow | null> {
  const { data, error } = await client
    .from("stallion_profile_translations")
    .select("*")
    .eq("stallion_id", stallionId)
    .eq("locale", locale)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function upsertStallionProfileTranslationWithClient(
  client: SupabaseClient,
  stallionId: string,
  values: StallionProfileTranslationFormValues
): Promise<UpsertStallionProfileTranslationResult> {
  // Content saves must not touch publish_status — only publish/unpublish actions do.
  const payload = {
    stallion_id: stallionId,
    locale: values.locale,
    summary: values.summary.trim() || null,
    performance_summary: values.performance_summary.trim() || null,
    breeding_summary: values.breeding_summary.trim() || null,
    coat_colour: values.coat_colour.trim() || null,
    breed_label: values.breed_label.trim() || null,
    discipline_coverage: values.discipline_coverage.trim() || null,
    breeding_method_labels: normalizeBreedingMethodLabels(values.breeding_method_labels),
  };

  const { data, error } = await client
    .from("stallion_profile_translations")
    .upsert(payload, { onConflict: "stallion_id,locale" })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save translation" };
  }

  return { ok: true, row: mapRow(data as Record<string, unknown>) };
}

export async function setStallionProfileTranslationPublishWithClient(
  client: SupabaseClient,
  stallionId: string,
  locale: TranslatableProfileLocale,
  publish: boolean
): Promise<SetStallionProfileTranslationPublishResult> {
  const publish_status: AdminStallionPublishStatus = publish
    ? "published"
    : "draft";

  const { data, error } = await client
    .from("stallion_profile_translations")
    .update({ publish_status })
    .eq("stallion_id", stallionId)
    .eq("locale", locale)
    .select("publish_status")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: "Translation not found. Save draft content before publishing.",
    };
  }

  return { ok: true, publish_status };
}
