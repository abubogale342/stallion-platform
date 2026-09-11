"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { updatePerformanceRecord } from "@/services/performance";
import type { FormPerformanceRow, StallionFormValues } from "@/types/stallion-form";
import { createEmptyPerformanceRow } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { PerformanceRecordFields } from "./AddPerformanceRecordModal";

type EditPerformanceRecordModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditPerformanceRecordModal({
  open,
  onClose,
  rowIndex,
}: EditPerformanceRecordModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row =
    rowIndex != null ? watch(`performance_records.${rowIndex}`) : null;
  const [fields, setFields] = useState(createEmptyPerformanceRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyPerformanceRow(row.id), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updatePerformanceRecord(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`performance_records.${rowIndex}`, result.record, {
      shouldDirty: true,
    });
    onClose();
  };

  const title = row
    ? `Edit performance — ${row.event.trim() || row.achievement.trim() || "record"}`
    : "Edit performance record";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
      {row ? (
        <div className="space-y-4">
          <PerformanceRecordFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
