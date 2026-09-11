"use client";

import { useEffect, useState } from "react";
import {
  updateOwnerRecord,
  updateStallionOwnerLink,
} from "@/services/owner";
import type { FormOwnerLink } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import { formLinkToOwnerFields } from "@/utils/owner";
import { useOwnersStep } from "../OwnersStepContext";
import { OwnerFields } from "../OwnerFields";

type EditOwnerModalProps = {
  open: boolean;
  onClose: () => void;
  linkIndex: number | null;
};

export default function EditOwnerModal({
  open,
  onClose,
  linkIndex,
}: EditOwnerModalProps) {
  const { stallionId, links, setLinks } = useOwnersStep();
  const link = linkIndex != null ? links[linkIndex] : null;

  const [fields, setFields] = useState<FormOwnerLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !link) return;
    setFields({ ...link });
    setError(null);
  }, [open, link]);

  const handleSave = async () => {
    if (!fields || linkIndex == null || !link?.owner_id?.trim()) {
      setError("Owner record is missing.");
      return;
    }
    if (!stallionId) {
      setError("Stallion id is missing. Save the draft first.");
      return;
    }
    if (!fields.owner_name.trim()) {
      setError("Owner name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const updateResult = await updateOwnerRecord(
      link.owner_id,
      formLinkToOwnerFields(fields)
    );
    if (!updateResult.ok) {
      setError(updateResult.error);
      setSaving(false);
      return;
    }

    const linkResult = await updateStallionOwnerLink(stallionId, link.owner_id, {
      public_display_name_only: fields.public_display_name_only,
    });
    if (!linkResult.ok) {
      setError(linkResult.error);
      setSaving(false);
      return;
    }

    setLinks((current) =>
      current.map((entry, index) =>
        index === linkIndex
          ? {
              ...fields,
              owner_id: link.owner_id,
              tempId: entry.tempId,
            }
          : entry
      )
    );

    setSaving(false);
    onClose();
  };

  const title = link
    ? `Edit owner — ${link.owner_name.trim() || "owner"}`
    : "Edit owner";

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
            className="border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            disabled={!fields?.owner_name.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      {fields ? (
        <div className="space-y-4">
          <OwnerFields fields={fields} onChange={setFields} />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No owner selected.</p>
      )}
    </Modal>
  );
}
