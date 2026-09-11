"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { createFoalCrop } from "@/services/progeny";
import type { FormFoalCropRow, StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";

const EMPTY_FOAL_CROP: FormFoalCropRow = {
  id: "",
  foal_crop_year: "",
  number_of_foals: "",
};

type AddFoalCropModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormFoalCropRow) => void;
};

function FoalCropFields({
  fields,
  onChange,
}: {
  fields: FormFoalCropRow;
  onChange: (next: FormFoalCropRow) => void;
}) {
  const set = (key: keyof FormFoalCropRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label variant="admin" required>
          Foal crop year
        </Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.foal_crop_year}
          onChange={(e) => set("foal_crop_year", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Number of foals</Label>
        <Input
          className="mt-1.5"
          type="number"
          value={fields.number_of_foals}
          onChange={(e) => set("number_of_foals", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function AddFoalCropModal({
  open,
  onClose,
  onCreated,
}: AddFoalCropModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const [fields, setFields] = useState(EMPTY_FOAL_CROP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(EMPTY_FOAL_CROP);
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createFoalCrop(stallionId, fields);
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
      title="Add foal crop"
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
            disabled={!fields.foal_crop_year.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FoalCropFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}

export { FoalCropFields, EMPTY_FOAL_CROP };
