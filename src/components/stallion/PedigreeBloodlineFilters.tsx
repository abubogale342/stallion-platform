"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import debounce from "lodash.debounce";
import {
  BLOODLINE_GENERATIONS,
  MAX_BLOODLINE_CONDITIONS,
  emptyBloodlineCondition,
} from "@/utils/bloodline-search";
import type {
  BloodlineCondition,
  HorseSide,
  HorseMatchMode,
} from "@/utils/bloodline-search";
import {
  searchPublicAncestorNames,
  type PublicAncestorSuggestion,
} from "@/services/pedigree";

const SUGGEST_DEBOUNCE_MS = 250;

const inputClass =
  "w-full rounded-[4px] border border-[#262626] bg-transparent h-[40px] px-[15px] text-[14px] text-white placeholder:text-[#aaa] outline-none transition-colors focus:border-[#c09a64]/60";

function Checkbox({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2" onClick={onClick}>
      <span
        className={`flex h-[12px] w-[12px] shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
          checked ? "border-[#c09a64] bg-[#c09a64]" : "border-[#aaa]"
        }`}
      >
        {checked ? (
          <Check className="h-2 w-2 text-black" strokeWidth={3} aria-hidden />
        ) : null}
      </span>
      <span className="text-[14px] leading-[1.4] text-[#aaa]">{label}</span>
    </label>
  );
}

/**
 * Ancestor name field with suggestions drawn from published pedigrees. Free
 * text still works — the search matches partial names — so a breeder can type
 * an ancestor the suggestions do not cover.
 */
