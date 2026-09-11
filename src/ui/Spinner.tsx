import { cn } from "@/utils/common";

type SpinnerProps = {
  className?: string;
  size?: "sm" | "md";
};

const sizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
};

export default function Spinner({ className, size = "sm" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        sizeClass[size],
        className
      )}
    />
  );
}
