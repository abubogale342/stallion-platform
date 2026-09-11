"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createEmptyStudFeeRow,
  saveStudFees,
} from "@/services/breeding";
import type { FormStudFeeRow, StallionFormValues } from "@/types/stallion-form";
import { studFeeCurrencySelectOptions } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Select from "@/ui/Select";

export function StudFeeFields({
  fields,
  onChange,
}: {
  fields: FormStudFeeRow;
  onChange: (next: FormStudFeeRow) => void;
}) {
  const set = (key: keyof FormStudFeeRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label variant="admin" required>
          Amount
        </Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.value}
          onChange={(e) => set("value", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Currency</Label>
        <Select
          className="mt-1.5"
          value={fields.currency}
          onChange={(e) => set("currency", e.target.value)}
        >
          {studFeeCurrencySelectOptions().map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

type AddStudFeeModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormStudFeeRow) => void;
};

export default function AddStudFeeModal({
  open,
  onClose,
  onCreated,
}: AddStudFeeModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const currentFees = watch("stud_fees") ?? [];
  const [fields, setFields] = useState(createEmptyStudFeeRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(createEmptyStudFeeRow());
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    if (!fields.value.trim()) {
      setError("Amount is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const nextFees = [...currentFees, fields];
    const result = await saveStudFees(stallionId, nextFees);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(fields);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add stud fee"
      size="md"
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
        <StudFeeFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}
