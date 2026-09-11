import { cn } from "@/utils/common";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "gold";

const variantClass: Record<BadgeVariant, string> = {
  default: "rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200",
  success:
    "rounded bg-emerald-950/50 px-2 py-0.5 text-xs font-medium text-emerald-300/90",
  warning:
    "rounded bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-300/90",
  danger: "rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white",
  muted: "rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white",
  gold: "inline-flex items-center rounded-sm border border-[#B08D57] px-2 py-1 text-[11px] font-medium tracking-normal text-[#B08D57]",
};

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span className={cn(variantClass[variant], className)}>{children}</span>
  );
}
