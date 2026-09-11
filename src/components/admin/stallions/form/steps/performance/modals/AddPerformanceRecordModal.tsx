"use client";

import { useEffect, useState } from "react";
import {
  createPerformanceRecord,
  PERFORMANCE_RECORD_MONTHS,
} from "@/services/performance";
import type { FormPerformanceRow, StallionFormValues } from "@/types/stallion-form";
import { createEmptyPerformanceRow } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Select from "@/ui/Select";
import Textarea from "@/ui/Textarea";
import { currencySelectOptions } from "@/utils/common";
import { useFormContext } from "react-hook-form";

type AddPerformanceRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormPerformanceRow) => void;
};

function PerformanceRecordFields({
  fields,
  onChange,
}: {
  fields: FormPerformanceRow;
  onChange: (next: FormPerformanceRow) => void;
}) {
  const set = (key: keyof FormPerformanceRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label variant="admin" required>
          Event
        </Label>
        <Input
          className="mt-1.5"
          value={fields.event}
          onChange={(e) => set("event", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin" required>
          Achievement
        </Label>
        <Input
          className="mt-1.5"
          value={fields.achievement}
          onChange={(e) => set("achievement", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Year</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.year}
          onChange={(e) => set("year", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Month</Label>
        <Select
          className="mt-1.5"
          value={fields.month}
          onChange={(e) => set("month", e.target.value)}
        >
          <option value="">—</option>
          {PERFORMANCE_RECORD_MONTHS.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label variant="admin">Discipline</Label>
        <Input
          className="mt-1.5"
          value={fields.discipline}
          onChange={(e) => set("discipline", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Class</Label>
        <Input
          className="mt-1.5"
          value={fields.class}
          onChange={(e) => set("class", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Association</Label>
        <Input
          className="mt-1.5"
          value={fields.association}
          onChange={(e) => set("association", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Level</Label>
        <Input
          className="mt-1.5"
          value={fields.level}
          onChange={(e) => set("level", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Score</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.score}
          onChange={(e) => set("score", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Earnings</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.earnings}
          onChange={(e) => set("earnings", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Currency</Label>
        <Select
          className="mt-1.5"
          value={fields.currency}
          onChange={(e) => set("currency", e.target.value)}
        >
          {currencySelectOptions({
            allowEmpty: true,
            include: fields.currency,
          }).map((opt) => (
            <option key={opt.value || "__empty"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {/*
        Milestone 17. These columns have existed on the table since the
        performance-records expansion migration but were never editable, so
        anything the agent wrote into them was invisible here.
      */}
      <div>
        <Label variant="admin">Starts</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.starts}
          onChange={(e) => set("starts", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Firsts</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.firsts}
          onChange={(e) => set("firsts", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Seconds</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.seconds}
          onChange={(e) => set("seconds", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Thirds</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.thirds}
          onChange={(e) => set("thirds", e.target.value)}
        />
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
        <Label variant="admin">Reference</Label>
        <Input
          className="mt-1.5"
          value={fields.reference}
          onChange={(e) => set("reference", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Judges</Label>
        <Input
          className="mt-1.5"
          value={fields.judges}
          onChange={(e) => set("judges", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Performance summary</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={fields.performance_summary}
          onChange={(e) => set("performance_summary", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Comments</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={fields.comments}
          onChange={(e) => set("comments", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function AddPerformanceRecordModal({
  open,
  onClose,
  onCreated,
}: AddPerformanceRecordModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const [fields, setFields] = useState(createEmptyPerformanceRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(createEmptyPerformanceRow());
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createPerformanceRecord(stallionId, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(result.record);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add performance record"
      size="lg"
      preventClose={saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={saving}
            className="border border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            disabled={!fields.event.trim() && !fields.achievement.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <PerformanceRecordFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}

export { PerformanceRecordFields };
