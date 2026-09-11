import { alignTextClass } from "./styles";
import type { CmsPageVariant, TextBlockCounter } from "./types";

export function renderTextBlock(
  text: string,
  variant: CmsPageVariant,
  align: "left" | "center" | "right" | undefined,
  counter: TextBlockCounter,
  nested: boolean
) {
  const alignClass = alignTextClass(align);
  if (nested && variant === "landing") {
    return (
      <p className="text-[13px] leading-relaxed text-zinc-500 whitespace-pre-line">{text}</p>
    );
  }
  if (variant === "landing") {
    counter.n += 1;
    const ac = align ? alignTextClass(align) : "";
    if (counter.n === 1) {
      return (
        <p
          className={`text-xl font-medium text-zinc-400 tracking-wide max-w-2xl ${ac}`.trim()}
        >
          {text}
        </p>
      );
    }
    if (counter.n === 2) {
      return (
        <div
          className={`max-w-2xl space-y-6 text-base leading-relaxed text-zinc-400 ${ac}`.trim()}
        >
          <p>{text}</p>
        </div>
      );
    }
    if (counter.n === 3) {
      return (
        <p
          className={`text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 ${ac}`.trim()}
        >
          {text}
        </p>
      );
    }
  }
  if (variant === "about") {
    const blockAlign =
      align === "center"
        ? "mx-auto text-center"
        : align === "right"
          ? "ml-auto text-right"
          : "mr-auto text-left";
    return (
      <div
        className={`max-w-3xl ${blockAlign} space-y-8 text-base leading-relaxed text-zinc-400`}
      >
        {text.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    );
  }
  if (variant === "pricing") {
    return (
      <p
        className={`text-sm text-zinc-400 leading-relaxed whitespace-pre-line ${alignClass}`}
      >
        {text}
      </p>
    );
  }
  return (
    <p className="text-sm leading-relaxed text-zinc-400 whitespace-pre-line">{text}</p>
  );
}
