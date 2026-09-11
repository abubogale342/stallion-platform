import { compact } from "lodash-es";
import { BREED_MAP } from "@/services/stallion";
import type { AdminStallionsStatusFilter, AdminStallionsTypeFilter } from "@/types/admin-stallions";
import type { StallionsRow } from "@/types/database.types";
import type { DisciplineFamily } from "@/types/discipline";
import type { SemenAvailability, SemenMethod, Stallion, BreedingServiceProvider, ColourTestEntry, FoalCropEntry, GalleryImage, GeneticTestEntry, MareEtDetails, Owner, PedigreeNode, PerformanceEntry, ProgenyEntry, RacingRecordEntry, RacingSummary, StallionBreed } from "@/types/stallion";
import type { StallionFormValues, FormBreedingStatistics, FormHealthSummaries, FormPerformanceRow, FormRacingRow, FormRacingSummary } from "@/types/stallion-form";
import { EMPTY_MARE_ET_DETAILS } from "@/types/stallion-form";
import { DEFAULT_STALLION_CURRENCY, normalizeCurrencyCode } from "@/utils/common";
import { BREED_TYPE_VALUES, isBreedType, breedTypeFromDisplayOrDb } from "@/utils/common";
import { slugifyStallionName } from "@/utils/common";
import {
  BLOODLINE_PARAM,
  parseBloodlinesFromSearchParams,
  serializeBloodlineConditions,
} from "@/utils/bloodline-search";
import type { BloodlineCondition } from "@/utils/bloodline-search";

// --- countries.ts ---
export type StallionCountry = {
  /** Display name and directory filter value */
  label: string;
  /** ISO 3166-1 alpha-2; maps to `/public/flags/{code}.png` */
  code: string;
  /** Extra DB / legacy spellings normalized for lookup */
  aliases?: string[];
};

/** Countries available in directory filters; also used for hero flag resolution. */
export const STALLION_STANDING_COUNTRIES: readonly StallionCountry[] = [
  { label: "Australia", code: "AU" },
  { label: "Austria", code: "AT" },
  { label: "Brazil", code: "BR" },
  { label: "Canada", code: "CA" },
  { label: "Colombia", code: "CO", aliases: ["columbia"] },
  { label: "Germany", code: "DE" },
  { label: "Italy", code: "IT" },
  { label: "Mexico", code: "MX" },
  { label: "New Zealand", code: "NZ", aliases: ["newzealand"] },
  { label: "Poland", code: "PL" },
  { label: "Portugal", code: "PT" },
  {
    label: "UK",
    code: "GB",
    aliases: [
      "unitedkingdom",
      "greatbritain",
      "england",
      "scotland",
      "wales",
      "northernireland",
    ],
  },
  {
    label: "USA",
    code: "US",
    aliases: ["us", "unitedstates", "unitedstatesofamerica"],
  },
] as const;

function normalizeCountryKey(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

const countryByKey = new Map<
  string,
  { label: string; code: string }
>();

for (const country of STALLION_STANDING_COUNTRIES) {
  const entry = { label: country.label, code: country.code };
  countryByKey.set(normalizeCountryKey(country.label), entry);
  for (const alias of country.aliases ?? []) {
    countryByKey.set(normalizeCountryKey(alias), entry);
  }
}

/** Select options for admin form and directory filters (`value` = DB `country_of_residence`). */
export const STALLION_COUNTRY_SELECT_OPTIONS: { value: string; label: string }[] =
  STALLION_STANDING_COUNTRIES.map((country) => ({
    value: country.label,
    label: country.label,
  }));

/** Map free-text / legacy DB values to a directory country label (e.g. United States → USA). */
export function normalizeCountryOfResidenceValue(
  country: string | undefined
): string {
  if (!country?.trim()) return "";
  const resolved = resolveStallionCountry(country);
  return resolved?.label ?? country.trim();
}

/** True if value is empty or a known directory / DB country label. */
export function isKnownCountryOfResidence(country: string): boolean {
  const trimmed = country.trim();
  if (!trimmed) return true;
  return Boolean(resolveStallionCountry(trimmed));
}

export function resolveStallionCountry(country: string | undefined) {
  if (!country) return undefined;
  const trimmed = country.trim();
  if (!trimmed) return undefined;

  if (/^[a-z]{2}$/i.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    const byCode = [...countryByKey.values()].find((c) => c.code === upper);
    if (byCode) return byCode;
    return { label: upper, code: upper };
  }

  return countryByKey.get(normalizeCountryKey(trimmed));
}

export function getCountryIsoCode(country: string | undefined): string | undefined {
  return resolveStallionCountry(country)?.code;
}

const FLAG_CODES = new Set(
  STALLION_STANDING_COUNTRIES.map((country) => country.code)
);

/** Local flag asset under `public/flags/`, or undefined if not bundled. */
export function getCountryFlagSrc(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  if (!FLAG_CODES.has(upper)) return undefined;
  return `/flags/${upper.toLowerCase()}.png`;
}

export function isUnitedStatesCountryOfStanding(
  country: string | undefined
): boolean {
  return getCountryIsoCode(country) === "US";
}

// --- image-path.ts ---
/**
 * Contract between admin uploads, `stallion_images.filename`, and public UI.
 *
 * Bucket `stallion-photos`, keys:
 *   stallions/{stallion_id}/images/primary/{name}.{ext}
 *   stallions/{stallion_id}/images/gallery/{name}.{ext}
 */
export const STALLION_PHOTOS_BUCKET = "stallion-photos" as const;
export const LEGACY_STALLION_IMAGES_BUCKET = "stallion-images" as const;
/** Public mirror of STALLION_PHOTOS_BUCKET; holds copies of published stallions'/mares' photos only. */
export const STALLION_PHOTOS_PUBLIC_BUCKET = "stallion-photos-public" as const;

export function normalizeStallionImageStoragePath(
  path: string | undefined
): string {
  return (path ?? "").trim().replace(/^\/+/, "");
}

export function bucketForStallionImagePath(path: string): string {
  const normalized = normalizeStallionImageStoragePath(path);
  if (normalized.startsWith("stallions/")) {
    return STALLION_PHOTOS_BUCKET;
  }
  return LEGACY_STALLION_IMAGES_BUCKET;
}

export function isManagedStallionPhotoPath(path: string): boolean {
  return normalizeStallionImageStoragePath(path).startsWith("stallions/");
}

// --- breeding-availability.ts ---

const KNOWN_METHODS = new Set<SemenMethod>([
  "Method not disclosed",
  "Fresh",
  "Chilled",
  "Cooled",
  "Frozen",
  "ICSI",
  "Live Cover",
]);

export function parseSemenAvailabilityValues(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value).trim()).filter(Boolean);
  }

  if (typeof raw === "string" && raw.startsWith("{") && raw.endsWith("}")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [];
}

