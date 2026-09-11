"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { updateFoalCrop } from "@/services/progeny";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { EMPTY_FOAL_CROP, FoalCropFields } from "./AddFoalCropModal";

type EditFoalCropModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditFoalCropModal({
  open,
  onClose,
  rowIndex,
}: EditFoalCropModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row = rowIndex != null ? watch(`foal_crops.${rowIndex}`) : null;
  const [fields, setFields] = useState(EMPTY_FOAL_CROP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...EMPTY_FOAL_CROP, ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateFoalCrop(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`foal_crops.${rowIndex}`, result.record, { shouldDirty: true });
    onClose();
  };

  const title = row
    ? `Edit foal crop — ${row.foal_crop_year.trim() || "year"}`
    : "Edit foal crop";

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
          <FoalCropFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
