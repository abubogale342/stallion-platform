import type { ReactNode } from "react";
import { cn } from "@/utils/common";

/** Two-column label/value row — matches Breeding Details / Health card typography. */
export default function ProfileDetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  /** Override value line-height (e.g. long prose in Health). */
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(200px,220px)_1fr] sm:gap-4 sm:py-2">
      <p className="text-[14px] font-medium leading-snug text-zinc-500 md:text-[15px]">
        {label}
      </p>
      <div
        className={cn(
          "wrap-break-word text-[16px] text-zinc-100 md:text-[17px]",
          valueClassName ?? "leading-snug"
        )}
      >
        {value}
      </div>
    </div>
  );
}
