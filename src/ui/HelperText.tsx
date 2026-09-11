import { cn } from "@/utils/common";

type HelperTextProps = {
  children: React.ReactNode;
  className?: string;
};

export default function HelperText({ children, className }: HelperTextProps) {
  return (
    <p className={cn("mt-1 text-xs text-slate-500", className)}>{children}</p>
  );
}
