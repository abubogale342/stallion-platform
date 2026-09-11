import { cn } from "@/utils/common";

type LabelProps = {
  children: React.ReactNode;
  required?: boolean;
  variant?: "admin" | "public" | "display" | "displayProfile";
  className?: string;
  htmlFor?: string;
};

const variantClass = {
  admin:
    "block text-xs font-medium uppercase tracking-wide text-slate-500",
  public:
    "text-[10px] font-bold uppercase tracking-widest text-zinc-500",
  display:
    "block text-[16px] leading-[1.5] text-white/60 normal-case tracking-normal font-normal",
  displayProfile:
    "block text-[14px] font-medium leading-snug text-zinc-500 md:text-[15px] normal-case tracking-normal",
};

export default function Label({
  children,
  required,
  variant = "admin",
  className,
  htmlFor,
}: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn(variantClass[variant], className)}>
      {children}
      {required ? <span className="text-red-400/90"> *</span> : null}
    </label>
  );
}
