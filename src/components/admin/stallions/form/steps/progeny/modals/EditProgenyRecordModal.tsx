"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { updateProgenyRecord } from "@/services/progeny";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { EMPTY_PROGENY, ProgenyRecordFields } from "./AddProgenyRecordModal";

type EditProgenyRecordModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditProgenyRecordModal({
  open,
  onClose,
  rowIndex,
}: EditProgenyRecordModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row = rowIndex != null ? watch(`notable_progeny.${rowIndex}`) : null;
  const [fields, setFields] = useState(EMPTY_PROGENY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...EMPTY_PROGENY, ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateProgenyRecord(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`notable_progeny.${rowIndex}`, result.record, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit progeny — ${row.progeny_name.trim() || "record"}`
    : "Edit progeny record";

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
          <ProgenyRecordFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
