import type { FormPedigreeRow } from "@/types/stallion-form";
import type { PedigreeRecordOption } from "@/types/pedigree";
import { PEDIGREE_TYPE_LABELS } from "@/utils/common";
import {
  createEmptyPedigreeRegistration,
  formatPedigreeRegistrationLabel,
  newPedigreeRegistrationTempId,
} from "@/utils/pedigree";

export function newPedigreeRowTempId(): string {
  return `row-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyPedigreeRow(spec: {
  generation: number;
  type: "sire" | "dam";
  progeny_ref: string;
}): FormPedigreeRow {
  return {
    tempId: newPedigreeRowTempId(),
    id: "",
    pedigree_id: "",
    progeny_id: "",
    name: "",
    type: spec.type,
    generation: spec.generation,
    progeny_ref: spec.generation === 1 ? "" : spec.progeny_ref,
    birth_year: "",
    height: "",
    registrations: [],
    needs_review: false,
    admin_notes: "",
  };
}

export function findGen1ParentRowIndex(
  rows: FormPedigreeRow[],
  line: "sire" | "dam"
): number {
  return rows.findIndex((row) => row.generation === 1 && row.type === line);
}

export function findPedigreeRowIndex(
  rows: FormPedigreeRow[],
  spec: { generation: number; type: "sire" | "dam"; progeny_ref: string }
): number {
  return rows.findIndex(
    (row) =>
      row.generation === spec.generation &&
      row.type === spec.type &&
      row.progeny_ref === spec.progeny_ref
  );
}

export function getProgenySlotsForGeneration(
  generation: number,
  rows: FormPedigreeRow[]
): { ref: string; label: string }[] {
  if (generation < 2) return [];
  return rows
    .filter((row) => row.generation === generation - 1 && row.pedigree_id.trim())
    .map((row) => ({
      ref: row.tempId,
      label: row.name.trim() || PEDIGREE_TYPE_LABELS[row.type],
    }));
}

export function getPrimaryRegistrationDisplay(
  row: Pick<FormPedigreeRow, "registrations">
): string {
  const withContent = row.registrations.filter(
    (r) =>
      r.association_name.trim() ||
      r.country.trim() ||
      r.registration_number.trim()
  );
  if (withContent.length === 0) return "";
  const primary =
    withContent.find((r) => r.is_primary) ?? withContent[0];
  const label = formatPedigreeRegistrationLabel(primary);
  return label.replace(/^\(|\)$/g, "").trim();
}

export function mapPedigreeRecordToFormRow(
  record: PedigreeRecordOption,
  spec: {
    generation: number;
    type: "sire" | "dam";
    progeny_ref: string;
    tempId?: string;
  }
): FormPedigreeRow {
  return {
    tempId: spec.tempId ?? newPedigreeRowTempId(),
    id: "",
    pedigree_id: record.id,
    progeny_id: "",
    name: record.name,
    type: spec.type,
    generation: spec.generation,
    progeny_ref: spec.generation === 1 ? "" : spec.progeny_ref,
    birth_year:
      record.birth_year != null ? String(record.birth_year) : "",
    height: record.height?.trim() ?? "",
    registrations: (record.registrations ?? []).map((reg) => ({
      tempId: newPedigreeRegistrationTempId(),
      id: reg.id,
      association_name: reg.association_name ?? "",
      country: reg.country?.trim() ?? "",
      registration_number: reg.registration_number?.trim() ?? "",
      is_primary: Boolean(reg.is_primary),
    })),
    needs_review: false,
    admin_notes: "",
  };
}

/** Remove a row and all descendants linked via progeny_ref chain. */
export function removePedigreeRowCascade(
  rows: FormPedigreeRow[],
  tempId: string
): FormPedigreeRow[] {
  const toRemove = new Set<string>();

  function collect(id: string) {
    if (toRemove.has(id)) return;
    toRemove.add(id);
    for (const row of rows) {
      if (row.progeny_ref === id) {
        collect(row.tempId);
      }
    }
  }

  collect(tempId);
  return rows.filter((row) => !toRemove.has(row.tempId));
}

export function mapRegistrationsFromDb(
  registrations: PedigreeRecordOption["registrations"]
): FormPedigreeRow["registrations"] {
  if (!registrations?.length) return [];
  return registrations.map((reg) => ({
    tempId: newPedigreeRegistrationTempId(),
    id: reg.id,
    association_name: reg.association_name ?? "",
    country: reg.country?.trim() ?? "",
    registration_number: reg.registration_number?.trim() ?? "",
    is_primary: Boolean(reg.is_primary),
  }));
}

export function createDefaultRegistration(): FormPedigreeRow["registrations"][number] {
  return createEmptyPedigreeRegistration({ is_primary: true });
}
