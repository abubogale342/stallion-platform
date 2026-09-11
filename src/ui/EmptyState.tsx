import { cn } from "@/utils/common";

type EmptyStateProps = {
  children: React.ReactNode;
  variant?: "public" | "admin";
  className?: string;
};

const variantClass = {
  public: "rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400",
  admin: "rounded-lg border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-500",
};

export default function EmptyState({
  children,
  variant = "public",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(variantClass[variant], className)}>{children}</div>
  );
}
