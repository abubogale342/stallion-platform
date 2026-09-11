"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { createEmptyStudFeeRow, saveStudFees } from "@/services/breeding";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { StudFeeFields } from "./AddStudFeeModal";

type EditStudFeeModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditStudFeeModal({
  open,
  onClose,
  rowIndex,
}: EditStudFeeModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const currentFees = watch("stud_fees") ?? [];
  const row = rowIndex != null ? currentFees[rowIndex] : null;
  const [fields, setFields] = useState(createEmptyStudFeeRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyStudFeeRow(row.tempId), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    if (rowIndex == null || !row) {
      setError("Record is missing.");
      return;
    }
    if (!fields.value.trim()) {
      setError("Amount is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const nextFees = [...currentFees];
    nextFees[rowIndex] = fields;
    const result = await saveStudFees(stallionId, nextFees);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`stud_fees.${rowIndex}`, fields, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit stud fee — ${row.value.trim() || "fee"}`
    : "Edit stud fee";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
      {row ? (
        <div className="space-y-4">
          <StudFeeFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
