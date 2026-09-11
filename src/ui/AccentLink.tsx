import Link from "next/link";
import { cn } from "@/utils/common";

export type AccentLinkVariant = "default" | "subtle" | "inline";

const variantClass: Record<AccentLinkVariant, string> = {
  default:
    "text-xs font-bold uppercase tracking-widest text-[#B08D57] hover:text-white transition",
  subtle:
    "inline-flex items-center gap-4 text-xs font-medium uppercase tracking-[0.18em] text-[#c09a64] transition-opacity hover:opacity-80",
  inline: "text-[#b08d57] hover:underline",
};

export function accentLinkClassName(
  classNameOrOptions?: string | { variant?: AccentLinkVariant; className?: string }
) {
  const variant =
    typeof classNameOrOptions === "object"
      ? (classNameOrOptions.variant ?? "default")
      : "default";
  const className =
    typeof classNameOrOptions === "object"
      ? classNameOrOptions.className
      : classNameOrOptions;

  return cn(variantClass[variant], className);
}

type AccentLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: AccentLinkVariant;
  className?: string;
  align?: "left" | "center" | "right";
  wrapperClassName?: string;
  suffix?: React.ReactNode;
  external?: boolean;
  title?: string;
};

function flexJustify(align?: AccentLinkProps["align"]) {
  if (align === "center") return "justify-center";
  if (align === "right") return "justify-end";
  return "justify-start";
}

export default function AccentLink({
  href,
  children,
  variant = "default",
  className,
  align,
  wrapperClassName,
  suffix,
  external = false,
  title,
}: AccentLinkProps) {
  const linkClass = accentLinkClassName({ variant, className });

  const link = external ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={linkClass}
    >
      {children}
      {suffix}
    </a>
  ) : (
    <Link href={href} title={title} className={linkClass}>
      {children}
      {suffix}
    </Link>
  );

  if (!align && !wrapperClassName) return link;

  return (
    <div className={cn("flex w-full", flexJustify(align), wrapperClassName)}>
      {link}
    </div>
  );
}
