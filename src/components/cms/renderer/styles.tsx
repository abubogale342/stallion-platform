import type { CmsAlign } from "@/types/cms";
import type { CmsPageVariant } from "./types";

export function flexJustifyFromAlign(align?: CmsAlign): string {
  if (align === "center") return "justify-center";
  if (align === "right") return "justify-end";
  return "justify-start";
}

export function alignHeadingClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right ml-auto";
  return "";
}

export function headingClass(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  variant: CmsPageVariant,
  align?: "left" | "center" | "right"
): string {
  const alignClass = alignHeadingClass(align);
  if (level === 6) {
    return `text-xs font-medium tracking-[0.2em] text-[#B08D57] uppercase ${alignClass}`;
  }
  if (level === 1) {
    if (variant === "about") {
      return `text-5xl font-bold tracking-tight text-white sm:text-6xl ${alignClass}`;
    }
    return `text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl max-w-4xl ${alignClass}`;
  }
  if (level === 2) {
    if (variant === "pricing") {
      return `text-lg font-semibold text-[#b08d57] ${alignClass}`.trim();
    }
    if (variant === "about") {
      return `text-sm font-bold uppercase tracking-[0.2em] text-white ${alignClass}`.trim();
    }
    return `text-sm font-bold uppercase tracking-[0.2em] text-white ${alignClass}`.trim();
  }
  return `text-lg font-semibold text-white ${alignClass}`;
}

export function HeadingTag({
  level,
  className,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  className: string;
  children: React.ReactNode;
}) {
  const Tag = (`h${level}` as const) satisfies "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return <Tag className={className}>{children}</Tag>;
}

export function alignTextClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return "text-center mx-auto";
  if (align === "right") return "text-right ml-auto";
  return "";
}
