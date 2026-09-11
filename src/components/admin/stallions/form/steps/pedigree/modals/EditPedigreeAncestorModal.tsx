"use client";

import { useEffect, useState } from "react";
import {
  replacePedigreeRegistrations,
  updatePedigreeRecord,
} from "@/services/pedigree";
import type { FormPedigreeRegistrationRow } from "@/types/stallion-form";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import { PEDIGREE_TYPE_LABELS } from "@/utils/common";
import { mapRegistrationsFromDb } from "@/utils/pedigree-form";
import { usePedigreeStep } from "../PedigreeStepContext";
import PedigreeRegistrationsEditor from "../PedigreeRegistrationsEditor";

type EditPedigreeAncestorModalProps = {
  open: boolean;
  onClose: () => void;
  rowIndex: number | null;
};

export default function EditPedigreeAncestorModal({
  open,
  onClose,
  rowIndex,
}: EditPedigreeAncestorModalProps) {
  const { rows, setRows } = usePedigreeStep();
  const row = rowIndex != null ? rows[rowIndex] : null;

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [height, setHeight] = useState("");
  const [registrations, setRegistrations] = useState<
    FormPedigreeRegistrationRow[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name ?? "");
    setBirthYear(row.birth_year ?? "");
    setHeight(row.height ?? "");
    setRegistrations(row.registrations ?? []);
    setError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.pedigree_id?.trim() || rowIndex == null) {
      setError("Pedigree record is missing.");
      return;
    }

    setSaving(true);
    setError(null);

    const parsedYear = birthYear.trim()
      ? Number.parseInt(birthYear.trim(), 10)
      : null;

    const updateResult = await updatePedigreeRecord(row.pedigree_id, {
      name,
      birth_year: Number.isFinite(parsedYear) ? parsedYear : null,
      height: height.trim() || null,
    });

    if (!updateResult.ok) {
      setError(updateResult.error);
      setSaving(false);
      return;
    }

    const regResult = await replacePedigreeRegistrations(
      row.pedigree_id,
      registrations
    );

    if (!regResult.ok) {
      setError(regResult.error);
      setSaving(false);
      return;
    }

    setRows((current) =>
      current.map((entry, index) =>
        index === rowIndex
          ? {
              ...entry,
              name: name.trim(),
              birth_year: birthYear.trim(),
              height: height.trim(),
              registrations: mapRegistrationsFromDb(regResult.registrations),
            }
          : entry
      )
    );

    setSaving(false);
    onClose();
  };

  const title = row
    ? `Edit ${PEDIGREE_TYPE_LABELS[row.type]} — ${row.name.trim() || "ancestor"}`
    : "Edit ancestor";

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
            disabled={!name.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      }
    >
      {row ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label variant="admin" required>
                Name
              </Label>
              <Input
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label variant="admin">Birth year</Label>
              <Input
                className="mt-1.5"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            </div>
            <div>
              <Label variant="admin">Height (HH)</Label>
              <Input
                className="mt-1.5"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="15.2"
              />
            </div>
          </div>

          <PedigreeRegistrationsEditor
            registrations={registrations}
            onChange={setRegistrations}
            primaryRadioName={`edit-pedigree-reg-${row.tempId}`}
          />

          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No ancestor selected.</p>
      )}
    </Modal>
  );
}
