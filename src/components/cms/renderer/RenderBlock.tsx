import { Link } from "@/i18n/navigation";
import AccentLink from "@/ui/AccentLink";
import { buttonClassName } from "@/ui/Button";
import { cn } from "@/utils/common";
import { resolveLocalized } from "@/utils/cms-i18n";
import type { CmsBlock, CmsContentLocale } from "@/types/cms";
import CmsVideo from "@/components/cms/media/CmsVideo";
import BlockList from "./BlockList";
import { flexJustifyFromAlign, headingClass, HeadingTag } from "./styles";
import { renderTextBlock } from "./text-block";
import type { CmsPageVariant, TextBlockCounter } from "./types";

export default async function RenderBlock({
  block,
  variant,
  locale,
  landingTextCounter,
  prev,
  nested,
}: {
  block: CmsBlock;
  variant: CmsPageVariant;
  locale: CmsContentLocale;
  landingTextCounter: TextBlockCounter;
  prev: CmsBlock | undefined;
  nested: boolean;
}) {
  switch (block.type) {
    case "heading": {
      const text = resolveLocalized(block.text, locale);
      const cls = headingClass(block.level, variant, block.align);
      return (
        <HeadingTag level={block.level} className={cls}>
          {text}
        </HeadingTag>
      );
    }
    case "text": {
      const text = resolveLocalized(block.text, locale);
      const isPricingCard =
        !nested &&
        variant === "pricing" &&
        prev?.type === "heading" &&
        prev.pricingCard === true;
      const inner = renderTextBlock(
        text,
        variant,
        block.align,
        landingTextCounter,
        nested
      );
      if (isPricingCard) {
        return (
          <div className="rounded-xl border border-[#6b5736] bg-zinc-950 p-6 space-y-4">
            {inner}
          </div>
        );
      }
      return inner;
    }
    case "button": {
      const label = resolveLocalized(block.label, locale);
      const justify = flexJustifyFromAlign(block.align);
      const isLearnMore =
        label.toLowerCase().includes("learn more") ||
        label.toLowerCase().includes("saiba mais");
      if (isLearnMore && variant === "landing") {
        return (
          <AccentLink
            href={block.href}
            align={block.align}
            wrapperClassName="pt-4"
          >
            {label}
          </AccentLink>
        );
      }
      const btnVariant = block.variant === "primary" ? "filled" : "outline";
      return (
        <div className={cn("flex w-full", justify)}>
          <Link
            href={block.href}
            className={buttonClassName({ variant: btnVariant })}
          >
            {label}
          </Link>
        </div>
      );
    }
    case "buttons": {
      const wrap = cn(
        variant === "about"
          ? "flex flex-wrap gap-6"
          : "flex flex-wrap gap-4 pt-6",
        flexJustifyFromAlign(block.align)
      );
      return (
        <div className={wrap}>
          {block.items.map((item, j) => {
            const btnVariant = item.variant === "primary" ? "filled" : "outline";
            return (
              <Link
                key={j}
                href={item.href}
                className={buttonClassName({ variant: btnVariant })}
              >
                {resolveLocalized(item.label, locale)}
              </Link>
            );
          })}
        </div>
      );
    }
    case "image": {
      const capAlign =
        block.align === "center"
          ? "text-center"
          : block.align === "right"
            ? "text-right"
            : "text-left";
      const figureAlign =
        block.align === "center"
          ? "mx-auto max-w-4xl"
          : block.align === "right"
            ? "ml-auto mr-0 max-w-4xl"
            : "max-w-4xl";
      const alt = block.alt ? resolveLocalized(block.alt, locale) : "";
      const caption = block.caption
        ? resolveLocalized(block.caption, locale)
        : null;
      return (
        <figure className={cn("space-y-2", figureAlign)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={alt}
            className="max-h-[480px] w-full rounded-lg border border-zinc-800 object-contain"
          />
          {caption ? (
            <figcaption className={cn("text-sm text-zinc-500", capAlign)}>
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "video": {
      const caption = block.caption
        ? resolveLocalized(block.caption, locale)
        : undefined;
      return (
        <CmsVideo url={block.url} caption={caption} align={block.align} />
      );
    }
    case "landing_hero":
      return null;
    case "grid": {
      const cols = block.columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
      const gridWrap =
        variant === "landing"
          ? `grid gap-16 border-t border-zinc-900 pt-16 ${cols}`
          : variant === "about"
            ? `grid gap-x-16 gap-y-12 ${cols}`
            : `grid gap-8 ${cols}`;
      const cells = await Promise.all(
        block.cells.map((cell) =>
          BlockList({
            blocks: cell,
            variant,
            locale,
            landingTextCounter,
            nested: true,
          })
        )
      );
      return (
        <div
          className={cn(
            gridWrap,
            "w-full",
            block.align === "center" && "mx-auto max-w-6xl",
            block.align === "right" && "ml-auto mr-0 max-w-6xl"
          )}
        >
          {cells.map((cell, ci) => (
            <div key={ci} className="min-w-0">
              {cell}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
