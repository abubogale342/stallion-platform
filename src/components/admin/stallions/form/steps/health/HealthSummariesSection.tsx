"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  healthSummariesHasData,
  updateHealthSummaries,
} from "@/services/health";
import type { FormHealthSummaries, StallionFormValues } from "@/types/stallion-form";
import { normalizeHealthSummaries } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Label from "@/ui/Label";
import Textarea from "@/ui/Textarea";
import SectionCard from "../../SectionCard";

const VIEW_FIELDS: { key: keyof FormHealthSummaries; label: string }[] = [
  { key: "genetic_disease_testing_results", label: "Disease testing" },
  { key: "genetic_testing_results", label: "Genetic testing summary" },
  { key: "colour_testing_results", label: "Colour testing summary" },
  { key: "genetic_test_results_summary", label: "Verification notes" },
];

function HealthSummariesFields({
  fields,
  onChange,
}: {
  fields: FormHealthSummaries;
  onChange: (next: FormHealthSummaries) => void;
}) {
  const set = (key: keyof FormHealthSummaries, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {VIEW_FIELDS.map(({ key, label }) => (
        <div key={key} className="sm:col-span-2">
          <Label variant="admin">{label}</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={fields[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function HealthSummariesView({ summaries }: { summaries: FormHealthSummaries }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {VIEW_FIELDS.map(({ key, label }) => {
        const raw = summaries[key].trim();
        return (
          <div key={key} className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-100">
              {raw || "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function HealthSummariesSection() {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const savedSummaries = normalizeHealthSummaries({
    genetic_disease_testing_results: watch("genetic_disease_testing_results"),
    genetic_testing_results: watch("genetic_testing_results"),
    colour_testing_results: watch("colour_testing_results"),
    genetic_test_results_summary: watch("genetic_test_results_summary"),
  });
  const hasData = healthSummariesHasData(savedSummaries);

  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<FormHealthSummaries>(savedSummaries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setFields(savedSummaries);
    }
  }, [savedSummaries, editing]);

  const openEditor = () => {
    setFields(savedSummaries);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setFields(savedSummaries);
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const normalized = normalizeHealthSummaries(fields);
    const result = await updateHealthSummaries(stallionId, normalized);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(
      "genetic_disease_testing_results",
      normalized.genetic_disease_testing_results,
      { shouldDirty: true }
    );
    setValue("genetic_testing_results", normalized.genetic_testing_results, {
      shouldDirty: true,
    });
    setValue("colour_testing_results", normalized.colour_testing_results, {
      shouldDirty: true,
    });
    setValue(
      "genetic_test_results_summary",
      normalized.genetic_test_results_summary,
      { shouldDirty: true }
    );
    setEditing(false);
  };

  const headerAction = editing ? null : hasData ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={openEditor}
      className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
    >
      Edit
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={openEditor}
      className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
    >
      Add health summaries
    </Button>
  );

  return (
    <SectionCard title="Health summaries" headerAction={headerAction}>
      <p className="text-xs text-slate-500">
        Summary text shown on the public profile; saved immediately when you add
        or edit.
      </p>

      {editing ? (
        <div className="space-y-4">
          <HealthSummariesFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800/80 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="border border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      ) : hasData ? (
        <HealthSummariesView summaries={savedSummaries} />
      ) : (
        <p className="text-sm text-slate-500">Not set</p>
      )}
    </SectionCard>
  );
}
