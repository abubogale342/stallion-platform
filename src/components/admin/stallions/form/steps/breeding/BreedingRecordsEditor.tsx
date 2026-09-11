"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  deleteBreedingServiceProvider,
  saveStudFees,
} from "@/services/breeding";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import SectionCard from "../../SectionCard";
import CompactRecordRow from "../../CompactRecordRow";
import AddStudFeeModal from "./modals/AddStudFeeModal";
import EditStudFeeModal from "./modals/EditStudFeeModal";
import AddBreedingProviderModal from "./modals/AddBreedingProviderModal";
import EditBreedingProviderModal from "./modals/EditBreedingProviderModal";

export default function BreedingRecordsEditor() {
  const { control, watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id")?.trim() ?? "";
  const studFees = useFieldArray({ control, name: "stud_fees" });
  const providers = useFieldArray({ control, name: "breeding_service_providers" });
  const studFeeRows = watch("stud_fees") ?? [];
  const providerRows = watch("breeding_service_providers") ?? [];

  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [editFeeIndex, setEditFeeIndex] = useState<number | null>(null);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editProviderIndex, setEditProviderIndex] = useState<number | null>(
    null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemoveFee = async (index: number) => {
    if (!stallionId) {
      setRemoveError("Stallion id is missing.");
      return;
    }
    setRemoveError(null);
    const nextFees = studFeeRows.filter((_, i) => i !== index);
    const result = await saveStudFees(stallionId, nextFees);
    if (!result.ok) {
      setRemoveError(result.error);
      return;
    }
    studFees.remove(index);
  };

  const handleRemoveProvider = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteBreedingServiceProvider(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    providers.remove(index);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Stud fees">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Stud fee amounts; saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddFeeOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add fee
          </Button>
        </div>
        <div className="space-y-2">
          {studFees.fields.length === 0 ? (
            <CompactRecordRow
              label="Stud fee"
              primary=""
              empty
              onAdd={() => setAddFeeOpen(true)}
            />
          ) : (
            studFees.fields.map((field, index) => {
              const row = studFeeRows[index];
              const amount = row?.value?.trim() || "—";
              const currency = row?.currency?.trim();
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Stud fee"
                  primary={currency ? `${amount} ${currency}` : amount}
                  onEdit={() => setEditFeeIndex(index)}
                  onRemove={() => handleRemoveFee(index)}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard title="Breeding service providers">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Service providers; add and edit save immediately. Order is the contact order and saves with the form.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddProviderOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add provider
          </Button>
        </div>
        <div className="space-y-2">
          {providers.fields.length === 0 ? (
            <CompactRecordRow
              label="Provider"
              primary=""
              empty
              onAdd={() => setAddProviderOpen(true)}
            />
          ) : (
            // Reordering only changes the array; `sort_order` is written from
            // array position by the form-save RPC, so a move is persisted by
            // Save rather than immediately the way add and edit are.
            providers.fields.map((field, index) => {
              const row = providerRows[index];
              const secondary = [row?.country, row?.email, row?.website]
                .filter((x) => x?.trim())
                .join(" · ");
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Provider"
                  primary={row?.name?.trim() || "—"}
                  secondary={secondary || undefined}
                  onEdit={() => setEditProviderIndex(index)}
                  onRemove={() =>
                    handleRemoveProvider(index, row?.id ?? "")
                  }
                  onMoveUp={
                    index > 0 ? () => providers.move(index, index - 1) : undefined
                  }
                  onMoveDown={
                    index < providers.fields.length - 1
                      ? () => providers.move(index, index + 1)
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      </SectionCard>

      {removeError ? (
        <p className="text-sm text-red-400">{removeError}</p>
      ) : null}

      <AddStudFeeModal
        open={addFeeOpen}
        onClose={() => setAddFeeOpen(false)}
        onCreated={(record) => studFees.append(record)}
      />
      <EditStudFeeModal
        open={editFeeIndex != null}
        onClose={() => setEditFeeIndex(null)}
        rowIndex={editFeeIndex}
      />
      <AddBreedingProviderModal
        open={addProviderOpen}
        onClose={() => setAddProviderOpen(false)}
        onCreated={(record) => providers.append(record)}
      />
      <EditBreedingProviderModal
        open={editProviderIndex != null}
        onClose={() => setEditProviderIndex(null)}
        rowIndex={editProviderIndex}
      />
    </div>
  );
}
