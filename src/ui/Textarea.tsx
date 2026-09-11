import { cn } from "@/utils/common";
import { adminInputClassName, publicInputClassName } from "./Input";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  variant?: "admin" | "public";
};

export default function Textarea({
  variant = "admin",
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(
        variant === "admin" ? adminInputClassName : publicInputClassName,
        "resize-y leading-relaxed whitespace-pre-wrap",
        variant === "admin" ? "min-h-[6rem]" : "min-h-[4.5rem]",
        className
      )}
      {...props}
    />
  );
}
