"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import { SEMEN_AVAILABILITY_OPTION_TYPE_VALUES } from "@/utils/common";
import { formatSemenMethodBilingualLabel } from "@/utils/semen-availability-i18n";
import {
  FieldLabel,
  FormError,
  RhfSelect,
  RhfTextField,
} from "../../fields";
import { useStallionTranslation } from "../../StallionTranslationContext";
import TranslatableTextarea from "../../TranslatableTextarea";
import Button from "@/ui/Button";
import ConfirmRemoveDialog from "../../ConfirmRemoveDialog";
import SectionCard from "../../SectionCard";
import BreedingRecordsEditor from "./BreedingRecordsEditor";
import BreedingMethodLabelsEditor from "./BreedingMethodLabelsEditor";

export default function StepBreeding() {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const { values: translationValues } = useStallionTranslation();
  const methods = watch("semen_availability") ?? [];
  const countries = watch("country_availability") ?? [];
  const liveCover = watch("live_cover_available");
  const [countryToRemove, setCountryToRemove] = useState<string | null>(null);

  const toggleMethod = (
    m: (typeof SEMEN_AVAILABILITY_OPTION_TYPE_VALUES)[number]
  ) => {
    const next = methods.includes(m)
      ? methods.filter((x) => x !== m)
      : [...methods, m];
    const nextLiveCover =
      m === "Live Cover" ? next.includes("Live Cover") : liveCover;
    setValue("semen_availability", next, { shouldDirty: true });
    setValue("live_cover_available", nextLiveCover, { shouldDirty: true });
  };

  const toggleLiveCover = (checked: boolean) => {
    if (checked) {
      setValue("live_cover_available", true, { shouldDirty: true });
      if (!methods.includes("Live Cover")) {
        setValue("semen_availability", [...methods, "Live Cover"], {
          shouldDirty: true,
        });
      }
      return;
    }
    setValue("live_cover_available", false, { shouldDirty: true });
    setValue(
      "semen_availability",
      methods.filter((m) => m !== "Live Cover"),
      { shouldDirty: true }
    );
  };

  const addCountry = (raw: string) => {
    const t = raw.trim();
    if (!t || countries.includes(t)) return;
    setValue("country_availability", [...countries, t], { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Breeding availability">
        <FieldLabel required>
          Semen / breeding methods
        </FieldLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEMEN_AVAILABILITY_OPTION_TYPE_VALUES.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300"
            >
              <input
                type="checkbox"
                checked={methods.includes(m)}
                onChange={() => toggleMethod(m)}
              />
              {formatSemenMethodBilingualLabel(
                m,
                translationValues.breeding_method_labels[m]
              )}
            </label>
          ))}
        </div>
        <BreedingMethodLabelsEditor />
        <FormError name="semen_availability" />
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="live-cover"
            className="rounded border-slate-600"
            checked={Boolean(liveCover)}
            onChange={(e) => toggleLiveCover(e.target.checked)}
          />
          <label htmlFor="live-cover" className="text-sm text-slate-300">
            Live cover available
          </label>
        </div>
        <div className="mt-4">
          <FieldLabel required>Country availability</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {countries.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300"
              >
                {c}
                <Button
                  type="button"
                  variant="unstyled"
                  size="none"
                  className="min-w-0 p-0 text-slate-500 hover:text-red-400"
                  onClick={() => setCountryToRemove(c)}
                >
                  ×
                </Button>
              </span>
            ))}
          </div>
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
            placeholder="Type country and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCountry((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <FormError name="country_availability" />
        </div>
      </SectionCard>
      <BreedingRecordsEditor />
      <SectionCard title="Breeding manager">
        <div className="grid gap-4 sm:grid-cols-2">
          <RhfSelect
            name="breeding_guarantees"
            label="Breeding guarantee"
            options={[
              { value: "", label: "Select guarantee…" },
              { value: "LFG", label: "LFG" },
              { value: "Colour", label: "Colour" },
              { value: "None", label: "None" },
            ]}
          />
          <RhfTextField name="breeding_manager" label="Breeding manager" />
          <RhfTextField
            name="breeding_manager_organization"
            label="Manager organization"
          />
          <RhfTextField name="breeding_manager_email" label="Manager email" />
          <RhfTextField name="breeding_manager_phone" label="Manager phone" />
        </div>
        <TranslatableTextarea
          englishName="breeding_notes"
          translationKey="breeding_summary"
          label="Breeding notes"
          rows={3}
        />
      </SectionCard>

      <ConfirmRemoveDialog
        open={countryToRemove != null}
        onClose={() => setCountryToRemove(null)}
        onConfirm={() => {
          if (!countryToRemove) return;
          setValue(
            "country_availability",
            countries.filter((x) => x !== countryToRemove),
            { shouldDirty: true }
          );
          setCountryToRemove(null);
        }}
        title="Remove country?"
        message={
          countryToRemove
            ? `Remove “${countryToRemove}” from country availability?`
            : "This cannot be undone."
        }
      />
    </div>
  );
}
