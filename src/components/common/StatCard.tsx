import Card from "@/ui/Card";
import { cn } from "@/utils/common";
import { profileStatLabelClassName } from "@/components/profile/sectionTitle";

type StatCardVariant = "profile-gold" | "profile-stats" | "admin";

const valueClass: Record<StatCardVariant, string> = {
  "profile-gold":
    "mt-2 text-[24px] font-medium leading-none text-gold md:text-[24px]",
  "profile-stats":
    "mt-1.5 text-[16px] font-semibold leading-snug text-zinc-100 md:text-[17px]",
  admin: "mt-2 text-2xl font-semibold tabular-nums text-white",
};

const labelClass: Record<StatCardVariant, string> = {
  "profile-gold": profileStatLabelClassName,
  "profile-stats":
    "text-[14px] font-medium leading-snug text-zinc-500 md:text-[15px]",
  admin: "text-xs font-medium uppercase tracking-wider text-slate-500",
};

const cardClass: Record<StatCardVariant, string> = {
  "profile-gold":
    "rounded border border-white/10 bg-surface px-5 py-4 text-center",
  "profile-stats":
    "rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-sm shadow-black/30",
  admin:
    "rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 shadow-sm transition-colors",
};

type StatCardProps = {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  variant?: StatCardVariant;
  valueSize?: "md" | "lg";
  hint?: string;
  className?: string;
};

export default function StatCard({
  label,
  value,
  children,
  variant = "profile-gold",
  valueSize,
  hint,
  className,
}: StatCardProps) {
  const valueCls =
    valueSize === "lg" && variant === "profile-gold"
      ? "mt-2 text-[34px] font-medium leading-none text-gold"
      : valueSize === "lg" && variant === "profile-stats"
        ? "mt-4 text-[34px] font-medium leading-none text-gold"
        : valueClass[variant];

  return (
    <Card className={cn(cardClass[variant], className)}>
      <p className={labelClass[variant]}>{label}</p>
      {children ?? (
        <div className={valueCls}>{value}</div>
      )}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
