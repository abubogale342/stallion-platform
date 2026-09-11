"use client";

import { useFormContext } from "react-hook-form";
import type { DisciplineFamily } from "@/types/discipline";
import type { StallionFormValues } from "@/types/stallion-form";
import {
  BREED_TYPE_LABELS,
  BREED_TYPE_VALUES,
} from "@/utils/common";
import { joinDisciplineCoverage } from "@/utils/stallion-profile-i18n";
import { CANONICAL_COAT_COLOURS } from "@/utils/coat-colour-i18n";

/**
 * Canonical colours plus, when the record holds a legacy value that isn't on
 * the list, that value as a pre-selected extra option — so opening and saving
 * an old record never silently reassigns its colour.
 */
function coatColourSelectOptions(currentValue: string | undefined) {
  const options: { value: string; label: string }[] = [
    { value: "", label: "Select colour…" },
    ...CANONICAL_COAT_COLOURS.map((c) => ({ value: c, label: c })),
  ];
  // Exact string check: the <select> can only show values that exist as options,
  // so any stored value not literally in the list must be offered as-is.
  const current = currentValue?.trim();
  if (current && !(CANONICAL_COAT_COLOURS as readonly string[]).includes(current)) {
    options.splice(1, 0, {
      value: current,
      label: `${current} (not in standard list)`,
    });
  }
  return options;
}
import TranslatableTextField from "../TranslatableTextField";
import {
  FormError,
  RhfCurrencySelect,
  RhfSelect,
  RhfTextField,
} from "../fields";
import TranslatableTextarea from "../TranslatableTextarea";
import SectionCard from "../SectionCard";
import { COUNTRY_OF_RESIDENCE_OPTIONS } from "./shared";

export default function StepIdentity({
  disciplineFamilies,
}: {
  disciplineFamilies: DisciplineFamily[];
}) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const family_ids = watch("family_ids") ?? [];
  const breed = watch("breed");
  const englishBreedLabel = breed ? BREED_TYPE_LABELS[breed] : "";
  const englishDisciplineCoverage = joinDisciplineCoverage(
    disciplineFamilies
      .filter((family) => family_ids.includes(family.id))
      .map((family) => family.name)
  );

  const toggleDisciplineFamily = (familyId: string) => {
    const next = family_ids.includes(familyId)
      ? family_ids.filter((x) => x !== familyId)
      : [...family_ids, familyId];
    setValue("family_ids", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Core identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <RhfTextField
            name="stallion_name"
            label="Registered name"
            required
            rules={{ required: "Registered name is required." }}
          />
          <RhfSelect
            name="stallion_status"
            label="Standing status"
            options={[
              { value: "", label: "Select status…" },
              { value: "Active", label: "Active" },
              { value: "Deceased", label: "Deceased" },
              { value: "Retired", label: "Retired" },
            ]}
          />
          <RhfSelect
            name="breed"
            label="Breed"
            required
            options={[
              { value: "", label: "Select breed…" },
              ...BREED_TYPE_VALUES.map((b) => ({
                value: b,
                label: BREED_TYPE_LABELS[b],
              })),
            ]}
          />
          <RhfSelect
            name="country_of_residence"
            label="Country of residence"
            options={COUNTRY_OF_RESIDENCE_OPTIONS}
          />
          <RhfTextField
            name="registry"
            label="Registry / association"
            placeholder="e.g. AQHA"
          />
          <RhfTextField
            name="registration_number"
            label="Registration number"
            required
          />
          {/*
            Milestone 17. Distinct from country_of_residence: where the horse
            is registered, not where it stands.
          */}
          <RhfTextField
            name="country_of_registration"
            label="Country of registration"
          />
          <RhfTextField
            name="official_registry_link"
            label="Official registry link"
            placeholder="https://…"
          />
          <RhfTextField
            name="year_of_birth"
            label="Year of birth"
            type="number"
          />
          <RhfTextField
            name="total_reported_earnings"
            label="Life time earnings"
            type="number"
            hint="Shown on the public profile when set (non-zero)."
          />
          <RhfCurrencySelect
            name="total_reported_earnings_currency"
            label="Life time earnings currency"
          />
          <RhfSelect
            name="coat_colour"
            label="Coat colour"
            options={coatColourSelectOptions(watch("coat_colour"))}
            hint="Standard colours translate automatically on pt-BR profiles."
          />
          {/* Milestone 17 — `stallions.coat_pattern`, written by the agent. */}
          <RhfTextField
            name="coat_pattern"
            label="Coat pattern"
            placeholder="e.g. Overo, Tobiano"
          />
          <RhfTextField
            name="height"
            label="Height (HH)"
            placeholder="15.2"
            hint="Displayed as centimeters on pt-BR public profiles."
          />
        </div>
        <TranslatableTextarea
          englishName="summary"
          translationKey="summary"
          label="Overview / summary"
          rows={8}
          placeholder="Enter a multi-paragraph overview. Press Enter for a new line."
          hint="Line breaks are preserved on the public profile."
        />
      </SectionCard>
      <SectionCard title="Discipline coverage">
        {disciplineFamilies.length === 0 ? (
          <p className="text-sm text-slate-500">
            No discipline families found. Add rows in{" "}
            <code className="text-slate-400">discipline_families</code>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disciplineFamilies.map((family) => (
              <label
                key={family.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={family_ids.includes(family.id)}
                  onChange={() => toggleDisciplineFamily(family.id)}
                  className="rounded border-slate-600"
                />
                {family.name}
              </label>
            ))}
          </div>
        )}
        <FormError name="family_ids" />
        <div className="mt-4 space-y-4">
          <TranslatableTextField
            englishPreview={englishBreedLabel}
            translationKey="breed_label"
            label="Breed (Portuguese display)"
            placeholder="e.g. Quarter Horse"
            translationHint="Optional. When empty, the public pt-BR profile uses the standard breed label from site translations."
          />
          <TranslatableTextField
            englishPreview={englishDisciplineCoverage}
            translationKey="discipline_coverage"
            label="Discipline coverage (Portuguese)"
            multiline
            rows={3}
            placeholder="e.g. Reining, Working Cow Horse"
            translationHint="Optional. Use commas between disciplines. When empty, English discipline names are shown on pt-BR profiles."
          />
        </div>
      </SectionCard>
    </div>
  );
}