export function parseBreedingMethods(values: string[]): SemenMethod[] {
  const seen = new Set<SemenMethod>();
  const out: SemenMethod[] = [];
  for (const value of values) {
    if (!KNOWN_METHODS.has(value as SemenMethod)) continue;
    const method = value as SemenMethod;
    if (seen.has(method)) continue;
    seen.add(method);
    out.push(method);
  }

  if (out.length === 0) return [];
  if (out.length === 1 && out[0] === "Method not disclosed") return out;
  return out.filter((method) => method !== "Method not disclosed");
}

export function collapseBreedingAvailability(
  values: string[],
  legacyValue?: unknown
): SemenAvailability {
  const concreteValues = values.filter((value) => value !== "Method not disclosed");
  if (concreteValues.length > 0) {
    const hasFresh = concreteValues.includes("Fresh");
    const hasLiveCover = concreteValues.includes("Live Cover");
    const hasIcsi = concreteValues.includes("ICSI");
    const hasChilled = concreteValues.includes("Chilled");
    const hasCooled = concreteValues.includes("Cooled");
    const hasFrozen = concreteValues.includes("Frozen");
    if (hasLiveCover) return "Live Cover";
    if (hasIcsi) return "ICSI";
    if ((hasChilled || hasCooled) && hasFrozen) return "Combination";
    if (hasFresh) return "Fresh";
    if (hasChilled) return "Chilled";
    if (hasCooled) return "Cooled";
    if (hasFrozen) return "Frozen";
    return "Method not disclosed";
  }

  const legacy = typeof legacyValue === "string" ? legacyValue : "None";
  if (legacy === "Both") return "Combination";
  if (legacy === "Chilled") return "Chilled";
  if (legacy === "Frozen") return "Frozen";
  if (legacy === "None") return "Method not disclosed";
  return "Method not disclosed";
}

// --- stud-fee-display.ts ---

/** Short region-style codes for stud fees (Salome design — not full ISO 4217). */
export const STUD_FEE_CURRENCY_CODES = [
  "US",
  "EU",
  "AU",
  "UK",
  "CA",
  "NZ",
  "BR",
] as const;

export type StudFeeCurrencyCode = (typeof STUD_FEE_CURRENCY_CODES)[number];

export const DEFAULT_STUD_FEE_CURRENCY: StudFeeCurrencyCode = "US";

const ISO_TO_STUD_FEE_CURRENCY: Record<string, StudFeeCurrencyCode> = {
  USD: "US",
  EUR: "EU",
  AUD: "AU",
  GBP: "UK",
  CAD: "CA",
  NZD: "NZ",
  BRL: "BR",
};

/** Map stored ISO or short codes to stud-fee display label (US, EU, AU, …). */
export function formatStudFeeCurrencyLabel(currency: string): string {
  const trimmed = currency.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  return ISO_TO_STUD_FEE_CURRENCY[upper] ?? trimmed;
}

export function studFeeCurrencySelectOptions(): { value: string; label: string }[] {
  return STUD_FEE_CURRENCY_CODES.map((code) => ({ value: code, label: code }));
}

/** Comma-separated whole number (e.g. 10000 → "10,000"). */
export function formatStudFeeAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/** Amount + short currency label (e.g. "10,000 US", "2,700 EU"). */
export function formatStudFee(value: number, currency: string): string {
  const amount = formatStudFeeAmount(value);
  const code = formatStudFeeCurrencyLabel(currency);
  if (!amount) return code;
  return code ? `${amount} ${code}` : amount;
}

export function formatStudFees(
  fees: { value: number; currency: string }[],
  separator = "  "
): string {
  return fees
    .map((f) => formatStudFee(f.value, f.currency))
    .filter(Boolean)
    .join(separator);
}

export function stallionStudFeeRows(
  stallion: Pick<Stallion, "stud_fees_resolved" | "stud_fee_resolved">
): { value: number; currency: string }[] {
  if (stallion.stud_fees_resolved?.length) return stallion.stud_fees_resolved;
  if (stallion.stud_fee_resolved) return [stallion.stud_fee_resolved];
  return [];
}

/** Trim only; map legacy ISO codes to short stud-fee labels for storage/display. */
export function studFeeCurrencyFromStorage(
  value: unknown,
  fallback = DEFAULT_STUD_FEE_CURRENCY
): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  return formatStudFeeCurrencyLabel(raw);
}

