"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createEmptyColourTestRow,
  updateColourTest,
} from "@/services/health";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { ColourTestFields } from "./AddColourTestModal";

type EditColourTestModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditColourTestModal({
  open,
  onClose,
  rowIndex,
}: EditColourTestModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row = rowIndex != null ? watch(`colour_tests.${rowIndex}`) : null;
  const [fields, setFields] = useState(createEmptyColourTestRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyColourTestRow(row.id), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateColourTest(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`colour_tests.${rowIndex}`, result.record, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit colour test — ${row.colour_test.trim() || "test"}`
    : "Edit colour test";

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
            disabled={!fields.colour_test.trim() || !fields.result.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      {row ? (
        <div className="space-y-4">
          <ColourTestFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
