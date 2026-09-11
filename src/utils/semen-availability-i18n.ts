import type { SemenAvailability } from "@/types/stallion";
import type { SemenAvailabilityOptionType } from "@/utils/common";

export const SEMEN_AVAILABILITY_MESSAGE_KEYS: Record<SemenAvailability, string> = {
  "Method not disclosed": "methodNotDisclosed",
  Fresh: "fresh",
  Chilled: "chilled",
  Cooled: "cooled",
  Frozen: "frozen",
  ICSI: "icsi",
  Combination: "combination",
  "Live Cover": "liveCover",
};

const BILINGUAL_LABELS: Record<
  SemenAvailabilityOptionType | "Combination",
  { en: string; ptBR: string }
> = {
  "Method not disclosed": {
    en: "Method not disclosed",
    ptBR: "Método não divulgado",
  },
  Fresh: { en: "Fresh", ptBR: "Fresco" },
  Chilled: { en: "Chilled", ptBR: "Refrigerado" },
  Cooled: { en: "Cooled", ptBR: "Resfriado" },
  Frozen: { en: "Frozen", ptBR: "Congelado" },
  ICSI: { en: "ICSI", ptBR: "ICSI" },
  Combination: {
    en: "Combination (chilled + frozen)",
    ptBR: "Combinação (refrigerado + congelado)",
  },
  "Live Cover": { en: "Live cover", ptBR: "Monta natural" },
};

export function getSemenAvailabilityLabels(method: string): {
  en: string;
  ptBR: string;
} {
  const labels = BILINGUAL_LABELS[method as keyof typeof BILINGUAL_LABELS];
  return labels ?? { en: method, ptBR: method };
}

export function formatSemenMethodBilingualLabel(
  method: string,
  dbPtLabel?: string | null
): string {
  const { en, ptBR } = getSemenAvailabilityLabels(method);
  const pt = dbPtLabel?.trim() || ptBR;
  return `${en} · ${pt}`;
}

export function formatSemenMethodLabel(
  method: string,
  locale: string,
  dbLabels?: Record<string, string> | null
): string {
  const dbLabel = dbLabels?.[method]?.trim();
  if (locale === "pt-BR" && dbLabel) return dbLabel;
  const { en, ptBR } = getSemenAvailabilityLabels(method);
  return locale === "pt-BR" ? ptBR : en;
}

export function normalizeBreedingMethodLabels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

export function breedingMethodLabelsHaveContent(
  labels: Record<string, string> | null | undefined
): boolean {
  if (!labels) return false;
  return Object.values(labels).some((value) => value.trim().length > 0);
}

export function semenAvailabilityMessageKey(method: string): string | undefined {
  return SEMEN_AVAILABILITY_MESSAGE_KEYS[method as SemenAvailability];
}
