import type { FormPedigreeRow, FormPedigreeRegistrationRow } from "@/types/stallion-form";
import type { PedigreeType } from "@/utils/common";
import { trimToUndefined } from "@/utils/common";

// --- display.ts ---
/**
 * Pedigree generation labels and ancestor display formatting for profile UI.
 * DB generation 1 = sire/dam (subject stallion is implicit generation 0).
 */

/** Generations shown on the public stallion profile pedigree chart. */
export const PROFILE_PEDIGREE_MAX_GENERATIONS = 2;

/** Minimum row track height for pedigree grid cells (rem). */
export const PEDIGREE_ROW_MIN_HEIGHT_REM = 4.75;

/**
 * Registry segment inside parentheses, e.g. "AQHA US-4278968".
 * Association and registration number stay separate in the DB; joined for display only.
 */
export type PedigreeRegistrationDisplay = {
  association_name?: string;
  country?: string;
  registration_number?: string;
  is_primary?: boolean;
};

function pedigreeRegistrationParts(
  association?: string,
  registrationNumber?: string,
  country?: string
): string[] {
  const assoc = association?.trim();
  const c = country?.trim().toUpperCase();
  const reg = registrationNumber?.trim();
  const parts: string[] = [];
  if (assoc && assoc !== "—") parts.push(assoc);
  if (c) parts.push(c);
  if (reg) parts.push(reg);
  return parts;
}

export function formatPedigreeRegistrySegment(
  association?: string,
  registrationNumber?: string,
  country?: string
): string | undefined {
  const parts = pedigreeRegistrationParts(
    association,
    registrationNumber,
    country
  );
  if (parts.length === 0) return undefined;
  return parts.join(" ");
}

/** Same parts as the registry segment, joined for compact list labels. */
export function formatPedigreeRegistrationListLabel(
  reg: PedigreeRegistrationDisplay
): string {
  const parts = pedigreeRegistrationParts(
    reg.association_name,
    reg.registration_number,
    reg.country
  );
  return parts.length > 0 ? `(${parts.join(" ")})` : "";
}

export function formatPedigreeRegistrySegmentFromRegistration(
  reg: PedigreeRegistrationDisplay
): string | undefined {
  return formatPedigreeRegistrySegment(
    reg.association_name,
    reg.registration_number,
    reg.country
  );
}

/**
 * Full ancestor line: "Spooks Gotta Gun (AQHA US-4278968)".
 */
export function formatPedigreeAncestorDisplay(
  name: string,
  association?: string,
  registrationNumber?: string,
  country?: string
): string {
  const trimmedName = name.trim();
  if (!trimmedName) return "";
  const registry = formatPedigreeRegistrySegment(
    association,
    registrationNumber,
    country
  );
  if (registry) return `${trimmedName} (${registry})`;
  return trimmedName;
}

/** Primary registration in parentheses; additional registrations as extra segments. */
export function formatPedigreeAncestorDisplayWithRegistrations(
  name: string,
  registrations: PedigreeRegistrationDisplay[]
): string {
  const trimmedName = name.trim();
  if (!trimmedName) return "";

  const sorted = [...registrations].filter(
    (r) =>
      r.association_name?.trim() ||
      r.country?.trim() ||
      r.registration_number?.trim()
  );
  if (sorted.length === 0) return trimmedName;

  const primary = sorted.find((r) => r.is_primary) ?? sorted[0];
  const primarySeg = formatPedigreeRegistrySegmentFromRegistration(primary);
  const others = sorted
    .filter((r) => r !== primary)
    .map((r) => formatPedigreeRegistrySegmentFromRegistration(r))
    .filter(Boolean);

  const parts = [primarySeg, ...others].filter(Boolean);
  if (parts.length === 0) return trimmedName;
  return `${trimmedName} (${parts.join(", ")})`;
}

function ordinalSuffix(generation: number): string {
  const mod100 = generation % 100;
  const mod10 = generation % 10;

  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

/** Label for a pedigree chart column (DB generation = display generation). */
export function formatPedigreeGenerationLabel(dbGeneration: number): string {
  return `${dbGeneration}${ordinalSuffix(dbGeneration)} Generation`;
}

export const ADMIN_PEDIGREE_MAX_GENERATION = 8;

export function pedigreeGenerationLabel(generation: number): string {
  const mod100 = generation % 100;
  const mod10 = generation % 10;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) suffix = "st";
    else if (mod10 === 2) suffix = "nd";
    else if (mod10 === 3) suffix = "rd";
  }
  return `${generation}${suffix} generation`;
}

/**
 * Milestone 16 counts the stallion himself as generation 1, so his sire and dam
 * are its generation 2. The DB starts counting at the sire/dam as generation 1,
 * which is what `pedigreeGenerationLabel` renders in the wizard headings. Copy
 * that quotes the brief therefore runs one ahead of what is stored; nothing in
 * the database is renumbered.
 */
export function pedigreeBriefGeneration(generation: number): number {
  return generation + 1;
}

