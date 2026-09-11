import { cn } from "@/utils/common";

type ChipVariant = "profile" | "directory";

const variantClass: Record<ChipVariant, string> = {
  profile:
    "rounded-sm border border-white/10 bg-black/30 px-4 py-2 text-[16px] text-gold",
  directory:
    "rounded-full border border-(--gold)/40 bg-(--bg-surface) px-2 py-0.5 text-xs text-zinc-200",
};

type ChipProps = {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
};

export default function Chip({
  children,
  variant = "profile",
  className,
}: ChipProps) {
  return (
    <span className={cn(variantClass[variant], className)}>{children}</span>
  );
}
