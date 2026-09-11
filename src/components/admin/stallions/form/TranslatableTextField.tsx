"use client";

import { useState } from "react";
import type { FieldPath, RegisterOptions } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import type { StallionFormValues } from "@/types/stallion-form";
import type { TranslationIdentityFieldKey } from "@/types/stallion-translations";
import Input from "@/ui/Input";
import Textarea from "@/ui/Textarea";
import HelperText from "@/ui/HelperText";
import { FieldLabel, FormError, RhfTextField } from "./fields";
import { useStallionTranslation } from "./StallionTranslationContext";

type TranslatableEnglishField = Extract<
  FieldPath<StallionFormValues>,
  "coat_colour"
>;

type TranslatableTextFieldProps = {
  englishName?: TranslatableEnglishField;
  englishPreview?: string;
  translationKey: TranslationIdentityFieldKey;
  label: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  translationHint?: string;
  rules?: RegisterOptions<StallionFormValues, TranslatableEnglishField>;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50";

export default function TranslatableTextField({
  englishName,
  englishPreview,
  translationKey,
  label,
  multiline = false,
  rows = 3,
  placeholder,
  hint,
  translationHint,
  rules,
}: TranslatableTextFieldProps) {
  const [tab, setTab] = useState<"en" | "pt-BR">("en");
  const { canEditTranslation, loading, values, updateIdentityField } =
    useStallionTranslation();

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
          {englishName ? (
            <RhfTextField
              name={englishName}
              label=""
              placeholder={placeholder}
              rules={rules}
            />
          ) : (
            <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
              {englishPreview?.trim() || "—"}
            </p>
          )}
          {hint ? <HelperText>{hint}</HelperText> : null}
          {englishName ? <FormError name={englishName} /> : null}
        </>
      ) : (
        <>
          {!canEditTranslation ? (
            <p className="text-sm text-slate-500">
              Save the identity step first to add Portuguese content.
            </p>
          ) : loading ? (
            <p className="text-sm text-slate-500">Loading translation…</p>
          ) : multiline ? (
            <textarea
              rows={rows}
              placeholder={placeholder}
              value={values[translationKey]}
              onChange={(e) => updateIdentityField(translationKey, e.target.value)}
              className={inputClass}
            />
          ) : (
            <Input
              className="mt-0"
              value={values[translationKey]}
              placeholder={placeholder}
              onChange={(e) => updateIdentityField(translationKey, e.target.value)}
            />
          )}
          {englishPreview ? (
            <HelperText>English source: {englishPreview}</HelperText>
          ) : null}
          {translationHint ? <HelperText>{translationHint}</HelperText> : null}
        </>
      )}
    </div>
  );
}
