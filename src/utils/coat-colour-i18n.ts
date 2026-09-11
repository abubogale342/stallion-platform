/**
 * Canonical coat colour list + translations (client-approved 2026-07).
 * Stored values stay plain text — legacy/off-list values remain valid and
 * display as-is (see coatColourLabel). "TBC" translations fall back to English
 * until the client confirms them; update BILINGUAL_LABELS only, no code change.
 */

export const CANONICAL_COAT_COLOURS = [
  "Sorrel/Chestnut",
  "Liver Chestnut",
  "Bay",
  "Brown",
  "Dark Bay",
  "Grey",
  "Black",
  "Palomino",
  "Buckskin",
  "Dun",
  "Blue Roan",
  "Bay Roan",
  "Cremello",
  "Perlino",
] as const;

export type CanonicalCoatColour = (typeof CANONICAL_COAT_COLOURS)[number];

const BILINGUAL_LABELS: Record<CanonicalCoatColour, { en: string; ptBR: string }> = {
  "Sorrel/Chestnut": { en: "Sorrel/Chestnut", ptBR: "Alazão" },
  "Liver Chestnut": { en: "Liver Chestnut", ptBR: "Alazão tostado" },
  Bay: { en: "Bay", ptBR: "Baio" },
  Brown: { en: "Brown", ptBR: "Castanho escuro" },
  "Dark Bay": { en: "Dark Bay", ptBR: "Castanho escuro" },
  Grey: { en: "Grey", ptBR: "Tordilho" },
  // TBC from client — English fallback until confirmed:
  Black: { en: "Black", ptBR: "Black" },
  Palomino: { en: "Palomino", ptBR: "Palomino" },
  Buckskin: { en: "Buckskin", ptBR: "Buckskin" },
  Dun: { en: "Dun", ptBR: "Dun" },
  "Blue Roan": { en: "Blue Roan", ptBR: "Rosilho azul" },
  "Bay Roan": { en: "Bay Roan", ptBR: "Rosilho Baio" },
  // ABQM Portuguese: Cremello → Cremelo; Perlino keeps the same spelling.
  Cremello: { en: "Cremello", ptBR: "Cremelo" },
  Perlino: { en: "Perlino", ptBR: "Perlino" },
};

function squash(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const CANONICAL_BY_SQUASHED = new Map<string, CanonicalCoatColour>(
  CANONICAL_COAT_COLOURS.map((c) => [squash(c), c])
);

/**
 * Display-only aliases for common legacy spellings in existing data, so pt-BR
 * profiles translate them without rewriting the stored value. The admin
 * dropdown deliberately does NOT use these (strict matching there, so opening
 * a legacy record never silently reassigns its colour).
 */
const DISPLAY_ALIASES: Record<string, CanonicalCoatColour> = {
  gray: "Grey",
  sorrel: "Sorrel/Chestnut",
  chestnut: "Sorrel/Chestnut",
  "chestnut/sorrel": "Sorrel/Chestnut",
  "chestnut / sorrel": "Sorrel/Chestnut",
  "sorrel/chestnut": "Sorrel/Chestnut",
  cremelo: "Cremello",
};

/** Strict canonical match (trim/case/whitespace only) — used by the admin dropdown. */
export function matchCanonicalCoatColour(
  value: string | null | undefined
): CanonicalCoatColour | null {
  if (!value?.trim()) return null;
  return CANONICAL_BY_SQUASHED.get(squash(value)) ?? null;
}

/** Lenient match incl. display aliases — used for public display/labels. */
function matchForDisplay(
  value: string | null | undefined
): CanonicalCoatColour | null {
  if (!value?.trim()) return null;
  const squashed = squash(value);
  return CANONICAL_BY_SQUASHED.get(squashed) ?? DISPLAY_ALIASES[squashed] ?? null;
}

/**
 * Stored-value spellings that should satisfy a directory filter for a canonical
 * colour (the canonical value itself plus its legacy display aliases).
 */
export function coatColourFilterVariants(canonical: string): string[] {
  const match = matchForDisplay(canonical);
  if (!match) return [canonical];
  const variants = new Set<string>([match]);
  for (const [alias, target] of Object.entries(DISPLAY_ALIASES)) {
    if (target === match) variants.add(alias);
  }
  return [...variants];
}

/**
 * Localized label for a stored coat colour.
 * Canonical (or aliased) values → translated label for the locale;
 * anything else → per-record override when provided, else the stored text.
 */
export function coatColourLabel(
  value: string | null | undefined,
  locale: string,
  perRecordOverride?: string | null
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const canonical = matchForDisplay(trimmed);
  if (canonical) {
    const labels = BILINGUAL_LABELS[canonical];
    return locale === "pt-BR" ? labels.ptBR : labels.en;
  }
  return perRecordOverride?.trim() || trimmed;
}
