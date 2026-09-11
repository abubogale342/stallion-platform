import type {
  CmsBlock,
  CmsContentLocale,
  LocalizedString,
} from "@/types/cms";

export function ls(en: string, ptBR: string): LocalizedString {
  return { en, "pt-BR": ptBR };
}

export function emptyLocalized(): LocalizedString {
  return { en: "", "pt-BR": "" };
}

export function formatPipeTags(tags: LocalizedString[]): {
  en: string;
  "pt-BR": string;
} {
  return {
    en: tags.map((t) => t.en).join(" | "),
    "pt-BR": tags.map((t) => t["pt-BR"]).join(" | "),
  };
}

export function parsePipeTags(enStr: string, ptStr: string): LocalizedString[] {
  const enParts = enStr.split("|").map((s) => s.trim());
  const ptParts = ptStr.split("|").map((s) => s.trim());
  const len = Math.max(enParts.length, ptParts.length);
  const result: LocalizedString[] = [];
  for (let i = 0; i < len; i++) {
    const en = enParts[i] ?? "";
    const pt = ptParts[i] ?? "";
    if (en || pt) {
      result.push({ en, "pt-BR": pt });
    }
  }
  return result;
}

export function isLocalizedString(value: unknown): value is LocalizedString {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.en === "string" && typeof row["pt-BR"] === "string";
}

export function isLocalizedField(value: unknown): value is LocalizedString | string {
  return typeof value === "string" || isLocalizedString(value);
}

export function normalizeLocalizedString(
  value: LocalizedString | string | undefined | null
): LocalizedString {
  if (value == null) return emptyLocalized();
  if (typeof value === "string") return { en: value, "pt-BR": "" };
  return {
    en: value.en ?? "",
    "pt-BR": value["pt-BR"] ?? "",
  };
}

export function resolveLocalized(
  value: LocalizedString | string | undefined | null,
  locale: CmsContentLocale
): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  const primary = value[locale]?.trim();
  if (primary) return primary;
  return value.en?.trim() ?? "";
}

export function normalizeLocalizedTitle(
  value: LocalizedString | string | null | undefined
): LocalizedString {
  return normalizeLocalizedString(value ?? "");
}

function normalizeLinkLabel(
  link: { label: LocalizedString | string; href: string }
): { label: LocalizedString; href: string } {
  return {
    label: normalizeLocalizedString(link.label),
    href: link.href,
  };
}

export function normalizeBlock(block: CmsBlock): CmsBlock {
  switch (block.type) {
    case "heading":
      return { ...block, text: normalizeLocalizedString(block.text) };
    case "text":
      return { ...block, text: normalizeLocalizedString(block.text) };
    case "button":
      return { ...block, label: normalizeLocalizedString(block.label) };
    case "buttons":
      return {
        ...block,
        items: block.items.map((item) => ({
          ...item,
          label: normalizeLocalizedString(item.label),
        })),
      };
    case "image":
      return {
        ...block,
        alt: block.alt != null ? normalizeLocalizedString(block.alt) : undefined,
        caption:
          block.caption != null
            ? normalizeLocalizedString(block.caption)
            : undefined,
      };
    case "video":
      return {
        ...block,
        caption:
          block.caption != null
            ? normalizeLocalizedString(block.caption)
            : undefined,
      };
    case "landing_hero":
      return {
        ...block,
        overline: normalizeLocalizedString(block.overline),
        titleBeforeAccent: normalizeLocalizedString(block.titleBeforeAccent),
        titleAccent: normalizeLocalizedString(block.titleAccent),
        subtitle: normalizeLocalizedString(block.subtitle),
        description: normalizeLocalizedString(block.description),
        tags: block.tags.map((tag) => normalizeLocalizedString(tag)),
        cta: normalizeLinkLabel(block.cta),
        referenceLeftTitle: normalizeLocalizedString(block.referenceLeftTitle),
        referenceLeftText: normalizeLocalizedString(block.referenceLeftText),
        referenceRightTitle: normalizeLocalizedString(block.referenceRightTitle),
        referenceRightText: normalizeLocalizedString(block.referenceRightText),
        industryTitle: normalizeLocalizedString(block.industryTitle),
        industryText: normalizeLocalizedString(block.industryText),
        regions: block.regions.map((region) => normalizeLocalizedString(region)),
        stats: block.stats.map((stat) => ({
          value: normalizeLocalizedString(stat.value),
          label: normalizeLocalizedString(stat.label),
        })),
        learnMore: normalizeLinkLabel(block.learnMore),
        readyTitle: normalizeLocalizedString(block.readyTitle),
        readySubtitle: normalizeLocalizedString(block.readySubtitle),
        readyCta: normalizeLinkLabel(block.readyCta),
      };
    case "grid":
      return {
        ...block,
        cells: block.cells.map((cell) => cell.map((b) => normalizeBlock(b))),
      };
    default:
      return block;
  }
}

export function normalizeBlocks(blocks: CmsBlock[]): CmsBlock[] {
  return blocks.map((block) => normalizeBlock(block));
}

function collectLocalizedStrings(block: CmsBlock, out: LocalizedString[]): void {
  switch (block.type) {
    case "heading":
      out.push(normalizeLocalizedString(block.text));
      break;
    case "text":
      out.push(normalizeLocalizedString(block.text));
      break;
    case "button":
      out.push(normalizeLocalizedString(block.label));
      break;
    case "buttons":
      for (const item of block.items) {
        out.push(normalizeLocalizedString(item.label));
      }
      break;
    case "image":
      if (block.alt != null) out.push(normalizeLocalizedString(block.alt));
      if (block.caption != null) out.push(normalizeLocalizedString(block.caption));
      break;
    case "video":
      if (block.caption != null) out.push(normalizeLocalizedString(block.caption));
      break;
    case "landing_hero":
      out.push(
        normalizeLocalizedString(block.overline),
        normalizeLocalizedString(block.titleBeforeAccent),
        normalizeLocalizedString(block.titleAccent),
        normalizeLocalizedString(block.subtitle),
        normalizeLocalizedString(block.description),
        normalizeLocalizedString(block.referenceLeftTitle),
        normalizeLocalizedString(block.referenceLeftText),
        normalizeLocalizedString(block.referenceRightTitle),
        normalizeLocalizedString(block.referenceRightText),
        normalizeLocalizedString(block.industryTitle),
        normalizeLocalizedString(block.industryText),
        normalizeLocalizedString(block.readyTitle),
        normalizeLocalizedString(block.readySubtitle)
      );
      for (const tag of block.tags) out.push(normalizeLocalizedString(tag));
      out.push(normalizeLocalizedString(block.cta.label));
      for (const region of block.regions) out.push(normalizeLocalizedString(region));
      for (const stat of block.stats) {
        out.push(normalizeLocalizedString(stat.value));
        out.push(normalizeLocalizedString(stat.label));
      }
      out.push(
        normalizeLocalizedString(block.learnMore.label),
        normalizeLocalizedString(block.readyCta.label)
      );
      break;
    case "grid":
      for (const cell of block.cells) {
        for (const nested of cell) {
          collectLocalizedStrings(nested, out);
        }
      }
      break;
  }
}

/** True when every localized field in blocks has non-empty pt-BR text. */
export function isPtBrTranslationComplete(blocks: CmsBlock[]): boolean {
  const strings: LocalizedString[] = [];
  for (const block of blocks) {
    collectLocalizedStrings(block, strings);
  }
  return strings.every((s) => s["pt-BR"].trim().length > 0);
}
