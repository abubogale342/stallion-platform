import { cn } from "@/utils/common";

export const adminInputClassName =
  "mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

export const publicInputClassName =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white transition-all focus:border-[#b08d57] outline-none";

/** Compact selects — navbar language picker, directory sidebar filters. */
export const navSelectClassName =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[13px] text-white outline-none focus:border-gold disabled:opacity-60 cursor-pointer";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: "admin" | "public";
};

export default function Input({
  variant = "admin",
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        variant === "admin" ? adminInputClassName : publicInputClassName,
        className
      )}
      {...props}
    />
  );
}
