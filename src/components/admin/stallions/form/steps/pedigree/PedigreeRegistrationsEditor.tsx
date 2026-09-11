"use client";

import type { FormPedigreeRegistrationRow } from "@/types/stallion-form";
import {
  createEmptyPedigreeRegistration,
  ensureSinglePrimaryRegistration,
  formatPedigreeRegistrationLabel,
  normalizeRegistrationNumberInput,
  registrationRowHasContent,
} from "@/utils/pedigree";
import { FieldLabel } from "../../fields";
import { RepeatableList, RepeatableRowShell } from "../../repeatable";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

type PedigreeRegistrationsEditorProps = {
  registrations: FormPedigreeRegistrationRow[];
  onChange: (registrations: FormPedigreeRegistrationRow[]) => void;
  primaryRadioName?: string;
  showReview?: boolean;
};

export default function PedigreeRegistrationsEditor({
  registrations,
  onChange,
  primaryRadioName = "pedigree-reg-primary",
  showReview = true,
}: PedigreeRegistrationsEditorProps) {
  const reviewItems = registrations
    .map((reg, index) => ({
      index,
      reg,
      label: formatPedigreeRegistrationLabel(reg),
    }))
    .filter((item) => item.label);

  const setPrimary = (index: number) => {
    const tempId = registrations[index]?.tempId?.trim();
    if (!tempId) return;
    onChange(ensureSinglePrimaryRegistration(registrations, tempId));
  };

  const handleAdd = () => {
    const hasPrimary = registrations.some(
      (r) => r.is_primary && registrationRowHasContent(r)
    );
    onChange([
      ...registrations,
      createEmptyPedigreeRegistration({
        is_primary: !hasPrimary && registrations.length === 0,
      }),
    ]);
  };

  const updateRow = (
    index: number,
    patch: Partial<FormPedigreeRegistrationRow>
  ) => {
    onChange(
      registrations.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (index: number) => {
    onChange(registrations.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Registrations
      </p>

      {showReview && reviewItems.length > 0 ? (
        <ul className="space-y-1.5 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2">
          {reviewItems.map(({ index, reg, label }) => (
            <li
              key={reg.tempId}
              className="flex flex-wrap items-center gap-2 text-sm text-slate-200"
            >
              <span className="font-mono text-slate-300">{label}</span>
              {reg.is_primary ? (
                <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Primary
                </span>
              ) : null}
              <span className="sr-only">Row {index + 1}</span>
            </li>
          ))}
        </ul>
      ) : showReview ? (
        <p className="text-xs text-slate-500">No registrations yet.</p>
      ) : null}

      <RepeatableList
        title="Registration rows"
        onAdd={handleAdd}
        addLabel="Add registration"
      >
        {registrations.map((reg, index) => (
          <RepeatableRowShell
            key={reg.tempId}
            index={index}
            onRemove={() => removeRow(index)}
          >
            <div>
              <FieldLabel>association_name</FieldLabel>
              <input
                className={inputClass}
                value={reg.association_name}
                onChange={(e) =>
                  updateRow(index, { association_name: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>country</FieldLabel>
              <input
                className={inputClass}
                maxLength={2}
                placeholder="US"
                value={reg.country}
                onChange={(e) =>
                  updateRow(index, { country: e.target.value })
                }
                onBlur={(e) =>
                  updateRow(index, {
                    country: e.target.value.trim().toUpperCase(),
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>registration_number</FieldLabel>
              <input
                className={inputClass}
                placeholder="US-1234567"
                value={reg.registration_number}
                onChange={(e) =>
                  updateRow(index, { registration_number: e.target.value })
                }
                onBlur={(e) =>
                  updateRow(index, {
                    registration_number: normalizeRegistrationNumberInput(
                      e.target.value
                    ),
                  })
                }
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name={primaryRadioName}
                  className="border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500/30"
                  checked={Boolean(reg.is_primary)}
                  onChange={() => setPrimary(index)}
                />
                Primary registration
              </label>
            </div>
          </RepeatableRowShell>
        ))}
      </RepeatableList>
    </div>
  );
}
