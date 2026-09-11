"use client";

import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import {
  formatSemenMethodBilingualLabel,
  getSemenAvailabilityLabels,
} from "@/utils/semen-availability-i18n";
import Input from "@/ui/Input";
import HelperText from "@/ui/HelperText";
import { FieldLabel } from "../../fields";
import { useStallionTranslation } from "../../StallionTranslationContext";

export default function BreedingMethodLabelsEditor() {
  const { watch } = useFormContext<StallionFormValues>();
  const methods = watch("semen_availability") ?? [];
  const {
    canEditTranslation,
    loading,
    values,
    updateBreedingMethodLabel,
  } = useStallionTranslation();

  if (methods.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/20 p-3">
      <FieldLabel>Portuguese method labels (pt-BR)</FieldLabel>
      <HelperText>
        Optional overrides saved to the profile translation. Leave blank to use
        the standard site Portuguese labels on public profiles.
      </HelperText>

      {!canEditTranslation ? (
        <p className="mt-3 text-sm text-slate-500">
          Save the stallion first to add Portuguese method labels.
        </p>
      ) : loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading translation…</p>
      ) : (
        <div className="mt-3 space-y-3">
          {methods.map((method) => {
            const { ptBR } = getSemenAvailabilityLabels(method);
            const dbLabel = values.breeding_method_labels[method] ?? "";
            return (
              <label key={method} className="block">
                <span className="mb-1 block text-xs text-slate-400">
                  {formatSemenMethodBilingualLabel(method, dbLabel)}
                </span>
                <Input
                  value={dbLabel}
                  placeholder={ptBR}
                  onChange={(e) =>
                    updateBreedingMethodLabel(method, e.target.value)
                  }
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
