/**
 * Horse (ancestor) search conditions shared by the stallion and mare
 * directories.
 *
 * A breeder searches for named ancestors, each pinned to its own generation(s)
 * and side(s) — "Colonels Smoking Gun at generation 2 AND Whiz Resolution at
 * generation 3" — so the URL carries a repeated `bloodline` param, one entry
 * per condition, rather than one global generation/line pair.
 *
 * The param name stays `bloodline` even though the UI now says "Horse": links
 * are shared and bookmarked, and renaming the key would break every one of
 * them for a cosmetic gain.
 */

/** Which half of the tree an ancestor descends through. */
export type HorseSide = "sire" | "dam";

/**
 * Whether a condition adds horses to the results or removes them.
 *
 * Exclude is scoped by the same generation and side criteria as include: an
 * excluded horse at generation 2 removes only horses carrying it at generation
 * 2, not every horse carrying it anywhere.
 */
export type HorseMatchMode = "include" | "exclude";

export type BloodlineCondition = {
  /** Ancestor name; matched case-insensitively as a partial name. */
  name: string;
  /** Exact generations to accept. Empty means any generation. */
  generations: number[];
  /**
   * Sides the ancestor must occur on.
   *
   *   []             — no restriction, either side
   *   ["sire"]       — sire side only
   *   ["dam"]        — dam side only
   *   ["sire","dam"] — linebreeding: must occur on *both* sides
   *
   * Each side is judged against the same generation filter, matching how the
   * single-select Line control already composed with generations.
   */
  sides: HorseSide[];
  match: HorseMatchMode;
};

/** Repeated URL param carrying one condition each. */
export const BLOODLINE_PARAM = "bloodline";

/** Exact pedigree depths offered in the UI. DB generation 1 = sire/dam. */
export const BLOODLINE_GENERATIONS = [1, 2, 3, 4, 5] as const;

/**
 * Each condition costs one ancestor RPC round trip, so a hand-edited URL
 * cannot ask for an unbounded number of them.
 */
export const MAX_BLOODLINE_CONDITIONS = 6;

const SIDE_VALUES: HorseSide[] = ["sire", "dam"];
const MATCH_VALUES: HorseMatchMode[] = ["include", "exclude"];

/** Line values from the pre-2026-09-10 single-select control. */
const LEGACY_LINE_VALUES = ["any", "sire", "dam"];

/** Legacy depth labels from the pre-2026-09 "within N generations" filter. */
const LEGACY_GENERATION_MAX: Record<string, number> = {
  "Within 2 generations": 2,
  "Within 3 generations": 3,
  "Within 5 generations": 5,
};

export function emptyBloodlineCondition(): BloodlineCondition {
  return { name: "", generations: [], sides: [], match: "include" };
}

function normalizeGenerations(values: number[]): number[] {
  const allowed = new Set<number>(BLOODLINE_GENERATIONS);
  return [...new Set(values)].filter((g) => allowed.has(g)).sort((a, b) => a - b);
}

/** Deduplicated and ordered sire-then-dam so serialization is stable. */
function normalizeSides(values: HorseSide[]): HorseSide[] {
  return SIDE_VALUES.filter((side) => values.includes(side));
}

/**
 * "Colonels Smoking Gun|2,3|sire,dam|exclude". The name is whatever precedes
 * the last three fields, so a name containing "|" still round-trips.
 */
export function serializeBloodlineCondition(condition: BloodlineCondition): string {
  const generations = normalizeGenerations(condition.generations).join(",");
  const sides = normalizeSides(condition.sides).join(",");
  return `${condition.name.trim()}|${generations}|${sides}|${condition.match}`;
}

function parseGenerationList(raw: string): number[] {
  return normalizeGenerations(
    raw
      .split(",")
      .map((g) => Number.parseInt(g.trim(), 10))
      .filter((g) => Number.isFinite(g))
  );
}

export function parseBloodlineCondition(raw: string): BloodlineCondition | null {
  const value = raw.trim();
  if (!value) return null;

  const parts = value.split("|");
  const last = parts[parts.length - 1];

  // Current form: name|generations|sides|match
  if (parts.length >= 4 && MATCH_VALUES.includes(last as HorseMatchMode)) {
    const name = parts.slice(0, -3).join("|").trim();
    if (!name) return null;
    return {
      name,
      generations: parseGenerationList(parts[parts.length - 3]),
      sides: normalizeSides(
        parts[parts.length - 2]
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is HorseSide => SIDE_VALUES.includes(s as HorseSide))
      ),
      match: last as HorseMatchMode,
    };
  }

  // Superseded form: name|generations|line, where line was any|sire|dam.
  // Links in this shape are still in circulation, so they keep resolving to
  // what they always meant — a single side, or no restriction.
  if (parts.length >= 3 && LEGACY_LINE_VALUES.includes(last)) {
    const name = parts.slice(0, -2).join("|").trim();
    if (!name) return null;
    return {
      name,
      generations: parseGenerationList(parts[parts.length - 2]),
      sides: last === "sire" ? ["sire"] : last === "dam" ? ["dam"] : [],
      match: "include",
    };
  }

  // Bare name.
  return { name: value, generations: [], sides: [], match: "include" };
}

