import type { CmsBlock } from "@/types/cms";
import { isLocalizedField, normalizeBlocks } from "@/utils/cms-i18n";

export { CMS_SLUG_LABELS, CMS_DEFAULTS, CMS_DEFAULT_TITLES } from "@/utils/cms-defaults";

function validAlign(x: unknown): boolean {
  return x === undefined || x === "left" || x === "center" || x === "right";
}

function isHeading(x: Record<string, unknown>): boolean {
  const lv = Number(x.level);
  return (
    x.type === "heading" &&
    isLocalizedField(x.text) &&
    [1, 2, 3, 4, 5, 6].includes(lv) &&
    validAlign(x.align) &&
    (x.pricingCard === undefined || typeof x.pricingCard === "boolean")
  );
}

function isText(x: Record<string, unknown>): boolean {
  return x.type === "text" && isLocalizedField(x.text) && validAlign(x.align);
}

function isButton(x: Record<string, unknown>): boolean {
  return (
    x.type === "button" &&
    isLocalizedField(x.label) &&
    typeof x.href === "string" &&
    (x.variant === undefined || x.variant === "primary" || x.variant === "secondary") &&
    validAlign(x.align)
  );
}

function isButtons(x: Record<string, unknown>): boolean {
  if (x.type !== "buttons" || !Array.isArray(x.items) || !validAlign(x.align)) {
    return false;
  }
  return x.items.every(
    (it: unknown) =>
      it &&
      typeof it === "object" &&
      isLocalizedField((it as Record<string, unknown>).label) &&
      typeof (it as Record<string, unknown>).href === "string" &&
      ((it as Record<string, unknown>).variant === undefined ||
        (it as Record<string, unknown>).variant === "primary" ||
        (it as Record<string, unknown>).variant === "secondary")
  );
}

function isImage(x: Record<string, unknown>): boolean {
  return (
    x.type === "image" &&
    typeof x.src === "string" &&
    validAlign(x.align) &&
    (x.alt === undefined || isLocalizedField(x.alt)) &&
    (x.caption === undefined || isLocalizedField(x.caption))
  );
}

function isVideo(x: Record<string, unknown>): boolean {
  return (
    x.type === "video" &&
    typeof x.url === "string" &&
    validAlign(x.align) &&
    (x.caption === undefined || isLocalizedField(x.caption))
  );
}

function isLocalizedLink(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const link = raw as Record<string, unknown>;
  return isLocalizedField(link.label) && typeof link.href === "string";
}

function isLandingHero(x: Record<string, unknown>): boolean {
  if (x.type !== "landing_hero") return false;
  if (!isLocalizedField(x.overline)) return false;
  if (!isLocalizedField(x.titleBeforeAccent)) return false;
  if (!isLocalizedField(x.titleAccent)) return false;
  if (!isLocalizedField(x.subtitle)) return false;
  if (!isLocalizedField(x.description)) return false;
  if (x.imageSrc !== undefined && typeof x.imageSrc !== "string") return false;
  if (
    !Array.isArray(x.tags) ||
    !x.tags.every((t) => isLocalizedField(t))
  ) {
    return false;
  }
  if (!isLocalizedField(x.referenceLeftTitle)) return false;
  if (!isLocalizedField(x.referenceLeftText)) return false;
  if (!isLocalizedField(x.referenceRightTitle)) return false;
  if (!isLocalizedField(x.referenceRightText)) return false;
  if (!isLocalizedField(x.industryTitle)) return false;
  if (!isLocalizedField(x.industryText)) return false;
  if (
    !Array.isArray(x.regions) ||
    !x.regions.every((r) => isLocalizedField(r))
  ) {
    return false;
  }
  if (!Array.isArray(x.stats)) return false;
  if (
    !x.stats.every((s) => {
      if (!s || typeof s !== "object") return false;
      const row = s as Record<string, unknown>;
      return isLocalizedField(row.value) && isLocalizedField(row.label);
    })
  ) {
    return false;
  }
  if (!isLocalizedLink(x.learnMore)) return false;
  if (!isLocalizedField(x.readyTitle)) return false;
  if (!isLocalizedField(x.readySubtitle)) return false;
  if (!isLocalizedLink(x.readyCta)) return false;
  if (!isLocalizedLink(x.cta)) return false;
  return true;
}

function isBlock(raw: unknown): raw is CmsBlock {
  if (!raw || typeof raw !== "object") return false;
  const x = raw as Record<string, unknown>;
  switch (x.type) {
    case "heading":
      return isHeading(x);
    case "text":
      return isText(x);
    case "button":
      return isButton(x);
    case "buttons":
      return isButtons(x);
    case "image":
      return isImage(x);
    case "video":
      return isVideo(x);
    case "landing_hero":
      return isLandingHero(x);
    case "grid":
      if (
        x.type !== "grid" ||
        (x.columns !== 2 && x.columns !== 3) ||
        !Array.isArray(x.cells) ||
        !validAlign(x.align)
      ) {
        return false;
      }
      return x.cells.every(
        (cell: unknown) =>
          Array.isArray(cell) && cell.every((b: unknown) => isBlock(b))
      );
    default:
      return false;
  }
}

export function parseCmsBlocks(
  json: unknown
): { ok: true; blocks: CmsBlock[] } | { ok: false; error: string } {
  if (!Array.isArray(json)) {
    return { ok: false, error: "Root must be a JSON array." };
  }
  for (let i = 0; i < json.length; i++) {
    if (!isBlock(json[i])) {
      return { ok: false, error: `Invalid block at index ${i}.` };
    }
  }
  return { ok: true, blocks: normalizeBlocks(json as CmsBlock[]) };
}