// --- derive.ts ---

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function monthToNum(raw: unknown): number {
  if (raw == null) return 0;
  const normalized = String(raw).trim().toLowerCase();
  return MONTH_INDEX[normalized] ?? (Number(normalized) || 0);
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function toCurrencyAmount(
  value: unknown,
  currency: unknown,
  fallbackCurrency = "USD"
): { value: number; currency: string } | undefined {
  const amount = toFiniteNumber(value);
  if (amount == null) return undefined;
  const code =
    typeof currency === "string" && currency.trim().length > 0
      ? currency.trim().toUpperCase()
      : fallbackCurrency;
  return { value: amount, currency: code };
}

export function normalizeSocialUrl(raw: unknown): string | undefined {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function formatOwnerAddress(row: Record<string, unknown>): string | undefined {
  const full = trimToUndefined(row.full_address);
  if (full) return full;

  const line1 = trimToUndefined(row.address_line_1);
  const line2 = trimToUndefined(row.address_line_2);
  const suburb = trimToUndefined(row.suburb);
  const state = trimToUndefined(row.state_region);
  const cityState = [suburb, state].filter(Boolean).join(", ");
  const postal = trimToUndefined(row.postal_code);

  const parts = [line1, line2, cityState || undefined, postal].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function nestedResourceDirectoryRow(
  row: Record<string, unknown>
): Record<string, unknown> | undefined {
  const nested = row.resources_directory;
  if (Array.isArray(nested)) return nested[0] as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return undefined;
}

export function mapBreedingServiceProvider(
  row: Record<string, unknown>
): BreedingServiceProvider | null {
  const directory = nestedResourceDirectoryRow(row);
  const name = trimToUndefined(row.name) ?? trimToUndefined(directory?.name);
  const website = trimToUndefined(row.website) ?? trimToUndefined(directory?.website);
  const country = trimToUndefined(row.country) ?? trimToUndefined(directory?.country);
  const email = trimToUndefined(row.email);
  const phone = trimToUndefined(row.phone);
  const contact_name = trimToUndefined(row.contact_name);

  if (!name && !website && !country && !email && !phone && !contact_name) return null;

  return {
    id: trimToUndefined(row.id),
    name,
    contact_name,
    website: normalizeSocialUrl(website) ?? website,
    country,
    email,
    phone,
  };
}

export function mapOwner(row: Record<string, unknown>): Owner {
  const address_city_state =
    [trimToUndefined(row.suburb), trimToUndefined(row.state_region)]
      .filter(Boolean)
      .join(", ") || undefined;

  const owner_id = String(row.owner_id ?? row.id ?? "").trim();
  return {
    owner_id,
    owner_name: trimToUndefined(row.owner_name) ?? owner_id ?? "Unknown owner",
    country: String(row.country ?? "").trim(),
    farm_ranch: trimToUndefined(row.farm_ranch),
    full_address: formatOwnerAddress(row) ?? address_city_state,
    address_city_state,
    email: trimToUndefined(row.email),
    phone: trimToUndefined(row.phone),
    farm_ranch_website: trimToUndefined(row.farm_ranch_website),
    facebook: normalizeSocialUrl(row.facebook),
    instagram: normalizeSocialUrl(row.instagram),
    public_display_name_only: Boolean(row.public_display_name_only),
  };
}

export function mapPerformance(row: Record<string, unknown>): PerformanceEntry {
  const reference = trimToUndefined(row.reference);
  const earningsRaw = row.earnings ?? row.level_earnings;
  const level_earnings = toCurrencyAmount(
    earningsRaw,
    row.currency ?? row.level_earnings_currency
  );
  const year = toFiniteNumber(row.year);
  const event =
    trimToUndefined(row.event) ?? trimToUndefined(row.association_event) ?? "";

  return {
    year,
    month: trimToUndefined(row.month),
    association: trimToUndefined(row.association),
    event,
    performance_class: trimToUndefined(row.class) ?? "",
    discipline: trimToUndefined(row.discipline),
    result: String(row.achievement ?? ""),
    notable_achievements: trimToUndefined(row.achievement),
    level: trimToUndefined(row.level),
    earnings:
      level_earnings?.value != null
        ? `${level_earnings.currency} ${level_earnings.value.toLocaleString()}`
        : undefined,
    level_earnings,
    reference: reference
      ? { label: reference, href: /^https?:\/\//i.test(reference) ? reference : "" }
      : undefined,
    notes: trimToUndefined(row.comments ?? row.notes),
    judges: trimToUndefined(row.judges),
    score: (() => {
      if (row.score == null) return undefined;
      if (typeof row.score === "number") return row.score;
      const raw = String(row.score).trim();
      if (!raw) return undefined;
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    })(),
  };
}

export function mapProgeny(row: Record<string, unknown>): ProgenyEntry {
  return {
    name: String(row.progeny_name ?? ""),
    year: toFiniteNumber(row.year),
    association: trimToUndefined(row.association),
    event: trimToUndefined(row.event),
    discipline: trimToUndefined(row.discipline),
    result: String(row.achievement ?? ""),
    total_earnings: toFiniteNumber(row.total_earnings),
  };
}

export function mapFoalCrop(row: Record<string, unknown>): FoalCropEntry {
  return {
    foal_crop_year: Number(row.foal_crop_year),
    number_of_foals: toFiniteNumber(row.number_of_foals),
  };
}

export function mapRacingRecord(row: Record<string, unknown>): RacingRecordEntry {
  const yearFromDate = (() => {
    const date = trimToUndefined(row.race_date);
    if (!date) return undefined;
    const y = new Date(date).getFullYear();
    return Number.isNaN(y) ? undefined : y;
  })();

  return {
    race_name: trimToUndefined(row.race_name),
    race_date: trimToUndefined(row.race_date),
    year: toFiniteNumber(row.year) ?? yearFromDate,
    track: trimToUndefined(row.track),
    race_number: toFiniteNumber(row.race_number),
    distance: trimToUndefined(row.distance),
    finish_position: toFiniteNumber(row.finish_position),
    speed_index: toFiniteNumber(row.speed_index),
    earnings: toCurrencyAmount(row.earnings, row.currency),
    result_note: trimToUndefined(row.result_note),
    chart_url: trimToUndefined(row.chart_url),
    video_url: trimToUndefined(row.video_url),
  };
}

export function mapRacingSummary(
  row: Record<string, unknown> | undefined | null
): RacingSummary | undefined {
  if (!row) return undefined;
  const summary: RacingSummary = {
    career_starts: toFiniteNumber(row.career_starts),
    career_firsts: toFiniteNumber(row.career_firsts),
    career_seconds: toFiniteNumber(row.career_seconds),
    career_thirds: toFiniteNumber(row.career_thirds),
    career_earnings: toCurrencyAmount(row.career_earnings, undefined),
    highest_rating: toFiniteNumber(row.highest_rating),
    earnings_per_start: toCurrencyAmount(row.earnings_per_start, undefined),
    source: trimToUndefined(row.source),
  };
  return Object.values(summary).some((value) => value !== undefined)
    ? summary
    : undefined;
}

export function mapGeneticTest(
  row: Record<string, unknown>
): GeneticTestEntry | null {
  const id = trimToUndefined(row.id);
  const test_type = trimToUndefined(row.test_type);
  if (!id || !test_type) return null;
  return {
    id,
    test_type,
    gene_code: trimToUndefined(row.gene_code),
    result: String(row.result ?? ""),
    source: trimToUndefined(row.source),
    admin_notes: trimToUndefined(row.admin_notes),
  };
}

export function mapColourTest(
  row: Record<string, unknown>
): ColourTestEntry | null {
  const id = trimToUndefined(row.id);
  const colour_test = trimToUndefined(row.colour_test);
  if (!id || !colour_test) return null;
  return {
    id,
    colour_test,
    gene_code: trimToUndefined(row.gene_code),
    result: String(row.result ?? ""),
    source: trimToUndefined(row.source),
    admin_notes: trimToUndefined(row.admin_notes),
  };
}

export function mapPedigree(
  row: Record<string, unknown>
): { sire: PedigreeNode; dam: PedigreeNode } {
  return {
    sire: {
      name: String(row.sire ?? "Unknown"),
      sire: row.sire_grandsire ? { name: String(row.sire_grandsire) } : undefined,
      dam: row.sire_granddam ? { name: String(row.sire_granddam) } : undefined,
    },
    dam: {
      name: String(row.dam ?? "Unknown"),
      sire: row.dam_grandsire ? { name: String(row.dam_grandsire) } : undefined,
      dam: row.dam_granddam ? { name: String(row.dam_granddam) } : undefined,
    },
  };
}

export function mapImages(rows: Record<string, unknown>[]): {
  primary_image_url?: string;
  gallery?: GalleryImage[];
} {
  const toPath = (row: Record<string, unknown>): string | undefined => {
    const filename = trimToUndefined(row.filename);
    return filename ? filename.replace(/^\/+/, "") : undefined;
  };
  const primary = rows.find((row) => row.kind === "primary");
  const gallery = rows
    .filter((row) => row.kind === "gallery")
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((row) => ({ filename: toPath(row) ?? "" }))
    .filter((row) => row.filename);
  return {
    primary_image_url: primary ? toPath(primary) : undefined,
    gallery: gallery.length ? gallery : undefined,
  };
}

export function mapDisciplineFamilyNames(
  rows: Record<string, unknown>[]
): string[] | undefined {
  const families = new Map<string, { name: string; display_order: number }>();
  for (const row of rows) {
    const id = trimToUndefined(row.id);
    const name = trimToUndefined(row.name);
    if (!id || !name) continue;
    const display_order =
      toFiniteNumber(row.display_order) ?? Number.MAX_SAFE_INTEGER;
    families.set(id, { name, display_order });
  }
  if (families.size === 0) return undefined;
  return Array.from(families.values())
    .sort((a, b) =>
      a.display_order !== b.display_order
        ? a.display_order - b.display_order
        : a.name.localeCompare(b.name)
    )
    .map((family) => family.name);
}

export function deriveBreedLabel(breed: unknown): StallionBreed | undefined {
  const normalized = typeof breed === "string" ? breed.trim() : "";
  if (!normalized) return undefined;
  return BREED_MAP[normalized] ?? (normalized as StallionBreed);
}

export function deriveYearOfBirth(date_of_birth: unknown): number | undefined {
  if (typeof date_of_birth !== "string" || !date_of_birth.trim()) return undefined;
  const year = new Date(date_of_birth).getFullYear();
  return Number.isNaN(year) ? undefined : year;
}

export function deriveHeightHands(height: unknown): number | undefined {
  if (height == null) return undefined;
  const parsed = parseFloat(String(height).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCountryAvailability(
  raw: unknown
): string[] | undefined {
  if (Array.isArray(raw)) {
    const countries = raw.map((v) => String(v).trim()).filter(Boolean);
    return countries.length > 0 ? Array.from(new Set(countries)) : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const countries = raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return countries.length > 0 ? Array.from(new Set(countries)) : undefined;
  }
  return undefined;
}

// --- discipline-family-ids.ts ---

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Map API/display labels or legacy form values to `stallion_disciplines.family_id`. */
export function disciplineLabelsToFamilyIds(
  labels: string[] | undefined,
  families: DisciplineFamily[]
): string[] {
  if (!labels?.length || families.length === 0) return [];

  const byId = new Set(families.map((f) => f.id));
  const byName = new Map(
    families.map((f) => [f.name.trim().toLowerCase(), f.id] as const)
  );

  const ids: string[] = [];
  for (const value of labels) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (isUuid(trimmed) && byId.has(trimmed)) {
      if (!ids.includes(trimmed)) ids.push(trimmed);
      continue;
    }
    const id = byName.get(trimmed.toLowerCase());
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function normalizeFamilyIds(
  values: string[],
  families: DisciplineFamily[]
): string[] {
  return disciplineLabelsToFamilyIds(values, families);
}

type LegacyFormDisciplineFields = StallionFormValues & {
  disciplineFamilyIds?: string[];
  disciplineFocus?: string[];
};

/** Ensure `family_ids` stores junction `family_id` values; migrate legacy drafts. */
export function applyFamilyIdsToForm(
  values: StallionFormValues,
  families: DisciplineFamily[]
): StallionFormValues {
  const legacy = values as LegacyFormDisciplineFields;
  const raw =
    values.family_ids.length > 0
      ? values.family_ids
      : (legacy.disciplineFamilyIds ?? legacy.disciplineFocus ?? []);

  return {
    ...values,
    family_ids: normalizeFamilyIds(raw, families),
  };
}

/** @deprecated Use applyFamilyIdsToForm */
export const applyDisciplineFamilyIdsToForm = applyFamilyIdsToForm;

// --- performance-racing-form.ts ---

export function createEmptyPerformanceRow(id = ""): FormPerformanceRow {
  return {
    id,
    year: "",
    month: "",
    association: "",
    event: "",
    class: "",
    discipline: "",
    achievement: "",
    level: "",
    score: "",
    earnings: "",
    currency: "",
    starts: "",
    firsts: "",
    seconds: "",
    thirds: "",
    highest_rating: "",
    performance_summary: "",
    judges: "",
    comments: "",
    reference: "",
  };
}

export function createEmptyRacingRow(id = ""): FormRacingRow {
  return {
    id,
    race_name: "",
    race_date: "",
    year: "",
    track: "",
    distance: "",
    finish_position: "",
    speed_index: "",
    earnings: "",
    currency: DEFAULT_STALLION_CURRENCY,
    race_number: "",
    result_note: "",
    chart_url: "",
    video_url: "",
    admin_notes: "",
  };
}

export function normalizePerformanceRow(
  row: Partial<FormPerformanceRow> & { id: string }
): FormPerformanceRow {
  return {
    ...createEmptyPerformanceRow(row.id),
    ...row,
    id: row.id,
  };
}

export function normalizeRacingRow(
  row: Partial<FormRacingRow> & { id: string }
): FormRacingRow {
  return {
    ...createEmptyRacingRow(row.id),
    ...row,
    id: row.id,
  };
}

export function normalizeRacingSummary(
  summary: Partial<FormRacingSummary> | undefined
): FormRacingSummary {
  return {
    career_starts: summary?.career_starts ?? "",
    career_firsts: summary?.career_firsts ?? "",
    career_seconds: summary?.career_seconds ?? "",
    career_thirds: summary?.career_thirds ?? "",
    career_earnings: summary?.career_earnings ?? "",
    career_earnings_currency: normalizeCurrencyCode(
      summary?.career_earnings_currency
    ),
    highest_rating: summary?.highest_rating ?? "",
    source: summary?.source ?? "",
    earnings_per_start: summary?.earnings_per_start ?? "",
    admin_notes: summary?.admin_notes ?? "",
  };
}

export function normalizeBreedingStatistics(
  stats: Partial<FormBreedingStatistics> | undefined
): FormBreedingStatistics {
  return {
    total_registered_progeny: stats?.total_registered_progeny ?? "",
    progeny_started_in_competition: stats?.progeny_started_in_competition ?? "",
    performance_earners: stats?.performance_earners ?? "",
    total_reported_offspring_earnings:
      stats?.total_reported_offspring_earnings ?? "",
    total_reported_offspring_earnings_currency: normalizeCurrencyCode(
      stats?.total_reported_offspring_earnings_currency
    ),
  };
}

export function normalizeHealthSummaries(
  summaries: Partial<FormHealthSummaries> | undefined
): FormHealthSummaries {
  return {
    genetic_disease_testing_results:
      summaries?.genetic_disease_testing_results ?? "",
    genetic_testing_results: summaries?.genetic_testing_results ?? "",
    colour_testing_results: summaries?.colour_testing_results ?? "",
    genetic_test_results_summary: summaries?.genetic_test_results_summary ?? "",
  };
}

export function performanceEntryToFormRow(
  entry: PerformanceEntry,
  id: string
): FormPerformanceRow {
  const earningsValue = entry.level_earnings?.value;
  return normalizePerformanceRow({
    id,
    year: entry.year != null ? String(entry.year) : "",
    month: entry.month ?? "",
    association: entry.association ?? "",
    event: entry.event ?? "",
    class: entry.performance_class ?? "",
    discipline: entry.discipline ?? "",
    achievement: entry.result ?? "",
    level: entry.level ?? "",
    score: entry.score != null ? String(entry.score) : "",
    earnings:
      earningsValue != null && !Number.isNaN(Number(earningsValue))
        ? String(earningsValue)
        : "",
    currency: entry.level_earnings?.currency
      ? normalizeCurrencyCode(entry.level_earnings.currency, "")
      : entry.level_earnings?.value != null
        ? DEFAULT_STALLION_CURRENCY
        : "",
  });
}

export function racingEntryToFormRow(
  entry: RacingRecordEntry,
  id: string
): FormRacingRow {
  return normalizeRacingRow({
    id,
    race_name: entry.race_name ?? "",
    race_date: entry.race_date ?? "",
    year: entry.year != null ? String(entry.year) : "",
    track: entry.track ?? "",
    distance: entry.distance ?? "",
    finish_position:
      entry.finish_position != null ? String(entry.finish_position) : "",
    speed_index: entry.speed_index != null ? String(entry.speed_index) : "",
    earnings: entry.earnings?.value != null ? String(entry.earnings.value) : "",
    currency: normalizeCurrencyCode(entry.earnings?.currency),
  });
}

// --- form-state.ts ---

function newTempId(): string {
  return `row-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyStallionFormState(): StallionFormValues {
  return {
    id: "",
    publish_status: "",
    horse_type: "stallion",
    et_details: { ...EMPTY_MARE_ET_DETAILS },
    stallion_name: "",
    stallion_status: "",
    breed: "",
    country_of_residence: "",
    year_of_birth: "",
    coat_colour: "",
    coat_pattern: "",
    height: "",
    country_of_registration: "",
    summary: "",
    family_ids: [],
    registration_number: "",
    registry: "",
    official_registry_link: "",
    total_reported_earnings: "",
    total_reported_earnings_currency: DEFAULT_STALLION_CURRENCY,
    performance_summary: "",
    performance_records: [],
    racing_records: [],
    racing_summary: {
      career_starts: "",
      career_firsts: "",
      career_seconds: "",
      career_thirds: "",
      career_earnings: "",
      career_earnings_currency: DEFAULT_STALLION_CURRENCY,
      highest_rating: "",
      source: "",
      earnings_per_start: "",
      admin_notes: "",
    },
    notable_progeny: [],
    foal_crops: [],
    total_registered_progeny: "",
    progeny_started_in_competition: "",
    performance_earners: "",
    total_reported_offspring_earnings: "",
    total_reported_offspring_earnings_currency: DEFAULT_STALLION_CURRENCY,
    semen_availability: [],
    live_cover_available: false,
    country_availability: [],
    stud_fees: [],
    breeding_guarantees: "",
    breeding_manager: "",
    breeding_manager_organization: "",
    breeding_manager_email: "",
    breeding_manager_phone: "",
    breeding_notes: "",
    breeding_service_providers: [],
    genetic_disease_testing_results: "",
    genetic_testing_results: "",
    colour_testing_results: "",
    genetic_test_results_summary: "",
    genetic_tests: [],
    colour_tests: [],
    primary_image_url: "",
    gallery: [],
    video_url: "",
    owner_links: [],
  };
}

// --- to-stallion.ts ---

export type StallionRelations = {
  owners?: Record<string, unknown>[];
  performance_records?: Record<string, unknown>[];
  notable_progeny?: Record<string, unknown>[];
  images?: Record<string, unknown>[];
  foal_crops?: Record<string, unknown>[];
  racing_records?: Record<string, unknown>[];
  racing_summary_row?: Record<string, unknown> | null;
  genetic_tests?: Record<string, unknown>[];
  colour_tests?: Record<string, unknown>[];
  discipline_focus?: string[];
  breeding_service_providers?: Record<string, unknown>[];
  has_active_subscription?: boolean;
};

function defaultRelations(
  row: Record<string, unknown>,
  relations?: StallionRelations
): Required<Omit<StallionRelations, "racing_summary_row">> & {
  racing_summary_row: Record<string, unknown> | null;
} {
  const rawSummary = row.stallion_racing_summary as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined
    | null;

  return {
    owners:
      relations?.owners ??
      ((row.stallion_owners as Record<string, unknown>[] | undefined) ?? []).map((link) => {
        const nested = link.owners as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined;
        const owner = Array.isArray(nested) ? (nested[0] ?? {}) : (nested ?? {});
        return {
          ...owner,
          owner_id: link.owner_id,
          public_display_name_only: link.public_display_name_only,
        };
      }),
    performance_records:
      relations?.performance_records ??
      (((row.stallion_performance_records as Record<string, unknown>[] | undefined) ?? [])
        .slice()
        .sort((a, b) => {
          const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
          if (yearDiff !== 0) return yearDiff;
          return monthToNum(b.month) - monthToNum(a.month);
        })),
    notable_progeny:
      relations?.notable_progeny ??
      ((row.stallion_progeny as Record<string, unknown>[] | undefined) ?? []),
    images:
      relations?.images ??
      ((row.stallion_images as Record<string, unknown>[] | undefined) ?? []),
    foal_crops:
      relations?.foal_crops ??
      ((row.stallion_foal_crops as Record<string, unknown>[] | undefined) ?? []),
    racing_records:
      relations?.racing_records ??
      ((row.stallion_racing_results as Record<string, unknown>[] | undefined) ?? []),
    racing_summary_row:
      relations?.racing_summary_row ??
      (Array.isArray(rawSummary) ? (rawSummary[0] ?? null) : (rawSummary ?? null)),
    genetic_tests:
      relations?.genetic_tests ??
      ((row.stallion_genetic_tests as Record<string, unknown>[] | undefined) ?? []),
    colour_tests:
      relations?.colour_tests ??
      ((row.stallion_colour_tests as Record<string, unknown>[] | undefined) ?? []),
    discipline_focus: relations?.discipline_focus ?? [],
    breeding_service_providers: relations?.breeding_service_providers ?? [],
    has_active_subscription: relations?.has_active_subscription ?? false,
  };
}

export function toStallion(
  row: StallionsRow | Record<string, unknown>,
  relations?: StallionRelations
): Stallion {
  const source = row as Record<string, unknown>;
  const joined = defaultRelations(source, relations);

  const semenValues = parseSemenAvailabilityValues(source.semen_availability);
  const breeding_methods = parseBreedingMethods(semenValues);
  const breeding_availability = collapseBreedingAvailability(
    semenValues,
    (source.semen_availability_legacy as string | undefined) ??
      (typeof source.semen_availability === "string"
        ? (source.semen_availability as string)
        : undefined)
  );

  const slug =
    trimToUndefined(source.slug)?.toLowerCase() ??
    slugifyStallionName(String(source.stallion_name ?? ""));

  const foal_crops = joined.foal_crops
    .map(mapFoalCrop)
    .sort((a, b) => b.foal_crop_year - a.foal_crop_year);

  // Embedded mare_et_details: PostgREST may return an object (one-to-one) or a
  // single-element array depending on how the embed was requested.
  const etRaw = source.mare_et_details;
  const etRow = Array.isArray(etRaw)
    ? (etRaw[0] as Record<string, unknown> | undefined)
    : ((etRaw ?? undefined) as Record<string, unknown> | undefined);
  const et_details: MareEtDetails | undefined = etRow
    ? {
        et_status: trimToUndefined(etRow.et_status),
        clinic_name: trimToUndefined(etRow.clinic_name),
        clinic_location: trimToUndefined(etRow.clinic_location),
        flush_history: trimToUndefined(etRow.flush_history),
        embryo_fee:
          typeof etRow.embryo_fee === "number"
            ? etRow.embryo_fee
            : etRow.embryo_fee != null && `${etRow.embryo_fee}`.trim() !== ""
              ? Number(etRow.embryo_fee)
              : undefined,
        embryo_fee_currency: trimToUndefined(etRow.embryo_fee_currency),
        embryo_availability: trimToUndefined(etRow.embryo_availability),
        last_verified_at: trimToUndefined(etRow.last_verified_at),
        international_availability:
          typeof etRow.international_availability === "boolean"
            ? etRow.international_availability
            : undefined,
        admin_notes: trimToUndefined(etRow.admin_notes),
      }
    : undefined;

  return {
    ...(source as StallionsRow),
    id: String(source.id ?? ""),
    stallion_name: String(source.stallion_name ?? ""),
    et_details,
    slug,
    breed_label: deriveBreedLabel(source.breed),
    year_of_birth: deriveYearOfBirth(source.date_of_birth),
    height_hands: deriveHeightHands(source.height),
    stallion_lte: toCurrencyAmount(
      source.total_reported_earnings,
      source.total_reported_earnings_currency ?? source.stud_fee_currency
    ),
    official_registry_link: trimToUndefined(source.official_registry_link),
    discipline_focus:
      joined.discipline_focus.length > 0 ? joined.discipline_focus : undefined,
    breeding_availability,
    breeding_methods: breeding_methods.length > 0 ? breeding_methods : undefined,
    country_availability_resolved: parseCountryAvailability(source.country_availability),
    stud_fee_resolved: toCurrencyAmount(source.stud_fee, source.stud_fee_currency),
    stud_fees_resolved: (() => {
      if (Array.isArray(source.stud_fees)) {
        const parsed = source.stud_fees
          .map((fee) => {
            if (typeof fee !== "object" || fee == null) return undefined;
            const obj = fee as Record<string, unknown>;
            const amount = toFiniteNumber(obj.value);
            if (amount == null) return undefined;
            return {
              value: amount,
              currency: studFeeCurrencyFromStorage(obj.currency),
            };
          })
          .filter((fee): fee is { value: number; currency: string } => Boolean(fee));
        if (parsed.length > 0) return parsed;
      }
      const fallback = toCurrencyAmount(source.stud_fee, source.stud_fee_currency);
      return fallback
        ? [
            {
              value: fallback.value,
              currency: formatStudFeeCurrencyLabel(fallback.currency),
            },
          ]
        : undefined;
    })(),
    breeding_manager_contact: (() => {
      const name = trimToUndefined(source.breeding_manager);
      const organization = trimToUndefined(source.breeding_manager_organization);
      const email = trimToUndefined(source.breeding_manager_email);
      const phone = trimToUndefined(source.breeding_manager_phone);
      if (!name && !organization && !email && !phone) return undefined;
      return { name, organization, email, phone };
    })(),
    breeding_service_providers:
      joined.breeding_service_providers
        .map((provider) => mapBreedingServiceProvider(provider))
        .filter((provider): provider is NonNullable<typeof provider> => provider != null) ||
      undefined,
    owners: joined.owners.map(mapOwner),
    breeding_guarantees_resolved:
      (source.breeding_guarantees as Stallion["breeding_guarantees_resolved"]) ??
      undefined,
    pedigree: mapPedigree(source),
    performance_records:
      joined.performance_records.length > 0
        ? joined.performance_records.map(mapPerformance)
        : undefined,
    notable_progeny:
      joined.notable_progeny.length > 0
        ? joined.notable_progeny.map(mapProgeny)
        : undefined,
    foal_crops: foal_crops.length > 0 ? foal_crops : undefined,
    racing_records:
      joined.racing_records.length > 0
        ? joined.racing_records
            .map(mapRacingRecord)
            .sort((a, b) => {
              const aDate = a.race_date ? Date.parse(a.race_date) : NaN;
              const bDate = b.race_date ? Date.parse(b.race_date) : NaN;
              if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return bDate - aDate;
              return (b.year ?? 0) - (a.year ?? 0);
            })
        : undefined,
    racing_summary: mapRacingSummary(joined.racing_summary_row),
    genetic_tests:
      joined.genetic_tests
        .map((rowItem) => mapGeneticTest(rowItem))
        .filter((rowItem): rowItem is NonNullable<typeof rowItem> => rowItem != null) ||
      undefined,
    colour_tests:
      joined.colour_tests
        .map((rowItem) => mapColourTest(rowItem))
        .filter((rowItem): rowItem is NonNullable<typeof rowItem> => rowItem != null) ||
      undefined,
    genetic_test_results_summary: trimToUndefined(source.genetic_test_results_summary),
    breeding_statistics: {
      total_registered_progeny:
        typeof source.total_registered_progeny === "number"
          ? source.total_registered_progeny
          : undefined,
      progeny_started_in_competition:
        typeof source.progeny_started_in_competition === "number"
          ? source.progeny_started_in_competition
          : undefined,
      performance_earners:
        typeof source.performance_earners === "number"
          ? source.performance_earners
          : undefined,
      total_reported_offspring_earnings: toCurrencyAmount(
        source.total_reported_offspring_earnings,
        source.total_reported_offspring_earnings_currency ?? source.stud_fee_currency
      ),
    },
    media: {
      ...mapImages(joined.images),
      video_url: trimToUndefined(source.video_url),
    },
    is_founding_member: Boolean(source.featured),
    has_active_subscription: joined.has_active_subscription,
  };
}


// --- publish-validation.ts ---

/** Unique validation messages from RPC `details.fields` (publish from list). */
export function validationMessagesFromRpcDetails(
  details: Record<string, unknown> | undefined
): string[] {
  if (!details || !Array.isArray(details.fields)) return [];
  const messages: string[] = [];
  for (const item of details.fields) {
    if (
      item &&
      typeof item === "object" &&
      "message" in item &&
      typeof (item as { message?: unknown }).message === "string"
    ) {
      const msg = (item as { message: string }).message.trim();
      if (msg) messages.push(msg);
    }
  }
  return messages;
}

// --- directory-list-url.ts ---

export function parseDirectoryBreedFilter(
  value: string | undefined | null
): StallionBreed | "All" {
  if (
    value === "Quarter Horse" ||
    value === "Paint" ||
    value === "Appaloosa"
  ) {
    return value;
  }
  return "All";
}

export function parseDirectoryAvailabilityFilter(
  value: string | undefined | null
): SemenAvailability | "All" {
  const options: SemenAvailability[] = [
    "Method not disclosed",
    "Fresh",
    "Chilled",
    "Cooled",
    "Frozen",
    "ICSI",
    "Combination",
    "Live Cover",
  ];
  if (value && options.includes(value as SemenAvailability)) {
    return value as SemenAvailability;
  }
  return "All";
}

export type DirectoryFiltersFromUrl = {
  keyword: string;
  country: string;
  breed: StallionBreed | "All";
  availability: SemenAvailability | "All";
  color: string;
  geneticProfile: string;
  discipline: string;
  /** Ancestor conditions, ANDed together (see `@/utils/bloodline-search`). */
  bloodlines: BloodlineCondition[];
};

type DirectorySearchParams = Pick<URLSearchParams, "get" | "getAll">;

export function parseDirectoryFiltersFromSearchParams(
  searchParams: DirectorySearchParams
): DirectoryFiltersFromUrl {
  return {
    keyword: (searchParams.get("q") ?? "").trim(),
    country: searchParams.get("country")?.trim() || "All",
    breed: parseDirectoryBreedFilter(searchParams.get("breed")),
    availability: parseDirectoryAvailabilityFilter(searchParams.get("availability")),
    color: searchParams.get("color")?.trim() || "All",
    geneticProfile: searchParams.get("geneticProfile")?.trim() || "All",
    discipline: searchParams.get("discipline")?.trim() || "All",
    bloodlines: parseBloodlinesFromSearchParams(searchParams),
  };
}

export function hasActiveDirectoryFilters(
  searchParams: DirectorySearchParams
): boolean {
  const filters = parseDirectoryFiltersFromSearchParams(searchParams);
  return Boolean(
    filters.keyword ||
      filters.country !== "All" ||
      filters.breed !== "All" ||
      filters.availability !== "All" ||
      filters.color !== "All" ||
      filters.geneticProfile !== "All" ||
      filters.discipline !== "All" ||
      filters.bloodlines.length
  );
}

export function buildStallionDirectoryHref({
  q = "",
  country = "All",
  breed = "All",
  availability = "All",
  color = "All",
  geneticProfile = "All",
  discipline = "All",
  bloodlines = [],
  page = 1,
}: {
  q?: string;
  country?: string;
  breed?: StallionBreed | "All";
  availability?: SemenAvailability | "All";
  color?: string;
  geneticProfile?: string;
  discipline?: string;
  bloodlines?: BloodlineCondition[];
  page?: number;
}): string {
  const params = new URLSearchParams();
  const trimmedQ = q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (country && country !== "All") params.set("country", country);
  if (breed !== "All") params.set("breed", breed);
  if (availability !== "All") params.set("availability", availability);
  if (color !== "All") params.set("color", color);
  if (geneticProfile !== "All") params.set("geneticProfile", geneticProfile);
  if (discipline !== "All") params.set("discipline", discipline);
  for (const value of serializeBloodlineConditions(bloodlines)) {
    params.append(BLOODLINE_PARAM, value);
  }
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/stallions?${query}` : "/stallions";
}

// --- stallions-list-url.ts ---

export function parseAdminStallionsStatusFilter(
  value: string | undefined | null
): AdminStallionsStatusFilter {
  if (value === "published" || value === "draft") return value;
  return "all";
}

export function parseAdminStallionsTypeFilter(
  value: string | undefined | null
): AdminStallionsTypeFilter {
  if (value === "stallion" || value === "mare") return value;
  return "all";
}

export function buildManageStallionsHref({
  q = "",
  status = "all",
  type = "all",
  page = 1,
}: {
  q?: string;
  status?: AdminStallionsStatusFilter;
  type?: AdminStallionsTypeFilter;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const trimmedQ = q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (status !== "all") params.set("status", status);
  if (type !== "all") params.set("type", type);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/dashboard/stallions?${query}` : "/dashboard/stallions";
}

// --- country-ownership.ts ---
/** Admin convention: country = country of primary ownership (`country_of_residence` in DB). */
export const COUNTRY_OWNERSHIP_FIELD_LABEL = "Country (of ownership)";

export const COUNTRY_OWNERSHIP_HELPER_TEXT =
  "Country reflects the country of the stallion's primary ownership. Current location, competition country, and semen availability are recorded separately on the profile.";

// --- publish-validation-toast.ts ---
type PublishValidationToastOptions = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

/** Show field-level publish errors in a sonner toast. */
export function toastPublishValidationFailure(
  toast: {
    error: (message: string, options?: PublishValidationToastOptions) => void;
    message?: (message: string, options?: PublishValidationToastOptions) => void;
  },
  options: {
    title: string;
    validationMessages?: string[];
    editStallionId?: string;
    onEdit?: () => void;
  }
): void {
  const messages = options.validationMessages ?? [];
  const duration = Math.min(12000, 4000 + messages.length * 1200);

  if (messages.length > 0) {
    toast.error(options.title, {
      description: messages.map((m) => `• ${m}`).join("\n"),
      duration,
    });
  } else {
    toast.error(options.title, { duration });
  }

  if (options.editStallionId && options.onEdit) {
    toast.message?.("Open the stallion editor to fix these fields.", {
      action: {
        label: "Edit",
        onClick: options.onEdit,
      },
    });
  }
}

// --- mappers.ts ---

export function mapRowsToStallions(rows: Record<string, unknown>[]): Stallion[] {
  return rows.map((row) => toStallion(row));
}

export function mapStallion(
  row: Record<string, unknown>,
  owners: Record<string, unknown>[],
  performance_records: Record<string, unknown>[],
  notable_progeny: Record<string, unknown>[],
  images: Record<string, unknown>[],
  foal_crops: Record<string, unknown>[],
  racing_records: Record<string, unknown>[],
  racing_summary_row: Record<string, unknown> | null,
  genetic_tests: Record<string, unknown>[],
  colour_tests: Record<string, unknown>[]
): Stallion {
  const relations: StallionRelations = {
    owners,
    performance_records,
    notable_progeny,
    images,
    foal_crops,
    racing_records,
    racing_summary_row,
    genetic_tests,
    colour_tests,
  };
  return toStallion(row, relations);
}
