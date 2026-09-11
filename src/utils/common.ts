import type { StallionBreed } from "@/types/stallion";
import { twMerge } from "tailwind-merge";

// --- strings.ts ---
/** Trim a value, returning `undefined` for non-strings or empty results. */
export function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// --- currencies.ts ---
/** ISO 4217 codes used across stallion earnings, fees, and stud fees. */
export const STALLION_CURRENCY_CODES = [
  "USD",
  "AUD",
  "GBP",
  "EUR",
  "COP",
  "CAD",
  "NZD",
  "CHF",
  "JPY",
  "SEK",
  "NOK",
  "DKK",
  "ZAR",
  "BRL",
] as const;

export type StallionCurrencyCode = (typeof STALLION_CURRENCY_CODES)[number];

export const DEFAULT_STALLION_CURRENCY: StallionCurrencyCode = "USD";

const CODE_SET = new Set<string>(STALLION_CURRENCY_CODES);

/** ISO 4217 alphabetic codes are exactly three letters. */
const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function normalizeCurrencyCode(
  value: unknown,
  fallback: string = DEFAULT_STALLION_CURRENCY
): string {
  const raw =
    typeof value === "string" ? value.trim().toUpperCase().slice(0, 3) : "";
  if (raw.length === 0) return fallback;
  if (CODE_SET.has(raw)) return raw;
  // Keep any well-formed code we do not list rather than relabelling stored
  // money as USD. Callers hydrate database values into form state, so a
  // substitution here is persisted the next time that form is saved.
  return ISO_CURRENCY_PATTERN.test(raw) ? raw : fallback;
}

/** True when value is a known stallion currency code (after trim/uppercase). */
export function isStallionCurrencyCode(value: unknown): value is StallionCurrencyCode {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return CODE_SET.has(raw);
}

export function currencySelectOptions(opts?: {
  allowEmpty?: boolean;
  emptyLabel?: string;
  /**
   * A currently stored code. Kept selectable even when it sits outside the
   * canonical list, so opening a record cannot silently change its currency.
   */
  include?: string;
}): { value: string; label: string }[] {
  const stored =
    typeof opts?.include === "string" ? opts.include.trim().toUpperCase() : "";
  const extra =
    stored && !CODE_SET.has(stored) && ISO_CURRENCY_PATTERN.test(stored)
      ? [{ value: stored, label: stored }]
      : [];
  const items = [
    ...extra,
    ...STALLION_CURRENCY_CODES.map((code) => ({
      value: code,
      label: code,
    })),
  ];
  if (opts?.allowEmpty) {
    return [
      { value: "", label: opts.emptyLabel ?? "—" },
      ...items,
    ];
  }
  return items;
}

// --- db-enums.ts ---

/** `public.breed_type` */
export const BREED_TYPE_VALUES = ["QH", "Paint", "Appaloosa"] as const;
export type BreedType = (typeof BREED_TYPE_VALUES)[number];

export const BREED_TYPE_LABELS: Record<BreedType, string> = {
  QH: "QH (Quarter Horse)",
  Paint: "Paint",
  Appaloosa: "Appaloosa",
};

/** `public.semen_availability_option_type` (array column elements) */
export const SEMEN_AVAILABILITY_OPTION_TYPE_VALUES = [
  "Fresh",
  "Chilled",
  "Frozen",
  "Live Cover",
  "Method not disclosed",
  "ICSI",
  "Cooled",
] as const;
export type SemenAvailabilityOptionType =
  (typeof SEMEN_AVAILABILITY_OPTION_TYPE_VALUES)[number];

/** `public.publish_status_type` */
export const PUBLISH_STATUS_TYPE_VALUES = ["draft", "published"] as const;
export type PublishStatusType = (typeof PUBLISH_STATUS_TYPE_VALUES)[number];