function AncestorNameField({
  value,
  horseType,
  placeholder,
  onChange,
}: {
  value: string;
  horseType: "stallion" | "mare";
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<PublicAncestorSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const lookup = useMemo(
    () =>
      debounce(async (query: string, type: "stallion" | "mare") => {
        const results = await searchPublicAncestorNames({
          query,
          horseType: type,
        });
        setSuggestions(results);
        setOpen(results.length > 0);
      }, SUGGEST_DEBOUNCE_MS),
    []
  );

  useEffect(() => () => lookup.cancel(), [lookup]);

  /** Suggestions follow what the user types, not a picked name. */
  const onType = (next: string) => {
    onChange(next);
    const query = next.trim();
    if (query.length < 2) {
      lookup.cancel();
      setSuggestions([]);
      setOpen(false);
      return;
    }
    lookup(query, horseType);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Search
        className="pointer-events-none absolute left-[15px] top-[20px] h-4 w-4 -translate-y-1/2 text-[#aaa]"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => setOpen(suggestions.length > 0)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`${inputClass} pl-[41px]`}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[4px] border border-[#262626] bg-[#121212] py-1">
          {suggestions.map((suggestion) => (
            <li key={suggestion.name}>
              <button
                type="button"
                onClick={() => {
                  lookup.cancel();
                  onChange(suggestion.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-[15px] py-2 text-left text-[14px] text-[#ddd] transition-colors hover:bg-[#1a1a1a] hover:text-white"
              >
                <span className="truncate">{suggestion.name}</span>
                <span className="shrink-0 text-[12px] text-[#727272]">
                  {suggestion.horseCount}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Horse (ancestor) search, shared by the stallion and mare directories.
 * Both sidebars sit on a dark surface — the mare directory's white theme only
 * repaints the page canvas — so one set of colours serves both.
 *
 * Each condition is independent: an ancestor name, the exact generations it may
 * sit at, the side(s) it descends through, and whether it adds or removes
 * results. Conditions combine, so "include Colonels Smoking Gun at generation
 * 2" plus "exclude Whiz Resolution" returns horses carrying the first and not
 * the second.
 */
export default function PedigreeBloodlineFilters({
  conditions,
  onChange,
  horseType,
}: {
  conditions: BloodlineCondition[];
  onChange: (next: BloodlineCondition[]) => void;
  horseType: "stallion" | "mare";
}) {
  const t = useTranslations("stallions.bloodline");

  // One empty condition is always on screen so the field is discoverable.
  const rows = conditions.length ? conditions : [emptyBloodlineCondition()];

  const update = (index: number, patch: Partial<BloodlineCondition>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const remove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const toggleGeneration = (index: number, generation: number) => {
    const current = rows[index].generations;
    update(index, {
      generations: current.includes(generation)
        ? current.filter((g) => g !== generation)
        : [...current, generation].sort((a, b) => a - b),
    });
  };

  // Sides are a set, not a choice: ticking both is linebreeding — the ancestor
  // must occur on the sire side *and* the dam side. Ticking neither leaves the
  // search unrestricted, which is why there is no "Any" option to select.
  const toggleSide = (index: number, side: HorseSide) => {
    const current = rows[index].sides;
    update(index, {
      sides: current.includes(side)
        ? current.filter((s) => s !== side)
        : [...current, side],
    });
  };

  const matchOptions: { value: HorseMatchMode; label: string }[] = [
    { value: "include", label: t("include") },
    { value: "exclude", label: t("exclude") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[16px] leading-[28px] text-white">{t("heading")}</p>
        <p className="text-[12px] leading-[1.5] text-[#727272]">{t("hint")}</p>
      </div>

      {rows.map((condition, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-[4px] border border-[#262626] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium uppercase tracking-[0.24px] text-[#c09a64]">
              {t("conditionLabel", { number: index + 1 })}
            </span>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t("remove")}
                className="flex h-6 w-6 items-center justify-center rounded-[2px] text-[#aaa] transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] text-white">
              {t("horseNameLabel")}
            </p>
            <AncestorNameField
              value={condition.name}
              horseType={horseType}
              placeholder={t("horseNamePlaceholder")}
              onChange={(name) => update(index, { name })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] text-white">
              {t("generationLabel")}
            </p>
            <div className="flex flex-col gap-1">
              {/* Empty selection is "any", so Any simply clears the ticks. */}
              <Checkbox
                checked={condition.generations.length === 0}
                label={t("anyGeneration")}
                onClick={() => update(index, { generations: [] })}
              />
              {BLOODLINE_GENERATIONS.map((generation) => (
                <Checkbox
                  key={generation}
                  checked={condition.generations.includes(generation)}
                  label={t(`generationOption.${generation}`)}
                  onClick={() => toggleGeneration(index, generation)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] text-white">
              {t("lineLabel")}
            </p>
            <div className="flex flex-col gap-1">
              <Checkbox
                checked={condition.sides.includes("sire")}
                label={t("sireLine")}
                onClick={() => toggleSide(index, "sire")}
              />
              <Checkbox
                checked={condition.sides.includes("dam")}
                label={t("damLine")}
                onClick={() => toggleSide(index, "dam")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] leading-[1.4] text-white">
              {t("matchLabel")}
            </p>
            <div className="flex gap-2">
              {matchOptions.map((option) => {
                const active = condition.match === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update(index, { match: option.value })}
                    className={
                      active
                        ? "flex-1 rounded-[2px] border border-[#c09a64] bg-[#c09a64]/10 px-3 py-1.5 text-[12px] font-medium text-[#c09a64] transition-colors"
                        : "flex-1 rounded-[2px] border border-[#262626] px-3 py-1.5 text-[12px] font-medium text-[#aaa] transition-colors hover:border-[#c09a64]/40 hover:text-white"
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {rows.length < MAX_BLOODLINE_CONDITIONS ? (
        <button
          type="button"
          onClick={() => onChange([...rows, emptyBloodlineCondition()])}
          className="flex h-[40px] w-full items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-[#262626] text-[12px] font-medium text-[#c09a64] transition-colors hover:border-[#c09a64]/40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("addAnother")}
        </button>
      ) : null}
    </div>
  );
}
