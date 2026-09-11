"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createEmptyBreedingProviderRow,
  updateBreedingServiceProvider,
} from "@/services/breeding";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import {
  BreedingProviderFields,
} from "./AddBreedingProviderModal";

type EditBreedingProviderModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditBreedingProviderModal({
  open,
  onClose,
  rowIndex,
}: EditBreedingProviderModalProps) {
  const { watch, setValue } = useFormContext<StallionFormValues>();
  const row =
    rowIndex != null ? watch(`breeding_service_providers.${rowIndex}`) : null;
  const [fields, setFields] = useState(createEmptyBreedingProviderRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setFields({ ...createEmptyBreedingProviderRow(row.id), ...row });
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id?.trim() || rowIndex == null) {
      setError("Record id is missing.");
      return;
    }
    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateBreedingServiceProvider(row.id, fields);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(`breeding_service_providers.${rowIndex}`, result.record, {
      shouldDirty: true,
    });
    onClose();
  };

  const title = row
    ? `Edit provider — ${row.name.trim() || "provider"}`
    : "Edit breeding service provider";

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
          <BreedingProviderFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No record selected.</p>
      )}
    </Modal>
  );
}
