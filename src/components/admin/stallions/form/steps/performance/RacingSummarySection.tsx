"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { racingSummaryHasData, upsertRacingSummary } from "@/services/racing";
import type { FormRacingSummary, StallionFormValues } from "@/types/stallion-form";
import { normalizeRacingSummary } from "@/utils/stallion";
import { currencySelectOptions } from "@/utils/common";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Textarea from "@/ui/Textarea";
import Label from "@/ui/Label";
import Select from "@/ui/Select";
import SectionCard from "../../SectionCard";

const VIEW_FIELDS: {
  key: keyof FormRacingSummary;
  label: string;
  format?: (value: string, summary: FormRacingSummary) => string;
}[] = [
  { key: "career_starts", label: "Starts" },
  { key: "career_firsts", label: "Firsts" },
  { key: "career_seconds", label: "Seconds" },
  { key: "career_thirds", label: "Thirds" },
  {
    key: "career_earnings",
    label: "Career earnings",
    format: (value, summary) => {
      const currency = summary.career_earnings_currency.trim();
      return currency ? `${value} ${currency}` : value;
    },
  },
  { key: "highest_rating", label: "Highest rating" },
  { key: "earnings_per_start", label: "Earnings per start" },
  { key: "source", label: "Source" },
  { key: "admin_notes", label: "Admin notes" },
];

function RacingSummaryFields({
  fields,
  onChange,
}: {
  fields: FormRacingSummary;
  onChange: (next: FormRacingSummary) => void;
}) {
  const set = (key: keyof FormRacingSummary, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label variant="admin">Starts</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.career_starts}
            onChange={(e) => set("career_starts", e.target.value)}
          />
        </div>
        <div>
          <Label variant="admin">Firsts</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.career_firsts}
            onChange={(e) => set("career_firsts", e.target.value)}
          />
        </div>
        <div>
          <Label variant="admin">Seconds</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.career_seconds}
            onChange={(e) => set("career_seconds", e.target.value)}
          />
        </div>
        <div>
          <Label variant="admin">Thirds</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.career_thirds}
            onChange={(e) => set("career_thirds", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 border-t border-slate-800/80 pt-4 sm:grid-cols-2">
        <div>
          <Label variant="admin">Career earnings</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.career_earnings}
            onChange={(e) => set("career_earnings", e.target.value)}
          />
        </div>
        <div>
          <Label variant="admin">Career earnings currency</Label>
          <Select
            className="mt-1.5"
            value={fields.career_earnings_currency}
            onChange={(e) => set("career_earnings_currency", e.target.value)}
          >
            {currencySelectOptions({
              allowEmpty: false,
              include: fields.career_earnings_currency,
            }).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label variant="admin">Highest rating</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.highest_rating}
            onChange={(e) => set("highest_rating", e.target.value)}
          />
        </div>
        <div>
          <Label variant="admin">Source</Label>
          <Input
            className="mt-1.5"
            value={fields.source}
            onChange={(e) => set("source", e.target.value)}
          />
        </div>
        {/*
          Milestone 17. earnings_per_start is stored, not derived: the agent
          reports the figure its source gives rather than dividing career
          earnings by starts, and the two can legitimately differ.
        */}
        <div>
          <Label variant="admin">Earnings per start</Label>
          <Input
            className="mt-1.5"
            type="number"
            value={fields.earnings_per_start}
            onChange={(e) => set("earnings_per_start", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Label variant="admin">Admin notes</Label>
          <Textarea
            className="mt-1.5"
            rows={2}
            value={fields.admin_notes}
            onChange={(e) => set("admin_notes", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function RacingSummaryView({ summary }: { summary: FormRacingSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {VIEW_FIELDS.map(({ key, label, format }) => {
        const raw = summary[key].trim();
        const display = raw
          ? format
            ? format(raw, summary)
            : raw
          : "—";
        return (
          <div key={key}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-sm text-slate-100">{display}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function RacingSummarySection() {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const savedSummary = normalizeRacingSummary(watch("racing_summary"));
  const hasData = racingSummaryHasData(savedSummary);

  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<FormRacingSummary>(savedSummary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setFields(savedSummary);
    }
  }, [savedSummary, editing]);

  const openEditor = () => {
    setFields(savedSummary);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setFields(savedSummary);
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
    const normalized = normalizeRacingSummary(fields);
    const result = await upsertRacingSummary(stallionId, normalized);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue("racing_summary", normalized, { shouldDirty: true });
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
      Add racing summary
    </Button>
  );

  return (
    <SectionCard title="Racing summary" headerAction={headerAction}>
      <p className="text-xs text-slate-500">
        Career record totals; saved immediately when you add or edit.
      </p>

      {editing ? (
        <div className="space-y-4">
          <RacingSummaryFields fields={fields} onChange={setFields} />
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
        <RacingSummaryView summary={savedSummary} />
      ) : (
        <p className="text-sm text-slate-500">Not set</p>
      )}
    </SectionCard>
  );
}
