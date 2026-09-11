"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  breedingStatisticsHasData,
  updateBreedingStatistics,
} from "@/services/progeny";
import type { FormBreedingStatistics, StallionFormValues } from "@/types/stallion-form";
import { normalizeBreedingStatistics } from "@/utils/stallion";
import { currencySelectOptions } from "@/utils/common";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Select from "@/ui/Select";
import SectionCard from "../../SectionCard";

const VIEW_FIELDS: {
  key: keyof FormBreedingStatistics;
  label: string;
  format?: (value: string, stats: FormBreedingStatistics) => string;
}[] = [
  { key: "total_registered_progeny", label: "Total registered progeny" },
  {
    key: "progeny_started_in_competition",
    label: "Progeny started in competition",
  },
  { key: "performance_earners", label: "Performance earners" },
  {
    key: "total_reported_offspring_earnings",
    label: "Total offspring earnings",
    format: (value, stats) => {
      const currency = stats.total_reported_offspring_earnings_currency.trim();
      return currency ? `${value} ${currency}` : value;
    },
  },
];

function BreedingStatisticsFields({
  fields,
  onChange,
}: {
  fields: FormBreedingStatistics;
  onChange: (next: FormBreedingStatistics) => void;
}) {
  const set = (key: keyof FormBreedingStatistics, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label variant="admin">Total registered progeny</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.total_registered_progeny}
          onChange={(e) => set("total_registered_progeny", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Progeny started in competition</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.progeny_started_in_competition}
          onChange={(e) =>
            set("progeny_started_in_competition", e.target.value)
          }
        />
      </div>
      <div>
        <Label variant="admin">Performance earners</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.performance_earners}
          onChange={(e) => set("performance_earners", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Total offspring earnings</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.total_reported_offspring_earnings}
          onChange={(e) =>
            set("total_reported_offspring_earnings", e.target.value)
          }
        />
      </div>
      <div>
        <Label variant="admin">Offspring earnings currency</Label>
        <Select
          className="mt-1.5"
          value={fields.total_reported_offspring_earnings_currency}
          onChange={(e) =>
            set("total_reported_offspring_earnings_currency", e.target.value)
          }
        >
          {currencySelectOptions({
            allowEmpty: false,
            include: fields.total_reported_offspring_earnings_currency,
          }).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function BreedingStatisticsView({ stats }: { stats: FormBreedingStatistics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {VIEW_FIELDS.map(({ key, label, format }) => {
        const raw = stats[key].trim();
        const display = raw ? (format ? format(raw, stats) : raw) : "—";
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

export default function BreedingStatisticsSection() {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const savedStats = normalizeBreedingStatistics({
    total_registered_progeny: watch("total_registered_progeny"),
    progeny_started_in_competition: watch("progeny_started_in_competition"),
    performance_earners: watch("performance_earners"),
    total_reported_offspring_earnings: watch("total_reported_offspring_earnings"),
    total_reported_offspring_earnings_currency: watch(
      "total_reported_offspring_earnings_currency"
    ),
  });
  const hasData = breedingStatisticsHasData(savedStats);

  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<FormBreedingStatistics>(savedStats);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setFields(savedStats);
    }
  }, [savedStats, editing]);

  const openEditor = () => {
    setFields(savedStats);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setFields(savedStats);
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
    const normalized = normalizeBreedingStatistics(fields);
    const result = await updateBreedingStatistics(stallionId, normalized);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue("total_registered_progeny", normalized.total_registered_progeny, {
      shouldDirty: true,
    });
    setValue(
      "progeny_started_in_competition",
      normalized.progeny_started_in_competition,
      { shouldDirty: true }
    );
    setValue("performance_earners", normalized.performance_earners, {
      shouldDirty: true,
    });
    setValue(
      "total_reported_offspring_earnings",
      normalized.total_reported_offspring_earnings,
      { shouldDirty: true }
    );
    setValue(
      "total_reported_offspring_earnings_currency",
      normalized.total_reported_offspring_earnings_currency,
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
      Add breeding statistics
    </Button>
  );

  return (
    <SectionCard title="Breeding statistics" headerAction={headerAction}>
      <p className="text-xs text-slate-500">
        Aggregate progeny totals; saved immediately when you add or edit.
      </p>

      {editing ? (
        <div className="space-y-4">
          <BreedingStatisticsFields fields={fields} onChange={setFields} />
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
        <BreedingStatisticsView stats={savedStats} />
      ) : (
        <p className="text-sm text-slate-500">Not set</p>
      )}
    </SectionCard>
  );
}
