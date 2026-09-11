"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createBreedingServiceProvider,
  createEmptyBreedingProviderRow,
} from "@/services/breeding";
import type {
  FormBreedingProviderRow,
  StallionFormValues,
} from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Textarea from "@/ui/Textarea";
import Modal from "@/ui/Modal";

export function BreedingProviderFields({
  fields,
  onChange,
}: {
  fields: FormBreedingProviderRow;
  onChange: (next: FormBreedingProviderRow) => void;
}) {
  const set = (key: keyof FormBreedingProviderRow, value: string) =>
    onChange({ ...fields, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label variant="admin" required>
          Name
        </Label>
        <Input
          className="mt-1.5"
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Contact name</Label>
        <Input
          className="mt-1.5"
          value={fields.contact_name}
          onChange={(e) => set("contact_name", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Country</Label>
        <Input
          className="mt-1.5"
          value={fields.country}
          onChange={(e) => set("country", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Website</Label>
        <Input
          className="mt-1.5"
          value={fields.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Email</Label>
        <Input
          className="mt-1.5"
          type="email"
          value={fields.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div>
        <Label variant="admin">Phone</Label>
        <Input
          className="mt-1.5"
          value={fields.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>
      {/*
        Milestone 17. Staff-only provenance, matching the admin_notes column
        every other agent-written table already had.
      */}
      <div className="sm:col-span-2">
        <Label variant="admin">Admin notes</Label>
        <Textarea
          className="mt-1.5"
          rows={2}
          value={fields.admin_notes}
          onChange={(e) => set("admin_notes", e.target.value)}
        />
      </div>
    </div>
  );
}

type AddBreedingProviderModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (record: FormBreedingProviderRow) => void;
};

export default function AddBreedingProviderModal({
  open,
  onClose,
  onCreated,
}: AddBreedingProviderModalProps) {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const providerCount = (watch("breeding_service_providers") ?? []).length;
  const [fields, setFields] = useState(createEmptyBreedingProviderRow());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFields(createEmptyBreedingProviderRow());
    setError(null);
  }, [open]);

  const handleSave = async () => {
    if (!stallionId) {
      setError("Stallion id is missing.");
      return;
    }
    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createBreedingServiceProvider(
      stallionId,
      fields,
      providerCount
    );
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
      title="Add breeding service provider"
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
      <div className="space-y-4">
        <BreedingProviderFields fields={fields} onChange={setFields} />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
    </Modal>
  );
}
