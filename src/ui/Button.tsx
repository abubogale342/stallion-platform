import { cn } from "@/utils/common";
import Spinner from "./Spinner";

export type ButtonVariant =
  | "filled"
  | "outline"
  | "primary"
  | "ghost"
  | "danger"
  | "gold"
  | "goldSubmit"
  | "goldOutline"
  | "unstyled";

export type ButtonSize = "sm" | "md" | "lg" | "cms" | "none";

const baseClass =
  "inline-flex items-center justify-center transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40";

const variantClass: Record<ButtonVariant, string> = {
  filled:
    "bg-white text-black hover:bg-transparent hover:text-white border border-white font-bold uppercase tracking-widest",
  outline:
    "text-white hover:bg-white hover:text-black border border-white font-bold uppercase tracking-widest",
  primary:
    "rounded-lg border border-sky-500/30 bg-sky-950/30 text-sky-100 hover:bg-sky-950/50 normal-case tracking-normal font-medium",
  ghost:
    "text-slate-300 hover:text-white border border-transparent normal-case tracking-normal font-medium",
  danger:
    "rounded-lg border border-red-500/30 bg-red-950/30 text-red-200 hover:bg-red-950/50 normal-case tracking-normal font-medium",
  gold:
    "rounded bg-[#b08d57] text-black hover:bg-[#c4a068] border border-[#b08d57] normal-case tracking-normal font-medium",
  goldSubmit:
    "rounded-none border border-[#b08d57] bg-[#b08d57] text-black hover:bg-transparent hover:text-[#b08d57] normal-case tracking-[0.2em] font-bold",
  goldOutline:
    "rounded-md border border-[#b08d57] bg-transparent text-white hover:bg-[#b08d57] hover:text-black normal-case tracking-normal font-bold",
  unstyled: "",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "rounded px-2.5 py-1 text-xs",
  md: "rounded-lg px-3 py-1.5 text-xs",
  lg: "rounded-lg px-4 py-2 text-sm",
  cms: "w-full sm:w-auto text-center rounded-none px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em]",
  none: "",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function buttonClassName({
  variant = "outline",
  size = "cms",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  if (variant === "unstyled") {
    return cn(baseClass, sizeClass.none, className);
  }
  return cn(baseClass, variantClass[variant], sizeClass[size], className);
}

export default function Button({
  children,
  variant = "outline",
  size = "cms",
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner size="sm" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
