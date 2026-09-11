"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ConfirmRemoveDialog from "../ConfirmRemoveDialog";
import {
  FieldLabel,
  FormError,
  RhfCurrencySelect,
  RhfSelect,
  RhfTextField,
  RhfTextarea,
} from "../fields";
import SectionCard from "../SectionCard";

/** Suggested values only — et_status is free text in the DB. */
const ET_STATUS_OPTIONS = [
  { value: "", label: "Select status…" },
  { value: "Donor", label: "Donor" },
  { value: "Seasonal", label: "Seasonal" },
  { value: "Deceased", label: "Deceased" },
];

const EMBRYO_AVAILABILITY_OPTIONS = [
  { value: "", label: "Select availability…" },
  { value: "Fresh", label: "Fresh" },
  { value: "Frozen", label: "Frozen" },
  { value: "Both", label: "Both" },
];

export default function StepEt() {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const countries = watch("country_availability") ?? [];
  const internationalAvailability = watch("et_details.international_availability");
  const [countryToRemove, setCountryToRemove] = useState<string | null>(null);

  const addCountry = (value: string) => {
    const t = value.trim();
    if (!t || countries.includes(t)) return;
    setValue("country_availability", [...countries, t], { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <SectionCard title="ET Program">
        <div className="grid gap-4 sm:grid-cols-2">
          <RhfSelect
            name="et_details.et_status"
            label="ET status"
            options={ET_STATUS_OPTIONS}
          />
          <RhfSelect
            name="et_details.embryo_availability"
            label="Embryo availability"
            options={EMBRYO_AVAILABILITY_OPTIONS}
          />
          <RhfTextField
            name="et_details.clinic_name"
            label="Reproductive clinic"
            placeholder="Clinic name"
          />
          <RhfTextField
            name="et_details.clinic_location"
            label="Clinic location"
            placeholder="City, Country"
          />
          <RhfTextField
            name="et_details.embryo_fee"
            label="Embryo fee"
            type="number"
          />
          <RhfCurrencySelect
            name="et_details.embryo_fee_currency"
            label="Embryo fee currency"
          />
          <RhfTextField
            name="et_details.last_verified_at"
            label="Last verified date"
            type="date"
            hint="Listings unconfirmed for over 12 months show an unconfirmed flag."
          />
        </div>
        <RhfTextarea
          name="et_details.flush_history"
          label="Flush history summary"
          rows={3}
          placeholder="e.g. 2024: 1 viable embryo"
        />
        <div className="mt-4 flex items-center gap-2">
          <input
            id="et-international-availability"
            type="checkbox"
            checked={internationalAvailability === true}
            onChange={(e) =>
              setValue("et_details.international_availability", e.target.checked, {
                shouldDirty: true,
              })
            }
            className="rounded border-slate-600"
          />
          <label
            htmlFor="et-international-availability"
            className="text-sm text-slate-300"
          >
            International availability
          </label>
        </div>
        <div className="mt-4">
          <FieldLabel>Country availability</FieldLabel>
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
      <SectionCard title="Admin notes">
        <RhfTextarea
          name="et_details.admin_notes"
          label="Notes"
          rows={4}
          hint="Admin only — never shown publicly."
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
      />
    </div>
  );
}