/** `public.pedigree_type` */
export const PEDIGREE_TYPE_VALUES = ["sire", "dam"] as const;
export type PedigreeType = (typeof PEDIGREE_TYPE_VALUES)[number];

export const PEDIGREE_TYPE_LABELS: Record<PedigreeType, string> = {
  sire: "Sire line",
  dam: "Dam line",
};

const BREED_TO_DISPLAY: Record<BreedType, StallionBreed> = {
  QH: "Quarter Horse",
  Paint: "Paint",
  Appaloosa: "Appaloosa",
};

const DISPLAY_TO_BREED: Record<StallionBreed, BreedType> = {
  "Quarter Horse": "QH",
  Paint: "Paint",
  Appaloosa: "Appaloosa",
};

export function breedTypeToDisplay(breed: string): StallionBreed {
  if (breed in BREED_TO_DISPLAY) {
    return BREED_TO_DISPLAY[breed as BreedType];
  }
  if (breed in DISPLAY_TO_BREED) {
    return breed as StallionBreed;
  }
  return "Quarter Horse";
}

export function breedTypeFromDisplayOrDb(breed: string): BreedType | "" {
  if (breed in BREED_TO_DISPLAY) return breed as BreedType;
  if (breed in DISPLAY_TO_BREED) return DISPLAY_TO_BREED[breed as StallionBreed];
  return "";
}

export function isBreedType(value: string): value is BreedType {
  return (BREED_TYPE_VALUES as readonly string[]).includes(value);
}

export function isSemenAvailabilityOptionType(
  value: string
): value is SemenAvailabilityOptionType {
  return (SEMEN_AVAILABILITY_OPTION_TYPE_VALUES as readonly string[]).includes(
    value
  );
}

export function isPublishStatusType(value: string): value is PublishStatusType {
  return (PUBLISH_STATUS_TYPE_VALUES as readonly string[]).includes(value);
}

export function isPedigreeType(value: string): value is PedigreeType {
  return (PEDIGREE_TYPE_VALUES as readonly string[]).includes(value);
}

// --- research-locales.ts ---

/**
 * Language of the source material captured in a research snippet image.
 * Must stay in sync with `stallion_research_snippets_images_locale_check` and
 * with `RESEARCH_LOCALES` in supabase/functions/upload-research-images.
 */
export const RESEARCH_LOCALE_VALUES = ["en", "pt-BR"] as const;
export type ResearchLocale = (typeof RESEARCH_LOCALE_VALUES)[number];

export const DEFAULT_RESEARCH_LOCALE: ResearchLocale = "en";

export const RESEARCH_LOCALE_LABELS: Record<ResearchLocale, string> = {
  en: "English",
  "pt-BR": "Portuguese (pt-BR)",
};

export function researchLocaleSelectOptions(): { value: string; label: string }[] {
  return RESEARCH_LOCALE_VALUES.map((value) => ({
    value,
    label: RESEARCH_LOCALE_LABELS[value],
  }));
}

/** Falls back to English for unknown or missing values (e.g. pre-migration rows). */
export function normalizeResearchLocale(value: unknown): ResearchLocale {
  const raw = typeof value === "string" ? value.trim() : "";
  return (RESEARCH_LOCALE_VALUES as readonly string[]).includes(raw)
    ? (raw as ResearchLocale)
    : DEFAULT_RESEARCH_LOCALE;
}

// --- slug.ts ---
/**
 * Matches the 8-4-4-4-12 hex shape of PostgreSQL's `uuid` type. Deliberately
 * doesn't enforce RFC 4122 version/variant nibbles — Postgres accepts any
 * value in this shape as a `uuid` (e.g. hand-crafted ids like
 * `00000000-0000-0000-0000-0000000e2e01` for test data), and this check only
 * decides id-vs-slug routing, not query safety, so being stricter than
 * Postgres itself just produces false-negative 404s.
 */
const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_SEGMENT.test(value.trim());
}

