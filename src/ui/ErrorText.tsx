import { cn } from "@/utils/common";

type ErrorTextProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ErrorText({ children, className }: ErrorTextProps) {
  if (!children) return null;
  return (
    <p className={cn("mt-1 text-xs text-red-400", className)}>{children}</p>
  );
}
