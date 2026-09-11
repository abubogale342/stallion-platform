"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/utils/common";

export type DirectoryFilterOption = {
  value: string;
  label: string;
};

type DirectoryFilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DirectoryFilterOption[];
  allLabel?: string;
};

export default function DirectoryFilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: DirectoryFilterSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected =
    options.find((option) => option.value === value) ??
    ({ value: "All", label: allLabel } satisfies DirectoryFilterOption);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[16px] leading-[28px] text-white">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-[40px] w-full items-center justify-between rounded-[4px] border border-[#262626] bg-[#0c0c0c] px-[15px] text-left text-[14px] text-white outline-none transition-colors",
          open ? "border-[#c09a64]/60" : "hover:border-[#c09a64]/40"
        )}
      >
        <span className={selected.value === "All" ? "text-[#aaa]" : "text-white"}>
          {selected.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[#aaa] transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="max-h-56 overflow-y-auto rounded-[4px] border border-[#262626] bg-[#121212] py-1"
        >
          {options.map((option) => {
            const isSelected = option.value === selected.value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-[15px] py-2.5 text-left text-[14px] transition-colors",
                    isSelected
                      ? "bg-[#1a1a1a] text-[#c09a64]"
                      : "text-[#ddd] hover:bg-[#1a1a1a] hover:text-white"
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
