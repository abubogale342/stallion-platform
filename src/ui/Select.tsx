import { cn } from "@/utils/common";
import SelectChevron from "./SelectChevron";
import {
  adminInputClassName,
  navSelectClassName,
  publicInputClassName,
} from "./Input";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: "admin" | "public" | "nav";
};

export default function Select({
  variant = "admin",
  className,
  children,
  ...props
}: SelectProps) {
  if (variant === "nav") {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            navSelectClassName,
            "appearance-none pr-9",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <SelectChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grey-2" />
      </div>
    );
  }

  const select = (
    <select
      className={cn(
        variant === "admin" ? adminInputClassName : publicInputClassName,
        variant === "public" && "cursor-pointer appearance-none pr-10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (variant === "public") {
    return (
      <div className="relative w-full">
        {select}
        <SelectChevron className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grey-2" />
      </div>
    );
  }

  return select;
}