/** "generations 3–5" / "generation 3" in brief numbering, for prefill copy. */
export function pedigreeBriefGenerationRange(from: number, to: number): string {
  const start = pedigreeBriefGeneration(Math.min(from, to));
  const end = pedigreeBriefGeneration(Math.max(from, to));
  return start === end
    ? `generation ${start}`
    : `generations ${start}–${end}`;
}

// --- registrations.ts ---

export function newPedigreeRegistrationTempId(): string {
  return `preg-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyPedigreeRegistration(
  options?: { is_primary?: boolean }
): FormPedigreeRegistrationRow {
  return {
    tempId: newPedigreeRegistrationTempId(),
    association_name: "",
    country: "",
    registration_number: "",
    is_primary: options?.is_primary ?? false,
  };
}

/** Strip outer parentheses from registration number input. */
export function normalizeRegistrationNumberInput(value: string): string {
  let t = value.trim();
  if (t.startsWith("(") && t.endsWith(")")) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

export function formatPedigreeRegistrationLabel(
  reg: Pick<
    FormPedigreeRegistrationRow,
    "association_name" | "country" | "registration_number"
  >
): string {
  const assoc = reg.association_name.trim();
  const country = reg.country.trim().toUpperCase();
  const num = normalizeRegistrationNumberInput(reg.registration_number);
  const inner = [assoc, country, num].filter(Boolean).join(" ");
  return inner ? `(${inner})` : "";
}

export function registrationRowHasContent(
  reg: FormPedigreeRegistrationRow
): boolean {
  return (
    reg.association_name.trim().length > 0 ||
    reg.country.trim().length > 0 ||
    reg.registration_number.trim().length > 0
  );
}

/** Exactly one primary when any registration has content; first row primary if none set. */
export function ensureSinglePrimaryRegistration(
  regs: FormPedigreeRegistrationRow[],
  preferredTempId?: string
): FormPedigreeRegistrationRow[] {
  const withContent = regs.filter(registrationRowHasContent);
  if (withContent.length === 0) {
    return regs.map((r) => ({ ...r, is_primary: false }));
  }

  let primaryId: string | undefined;
  if (
    preferredTempId &&
    regs.some((r) => r.tempId.trim() === preferredTempId.trim())
  ) {
    primaryId = preferredTempId.trim();
  } else {
    const existing = regs.find(
      (r) => r.is_primary && registrationRowHasContent(r)
    );
    primaryId = existing?.tempId ?? withContent[0]?.tempId;
  }

  return regs.map((r) => ({
    ...r,
    is_primary: r.tempId === primaryId,
  }));
}

// --- gen1-parents.ts ---

export type PedigreeParentNames = {
  sire?: string;
  dam?: string;
};

function embedPedigreeRow(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }
  return value as Record<string, unknown>;
}

function parsePedigreeBirthYear(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function formatPedigreeMetaLines(pedigree: Record<string, unknown>): string[] {
  const height = trimToUndefined(pedigree.height);
  const birthYear = parsePedigreeBirthYear(pedigree.birth_year);

  const birthParts: string[] = ["B"];
  if (height) birthParts.push(height);
  if (birthYear != null) birthParts.push(String(birthYear));
  const birthLine = birthParts.length > 1 ? birthParts.join(" ") : undefined;

  return birthLine ? [birthLine] : [];
}

function pedigreeKindFromType(type: string): "male" | "female" {
  return type === "dam" ? "female" : "male";
}

export type ParsedStallionPedigreeRecord = {
  id: string;
  pedigreeId: string;
  generation: number;
  progenyId?: string;
  type: PedigreeType;
  name: string;
  displayName: string;
  primaryRegistration?: string;
  additionalRegistrations: PedigreeRegistrationDisplay[];
  metaLines: string[];
  birthYear?: number;
  height?: string;
};

function mapStallionPedigreeRecord(
  row: Record<string, unknown>
): ParsedStallionPedigreeRecord | null {
  const pedigree = embedPedigreeRow(row.pedigrees);
  if (!pedigree) return null;

  const name = trimToUndefined(pedigree.name);
  if (!name) return null;

  const generation =
    typeof row.generation === "number" && Number.isFinite(row.generation)
      ? Math.trunc(row.generation)
      : undefined;
  if (generation == null || generation < 1) return null;

  const pedigreeId =
    typeof row.pedigree_id === "string" ? row.pedigree_id.trim() : "";
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!pedigreeId || !id) return null;

  const type =
    typeof pedigree.type === "string" ? pedigree.type.trim().toLowerCase() : "";
  if (type !== "sire" && type !== "dam") return null;

  const progenyId =
    typeof row.progeny_id === "string" ? row.progeny_id.trim() : undefined;

  const registrations = parsePedigreeRegistrations(pedigree);
  const { primaryRegistration, additionalRegistrations, displayName } =
    splitRegistrationDisplay(name, registrations, pedigree);

  const birthYear = parsePedigreeBirthYear(pedigree.birth_year);
  const height = trimToUndefined(pedigree.height);

  return {
    id,
    pedigreeId,
    generation,
    progenyId: progenyId || undefined,
    type,
    name,
    displayName,
    primaryRegistration,
    additionalRegistrations,
    metaLines: formatPedigreeMetaLines(pedigree),
    birthYear,
    height,
  };
}

export function parseStallionPedigreeRows(
  rows: Record<string, unknown>[]
): ParsedStallionPedigreeRecord[] {
  return rows
    .map((row) => mapStallionPedigreeRecord(row))
    .filter((record): record is ParsedStallionPedigreeRecord => record != null);
}

function splitRegistrationDisplay(
  horseName: string,
  registrations: PedigreeRegistrationDisplay[],
  pedigree: Record<string, unknown>
): {
  primaryRegistration?: string;
  additionalRegistrations: PedigreeRegistrationDisplay[];
  displayName: string;
} {
  const withContent = registrations.filter(
    (r) =>
      r.association_name?.trim() ||
      r.country?.trim() ||
      r.registration_number?.trim()
  );

  if (withContent.length === 0) {
    const displayName = formatPedigreeAncestorDisplay(
      horseName,
      trimToUndefined(pedigree.association_name),
      trimToUndefined(pedigree.registration_number)
    );
    return { additionalRegistrations: [], displayName };
  }

  const primary = withContent.find((r) => r.is_primary) ?? withContent[0];
  const primaryRegistration = primary
    ? formatPedigreeRegistrySegmentFromRegistration(primary)
    : undefined;
  const additionalRegistrations = withContent.filter((r) => r !== primary);

  const displayName = formatPedigreeAncestorDisplay(
    horseName,
    primary?.association_name,
    primary?.registration_number,
    primary?.country
  );

  return { primaryRegistration, additionalRegistrations, displayName };
}

function parsePedigreeRegistrations(
  pedigree: Record<string, unknown>
): PedigreeRegistrationDisplay[] {
  const raw = pedigree.pedigree_registrations;
  if (!Array.isArray(raw)) {
    const assoc = trimToUndefined(pedigree.association_name);
    const reg = trimToUndefined(pedigree.registration_number);
    if (!assoc && !reg) return [];
    return [{ association_name: assoc, registration_number: reg }];
  }

  const out: PedigreeRegistrationDisplay[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const association_name = trimToUndefined(o.association_name);
    const country = trimToUndefined(o.country);
    const registration_number = trimToUndefined(o.registration_number);
    if (!association_name && !country && !registration_number) continue;
    out.push({
      association_name,
      country,
      registration_number,
      is_primary: Boolean(o.is_primary),
    });
  }

  if (out.length === 0) {
    const assoc = trimToUndefined(pedigree.association_name);
    const reg = trimToUndefined(pedigree.registration_number);
    if (assoc || reg) return [{ association_name: assoc, registration_number: reg }];
  }

  return out;
}

function mapPedigreeRegistrationsToFormRows(
  pedigree: Record<string, unknown> | null
): FormPedigreeRegistrationRow[] {
  const raw = pedigree?.pedigree_registrations;
  if (!Array.isArray(raw)) return [];

  const out: FormPedigreeRegistrationRow[] = [];
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const association_name = trimToUndefined(row.association_name) ?? "";
    const country = trimToUndefined(row.country)?.toUpperCase() ?? "";
    const registration_number = trimToUndefined(row.registration_number) ?? "";
    const id = trimToUndefined(row.id);
    if (!association_name && !country && !registration_number) continue;
    out.push({
      tempId: id ?? `preg-${index}`,
      id,
      association_name,
      country,
      registration_number,
      is_primary: Boolean(row.is_primary),
    });
  }
  return out;
}

export function mapStallionPedigreeRowsToFormRows(
  rows: Record<string, unknown>[]
): FormPedigreeRow[] {
  const parsed = parseStallionPedigreeRows(rows);
  const byId = new Map(parsed.map((record) => [record.id, record]));

  return rows
    .map((row) => {
      const record = mapStallionPedigreeRecord(row);
      if (!record) return null;

      const pedigree = embedPedigreeRow(row.pedigrees);
      const progeny_ref =
        record.progenyId && byId.has(record.progenyId) ? record.progenyId : "";

  return {
        tempId: record.id,
        id: record.id,
        pedigree_id: record.pedigreeId,
        progeny_id: record.progenyId ?? "",
        name: record.name,
        type: record.type,
        generation: record.generation,
        progeny_ref,
        birth_year: record.birthYear != null ? String(record.birthYear) : "",
        height: record.height ?? "",
        registrations: mapPedigreeRegistrationsToFormRows(pedigree),
        needs_review: Boolean(row.needs_review),
        admin_notes:
          typeof row.admin_notes === "string" ? row.admin_notes : "",
      } satisfies FormPedigreeRow;
    })
    .filter((row): row is FormPedigreeRow => row != null);
}

export function mapGenerationOnePedigreeParents(
  rows: Record<string, unknown>[]
): PedigreeParentNames {
  const out: PedigreeParentNames = {};

  for (const row of rows) {
    const record = mapStallionPedigreeRecord(row);
    if (!record || record.generation !== 1) continue;

    if (record.type === "sire" && !out.sire) out.sire = record.displayName;
    if (record.type === "dam" && !out.dam) out.dam = record.displayName;
  }

  return out;
}




