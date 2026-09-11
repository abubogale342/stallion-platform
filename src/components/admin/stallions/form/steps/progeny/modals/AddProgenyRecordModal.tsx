"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { createProgenyRecord } from "@/services/progeny";
import type { FormProgenyRow, StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";

const EMPTY_PROGENY: FormProgenyRow = {
  id: "",
  progeny_name: "",
  year: "",
  association: "",
  event: "",
  discipline: "",
  achievement: "",
  total_earnings: "",
};

type AddProgenyRecordModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormProgenyRow) => void;
};

function ProgenyRecordFields({
  fields,
  onChange,
}: {
  fields: FormProgenyRow;
  onChange: (next: FormProgenyRow) => void;
}) {
  const set = (key: keyof FormProgenyRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label variant="admin" required>
          Progeny name
        </Label>
        <Input
          className="mt-1.5"
          value={fields.progeny_name}
          onChange={(e) => set("progeny_name", e.target.value)}
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
        <Label variant="admin">Discipline</Label>
        <Input
          className="mt-1.5"
          value={fields.discipline}
          onChange={(e) => set("discipline", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Achievement</Label>
        <Input
          className="mt-1.5"
          value={fields.achievement}
          onChange={(e) => set("achievement", e.target.value)}
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
        <Label variant="admin">Event</Label>
        <Input
          className="mt-1.5"
          value={fields.event}
          onChange={(e) => set("event", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Total earnings</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.total_earnings}
          onChange={(e) => set("total_earnings", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function AddProgenyRecordModal({
  open,
  onClose,
  onCreated,
}: AddProgenyRecordModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const [fields, setFields] = useState(EMPTY_PROGENY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(EMPTY_PROGENY);
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createProgenyRecord(stallionId, fields);
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
      title="Add notable progeny"
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
            disabled={!fields.progeny_name.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ProgenyRecordFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}

export { ProgenyRecordFields, EMPTY_PROGENY };
