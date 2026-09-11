"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { deleteFoalCrop, deleteProgenyRecord } from "@/services/progeny";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import SectionCard from "../../SectionCard";
import CompactRecordRow from "../../CompactRecordRow";
import BreedingStatisticsSection from "./BreedingStatisticsSection";
import AddProgenyRecordModal from "./modals/AddProgenyRecordModal";
import EditProgenyRecordModal from "./modals/EditProgenyRecordModal";
import AddFoalCropModal from "./modals/AddFoalCropModal";
import EditFoalCropModal from "./modals/EditFoalCropModal";

export default function ProgenyStepEditor() {
  const { control, watch } = useFormContext<StallionFormValues>();
  const progeny = useFieldArray({ control, name: "notable_progeny" });
  const crops = useFieldArray({ control, name: "foal_crops" });
  const progenyRows = watch("notable_progeny") ?? [];
  const cropRows = watch("foal_crops") ?? [];

  const [addProgenyOpen, setAddProgenyOpen] = useState(false);
  const [editProgenyIndex, setEditProgenyIndex] = useState<number | null>(null);
  const [addCropOpen, setAddCropOpen] = useState(false);
  const [editCropIndex, setEditCropIndex] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemoveProgeny = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteProgenyRecord(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    progeny.remove(index);
  };

  const handleRemoveCrop = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteFoalCrop(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    crops.remove(index);
  };

  return (
    <div className="space-y-4">
      <BreedingStatisticsSection />

      <SectionCard title="Notable progeny">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddProgenyOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add progeny
          </Button>
        </div>
        <div className="space-y-2">
          {progeny.fields.length === 0 ? (
            <CompactRecordRow
              label="Progeny"
              primary=""
              empty
              onAdd={() => setAddProgenyOpen(true)}
            />
          ) : (
            progeny.fields.map((field, index) => {
              const row = progenyRows[index];
              const secondary = [row?.year, row?.discipline]
                .filter((x) => x?.trim())
                .join(" · ");
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Progeny"
                  primary={`${row?.progeny_name?.trim() || "—"} — ${row?.achievement?.trim() || "—"}`}
                  secondary={secondary || undefined}
                  onEdit={() => setEditProgenyIndex(index)}
                  onRemove={() =>
                    handleRemoveProgeny(index, row?.id ?? "")
                  }
                />
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard title="Foal crops">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddCropOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add crop
          </Button>
        </div>
        <div className="space-y-2">
          {crops.fields.length === 0 ? (
            <CompactRecordRow
              label="Foal crop"
              primary=""
              empty
              onAdd={() => setAddCropOpen(true)}
            />
          ) : (
            crops.fields.map((field, index) => {
              const row = cropRows[index];
              const foals = row?.number_of_foals?.trim()
                ? `${row.number_of_foals} foals`
                : undefined;
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Foal crop"
                  primary={row?.foal_crop_year?.trim() || "—"}
                  secondary={foals}
                  onEdit={() => setEditCropIndex(index)}
                  onRemove={() => handleRemoveCrop(index, row?.id ?? "")}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      {removeError ? (
        <p className="text-sm text-red-400">{removeError}</p>
      ) : null}

      <AddProgenyRecordModal
        open={addProgenyOpen}
        onClose={() => setAddProgenyOpen(false)}
        onCreated={(record) => progeny.append(record)}
      />
      <EditProgenyRecordModal
        open={editProgenyIndex != null}
        onClose={() => setEditProgenyIndex(null)}
        rowIndex={editProgenyIndex}
      />
      <AddFoalCropModal
        open={addCropOpen}
        onClose={() => setAddCropOpen(false)}
        onCreated={(record) => crops.append(record)}
      />
      <EditFoalCropModal
        open={editCropIndex != null}
        onClose={() => setEditCropIndex(null)}
        rowIndex={editCropIndex}
      />
    </div>
  );
}
