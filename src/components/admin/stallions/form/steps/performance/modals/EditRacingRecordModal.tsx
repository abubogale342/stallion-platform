"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { updateRacingResult } from "@/services/racing";
import type { FormRacingRow, StallionFormValues } from "@/types/stallion-form";
import { createEmptyRacingRow } from "@/utils/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { RacingRecordFields } from "./AddRacingRecordModal";

type EditRacingRecordModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditRacingRecordModal({
  open,
  onClose,
  rowIndex,
}: EditRacingRecordModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row = rowIndex != null ? watch(`racing_records.${rowIndex}`) : null;
  const [fields, setFields] = useState(createEmptyRacingRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyRacingRow(row.id), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateRacingResult(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`racing_records.${rowIndex}`, result.record, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit race — ${row.race_name.trim() || "result"}`
    : "Edit racing result";

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
          <RacingRecordFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
