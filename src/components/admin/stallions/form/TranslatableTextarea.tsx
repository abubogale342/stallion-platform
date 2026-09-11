"use client";

import { useState } from "react";
import type { FieldPath, RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import Textarea from "@/ui/Textarea";
import HelperText from "@/ui/HelperText";
import {
  FieldLabel,
  FormError,
} from "./fields";
import {
  useStallionTranslation,
  type TranslationTextFieldKey,
} from "./StallionTranslationContext";

type TranslatableEnglishField = Extract<
  FieldPath<StallionFormValues>,
  "summary" | "performance_summary" | "breeding_notes"
>;

type TranslatableTextareaProps = {
  englishName: TranslatableEnglishField;
  translationKey: TranslationTextFieldKey;
  label: string;
  rows?: number;
  rules?: RegisterOptions<StallionFormValues, TranslatableEnglishField>;
  placeholder?: string;
  hint?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50";

export default function TranslatableTextarea({
  englishName,
  translationKey,
  label,
  rows = 4,
  rules,
  placeholder,
  hint,
}: TranslatableTextareaProps) {
  const { register } = useFormContext<StallionFormValues>();
  const {
    canEditTranslation,
    loading,
    values,
    updateField,
  } = useStallionTranslation();
  const [tab, setTab] = useState<"en" | "pt-BR">("en");

  const tabClass = (active: boolean) =>
    active
      ? "rounded-md bg-sky-950/60 px-3 py-1.5 text-xs font-medium text-sky-100 ring-1 ring-sky-500/40"
      : "rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200";

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/20 p-3">
      <FieldLabel>{label}</FieldLabel>
      <div
        className="mb-3 inline-flex flex-wrap gap-1 rounded-lg border border-slate-700/80 bg-slate-900/40 p-1"
        role="tablist"
        aria-label={`${label} language`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "en"}
          className={tabClass(tab === "en")}
          onClick={() => setTab("en")}
        >
          English
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pt-BR"}
          className={tabClass(tab === "pt-BR")}
          onClick={() => setTab("pt-BR")}
        >
          Português (pt-BR)
        </button>
      </div>

      {tab === "en" ? (
        <>
          <Textarea
            rows={rows}
            placeholder={placeholder}
            {...register(englishName, rules)}
          />
          {hint ? <HelperText>{hint}</HelperText> : null}
          <FormError name={englishName} />
        </>
      ) : (
        <>
          {!canEditTranslation ? (
            <p className="text-sm text-slate-500">
              Save the identity step first to add Portuguese content.
            </p>
          ) : loading ? (
            <p className="text-sm text-slate-500">Loading translation…</p>
          ) : (
            <textarea
              rows={rows}
              placeholder={placeholder}
              value={values[translationKey]}
              onChange={(e) => updateField(translationKey, e.target.value)}
              className={inputClass}
            />
          )}
          {hint ? (
            <HelperText>
              Portuguese saves automatically. It goes live when you publish the
              stallion, or immediately if the stallion is already published.
            </HelperText>
          ) : null}
        </>
      )}
    </div>
  );
}
