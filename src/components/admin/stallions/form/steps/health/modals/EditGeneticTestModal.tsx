"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createEmptyGeneticTestRow,
  updateGeneticTest,
} from "@/services/health";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { GeneticTestFields } from "./AddGeneticTestModal";

type EditGeneticTestModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditGeneticTestModal({
  open,
  onClose,
  rowIndex,
}: EditGeneticTestModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row = rowIndex != null ? watch(`genetic_tests.${rowIndex}`) : null;
  const [fields, setFields] = useState(createEmptyGeneticTestRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyGeneticTestRow(row.id), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateGeneticTest(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`genetic_tests.${rowIndex}`, result.record, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit genetic test — ${row.test_type.trim() || "test"}`
    : "Edit genetic test";

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
            disabled={!fields.test_type.trim() || !fields.result.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      {row ? (
        <div className="space-y-4">
          <GeneticTestFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
