"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createColourTest,
  createEmptyColourTestRow,
} from "@/services/health";
import type { FormColourTestRow, StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Textarea from "@/ui/Textarea";

export function ColourTestFields({
  fields,
  onChange,
}: {
  fields: FormColourTestRow;
  onChange: (next: FormColourTestRow) => void;
}) {
  const set = (key: keyof FormColourTestRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label variant="admin" required>
          Test
        </Label>
        <Input
          className="mt-1.5"
          value={fields.colour_test}
          onChange={(e) => set("colour_test", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin" required>
          Result
        </Label>
        <Input
          className="mt-1.5"
          value={fields.result}
          onChange={(e) => set("result", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Gene code</Label>
        <Input
          className="mt-1.5"
          value={fields.gene_code}
          onChange={(e) => set("gene_code", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Source</Label>
        <Input
          className="mt-1.5"
          value={fields.source}
          onChange={(e) => set("source", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label variant="admin">Admin notes</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={fields.admin_notes}
          onChange={(e) => set("admin_notes", e.target.value)}
        />
      </div>
    </div>
  );
}

type AddColourTestModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormColourTestRow) => void;
};

export default function AddColourTestModal({
  open,
  onClose,
  onCreated,
}: AddColourTestModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const [fields, setFields] = useState(createEmptyColourTestRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(createEmptyColourTestRow());
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createColourTest(stallionId, fields);
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
      title="Add colour test"
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
      <div className="space-y-4">
        <ColourTestFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}
