"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { createRacingResult } from "@/services/racing";
import type { FormRacingRow, StallionFormValues } from "@/types/stallion-form";
import { createEmptyRacingRow } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Select from "@/ui/Select";
import Textarea from "@/ui/Textarea";
import { currencySelectOptions } from "@/utils/common";

type AddRacingRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormRacingRow) => void;
};

function RacingRecordFields({
  fields,
  onChange,
}: {
  fields: FormRacingRow;
  onChange: (next: FormRacingRow) => void;
}) {
  const set = (key: keyof FormRacingRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label variant="admin">Race name</Label>
        <Input
          className="mt-1.5"
          value={fields.race_name}
          onChange={(e) => set("race_name", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Race date</Label>
        <Input
          className="mt-1.5"
          type="date"
          value={fields.race_date}
          onChange={(e) => set("race_date", e.target.value)}
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
        <Label variant="admin">Track</Label>
        <Input
          className="mt-1.5"
          value={fields.track}
          onChange={(e) => set("track", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Distance</Label>
        <Input
          className="mt-1.5"
          value={fields.distance}
          onChange={(e) => set("distance", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Finish position</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.finish_position}
          onChange={(e) => set("finish_position", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Speed index</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.speed_index}
          onChange={(e) => set("speed_index", e.target.value)}
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
            allowEmpty: false,
            include: fields.currency,
          }).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Milestone 17: columns present since the racing tables migration. */}
      <div>
        <Label variant="admin">Race number</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.race_number}
          onChange={(e) => set("race_number", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Result note</Label>
        <Input
          className="mt-1.5"
          value={fields.result_note}
          onChange={(e) => set("result_note", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Chart URL</Label>
        <Input
          className="mt-1.5"
          type="url"
          value={fields.chart_url}
          onChange={(e) => set("chart_url", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Video URL</Label>
        <Input
          className="mt-1.5"
          type="url"
          value={fields.video_url}
          onChange={(e) => set("video_url", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Admin notes</Label>
        <Textarea
          className="mt-1.5"
          rows={2}
          value={fields.admin_notes}
          onChange={(e) => set("admin_notes", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function AddRacingRecordModal({
  open,
  onClose,
  onCreated,
}: AddRacingRecordModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const [fields, setFields] = useState(createEmptyRacingRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(createEmptyRacingRow());
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createRacingResult(stallionId, fields);
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
      title="Add racing result"
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
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <RacingRecordFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}

export { RacingRecordFields };