export function serializeBloodlineConditions(
  conditions: BloodlineCondition[]
): string[] {
  return conditions
    .filter((c) => c.name.trim())
    .slice(0, MAX_BLOODLINE_CONDITIONS)
    .map(serializeBloodlineCondition);
}

export function parseBloodlineConditions(values: string[]): BloodlineCondition[] {
  return values
    .map(parseBloodlineCondition)
    .filter((c): c is BloodlineCondition => c !== null)
    .slice(0, MAX_BLOODLINE_CONDITIONS);
}

/**
 * Pre-2026-09 links paired the keyword with a global depth and line
 * ("?q=Smart+Chic&generation=Within+3+generations"). Those still resolve: the
 * keyword becomes the ancestor name and the depth expands to the exact
 * generations it used to cover.
 */
export function legacyBloodlineCondition(
  keyword: string,
  generation: string,
  generationLine: string
): BloodlineCondition | null {
  const name = keyword.trim();
  if (!name) return null;

  const depths = generation
    .split(",")
    .map((label) => LEGACY_GENERATION_MAX[label.trim()] ?? 0);
  const maxDepth = depths.length ? Math.max(...depths) : 0;
  if (maxDepth <= 0) return null;

  const lines = generationLine
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasSire = lines.includes("Sire line");
  const hasDam = lines.includes("Dam line");

  // In the old filter, ticking both lines widened the search to either side.
  // It does *not* map to today's ["sire","dam"], which narrows to horses
  // carrying the ancestor on both — that would silently change what these
  // links return.
  const sides: HorseSide[] =
    hasSire && !hasDam ? ["sire"] : hasDam && !hasSire ? ["dam"] : [];

  return {
    name,
    generations: normalizeGenerations(
      Array.from({ length: maxDepth }, (_, i) => i + 1)
    ),
    sides,
    match: "include",
  };
}

type ReadableSearchParams = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

/** Client-side (URLSearchParams) read, legacy params included. */
export function parseBloodlinesFromSearchParams(
  searchParams: ReadableSearchParams
): BloodlineCondition[] {
  const conditions = parseBloodlineConditions(
    searchParams.getAll(BLOODLINE_PARAM)
  );
  if (conditions.length) return conditions;

  const legacy = legacyBloodlineCondition(
    searchParams.get("q") ?? "",
    searchParams.get("generation") ?? "",
    searchParams.get("generationLine") ?? ""
  );
  return legacy ? [legacy] : [];
}

/** Server-side read: Next hands repeated params through as string[]. */
export function parseBloodlinesFromPageSearchParams(searchParams?: {
  q?: string;
  bloodline?: string | string[];
  generation?: string;
  generationLine?: string;
}): BloodlineCondition[] {
  const raw = searchParams?.bloodline;
  const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  const conditions = parseBloodlineConditions(values);
  if (conditions.length) return conditions;

  const legacy = legacyBloodlineCondition(
    searchParams?.q ?? "",
    searchParams?.generation ?? "",
    searchParams?.generationLine ?? ""
  );
  return legacy ? [legacy] : [];
}

/**
 * True when a legacy link supplied the ancestor name through `q`. The keyword
 * then belongs to the pedigree search, not to the horse's own name, so the
 * caller drops it from the name filter to keep those links returning what they
 * always did.
 */
export function usesLegacyKeywordAsAncestor(searchParams?: {
  q?: string;
  bloodline?: string | string[];
  generation?: string;
  generationLine?: string;
}): boolean {
  const raw = searchParams?.bloodline;
  const hasBloodline = Array.isArray(raw) ? raw.length > 0 : Boolean(raw);
  if (hasBloodline) return false;
  return (
    legacyBloodlineCondition(
      searchParams?.q ?? "",
      searchParams?.generation ?? "",
      searchParams?.generationLine ?? ""
    ) !== null
  );
}

/**
 * A condition that names no horse filters nothing; the server skips it. Used
 * by the UI to decide whether the search is meaningfully populated.
 */
export function hasSearchableCondition(
  conditions: BloodlineCondition[]
): boolean {
  return conditions.some((condition) => condition.name.trim() !== "");
}
