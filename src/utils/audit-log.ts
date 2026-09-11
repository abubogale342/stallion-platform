import { pedigreeGenerationLabel } from "@/utils/pedigree";

type AuditChange = {
  field?: string;
  previous?: unknown;
  next?: unknown;
};

const TABLE_LABELS: Record<string, string> = {
  stallions: "Horse",
  stallion_pedigrees: "Pedigree",
  pedigrees: "Ancestor",
  pedigree_registrations: "Registration",
  owners: "Owner",
  stallion_owners: "Owner",
  stallion_images: "Photo",
  stallion_performance_records: "Performance",
  stallion_progeny: "Progeny",
  stallion_foal_crops: "Foal crop",
  stallion_disciplines: "Discipline",
  stallion_breeding_service_providers: "Breeding provider",
  stallion_genetic_tests: "Genetic test",
  stallion_colour_tests: "Colour test",
  stallion_racing_results: "Racing result",
  stallion_racing_summary: "Racing summary",
  stallion_profile_translations: "Translation",
  mare_et_details: "ET program",
};

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  deleted: "Removed",
  image_uploaded: "Uploaded",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function changePayload(changes: unknown, action: string): Record<string, unknown> | null {
  if (!Array.isArray(changes) || changes.length === 0) return null;
  const first = changes[0] as AuditChange;
  if (first?.field !== "*") return null;
  if (action === "deleted" || action === "edited") {
    return asRecord(first.previous) ?? asRecord(first.next);
  }
  return asRecord(first.next) ?? asRecord(first.previous);
}

function quoted(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? ` “${trimmed}”` : "";
}

export function auditTableLabel(tableName: string): string {
  return TABLE_LABELS[tableName] ?? tableName.replaceAll("_", " ");
}

export function formatAuditAction(row: {
  action: string;
  table_name: string;
  summary?: string | null;
  changes?: unknown;
}): { headline: string; detail: string | null } {
  const summary = row.summary?.trim();
  if (summary) {
    return { headline: summary, detail: null };
  }

  const verb = ACTION_LABELS[row.action] ?? row.action;
  const payload = changePayload(row.changes, row.action);

  if (row.table_name === "stallion_pedigrees") {
    const generation =
      typeof payload?.generation === "number"
        ? payload.generation
        : typeof payload?.generation === "string"
          ? Number.parseInt(payload.generation, 10)
          : NaN;
    const genLabel = Number.isFinite(generation)
      ? pedigreeGenerationLabel(generation)
      : "pedigree";
    const verbWord =
      row.action === "deleted"
        ? "removed"
        : row.action === "edited"
          ? "updated"
          : "added";
    return {
      headline: `${verb}: ${verbWord} ${genLabel} pedigree`,
      detail: null,
    };
  }

  if (row.table_name === "pedigrees") {
    return {
      headline: `${verb}: ancestor${quoted(payload?.name)}`,
      detail: null,
    };
  }

  if (row.table_name === "stallions") {
    if (row.action === "created") {
      return {
        headline: `Created horse${quoted(payload?.stallion_name)}`,
        detail: null,
      };
    }
    const fields = Array.isArray(row.changes)
      ? (row.changes as AuditChange[])
          .map((item) => item.field)
          .filter((field): field is string => Boolean(field && field !== "*"))
          .map((field) => field.replaceAll("_", " "))
          .slice(0, 4)
      : [];
    return {
      headline: fields.length > 0 ? `${verb}: ${fields.join(", ")}` : verb,
      detail: null,
    };
  }

  return {
    headline: verb,
    detail: auditTableLabel(row.table_name),
  };
}