/** Align with `public.slugify_stallion_name` in migrations (URL-safe slug). */
export function slugifyStallionName(name: string): string {
  const t = name.trim().toLowerCase();
  const slug = t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "stallion";
}

// --- pagination.ts ---
/** Page numbers with gaps as ellipsis (for direct jumps without listing every page). */
export function buildPageList(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 1) return [1];
  const delta = 2;
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let i = current - delta; i <= current + delta; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push("ellipsis");
    }
    out.push(sorted[i]);
  }
  return out;
}

// --- registry-link.ts ---
/**
 * Turn registry field values into safe external hrefs.
 * Bare hostnames (e.g. aqha.com.au) are interpreted as relative URLs by the browser
 * unless given a scheme — that caused navigation to stay on-site / wrong paths.
 */
export type RegistryFieldResolved =
  | { kind: "link"; href: string; display: string }
  | { kind: "text"; text: string };

export function resolveRegistryField(
  raw: string | undefined
): RegistryFieldResolved {
  const s = (raw ?? "").trim();
  if (!s) return { kind: "text", text: "—" };

  // Free-text lists (e.g. "aqha.com.au, PHAA") — never a single href
  if (/,/.test(s)) {
    return { kind: "text", text: s };
  }

  // Already has a URL-like scheme (http, https, mailto, tel, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    try {
      const u = new URL(s);
      const p = u.protocol.toLowerCase();
      if (
        p === "http:" ||
        p === "https:" ||
        p === "mailto:" ||
        p === "tel:"
      ) {
        return { kind: "link", href: u.toString(), display: s };
      }
    } catch {
      return { kind: "text", text: s };
    }
  }

  // Protocol-relative //example.com
  if (s.startsWith("//")) {
    return { kind: "link", href: `https:${s}`, display: s };
  }

  const path = s.replace(/^\/+/, "");
  if (/\s/.test(path)) {
    return { kind: "text", text: s };
  }

  // Bare hostname or hostname/path — prepend https://
  if (path.includes(".")) {
    try {
      const href = `https://${path}`;
      const u = new URL(href);
      if (u.hostname.includes(".")) {
        return { kind: "link", href, display: s };
      }
    } catch {
      return { kind: "text", text: s };
    }
  }

  return { kind: "text", text: s };
}

// --- utils.ts ---
export function cn(...classes: Array<string | undefined | false | null>) {
  return twMerge(classes.filter(Boolean).join(" "));
}


export function formatCurrency(
  value: number,
  currency: string,
  locale: string = "en-US"
) {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString(locale)}`;
  }
}

export function formatHeight(height?: { value: number; unit: "HH" | "cm" }) {
  if (!height) return "—";
  if (height.unit === "cm") return `${height.value} cm`;
  return `${height.value} HH`;
}

export const METRIC_HEIGHT_LOCALES = ["pt-BR"] as const;

/** Decimal hands (e.g. 15.2) → centimeters; decimal part is inches. */
export function handsToCentimeters(hands: number): number {
  const wholeHands = Math.floor(hands);
  const inches = Math.round((hands - wholeHands) * 10);
  return Math.round(wholeHands * 10.16 + inches * 2.54);
}

export function formatStallionHeight(
  hands: number | undefined,
  locale: string
): { value: number; unit: "HH" | "cm"; display: string } | null {
  if (hands == null || !Number.isFinite(hands)) return null;
  if ((METRIC_HEIGHT_LOCALES as readonly string[]).includes(locale)) {
    const value = handsToCentimeters(hands);
    return { value, unit: "cm", display: formatHeight({ value, unit: "cm" }) };
  }
  return { value: hands, unit: "HH", display: formatHeight({ value: hands, unit: "HH" }) };
}

/**
 * Parses optional numeric form input for Postgres/PostgREST: trimmed empty strings
 * and invalid numbers become `null` so numeric columns are not sent `""`.
 */
export function parseNumericInput(
  raw: string | undefined | null
): number | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
