"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { deleteColourTest, deleteGeneticTest } from "@/services/health";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import SectionCard from "../../SectionCard";
import CompactRecordRow from "../../CompactRecordRow";
import HealthSummariesSection from "./HealthSummariesSection";
import AddGeneticTestModal from "./modals/AddGeneticTestModal";
import EditGeneticTestModal from "./modals/EditGeneticTestModal";
import AddColourTestModal from "./modals/AddColourTestModal";
import EditColourTestModal from "./modals/EditColourTestModal";

export default function HealthStepEditor() {
  const { control, watch } = useFormContext<StallionFormValues>();
  const genetic = useFieldArray({ control, name: "genetic_tests" });
  const colour = useFieldArray({ control, name: "colour_tests" });
  const geneticRows = watch("genetic_tests") ?? [];
  const colourRows = watch("colour_tests") ?? [];

  const [addGeneticOpen, setAddGeneticOpen] = useState(false);
  const [editGeneticIndex, setEditGeneticIndex] = useState<number | null>(null);
  const [addColourOpen, setAddColourOpen] = useState(false);
  const [editColourIndex, setEditColourIndex] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemoveGenetic = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteGeneticTest(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    genetic.remove(index);
  };

  const handleRemoveColour = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteColourTest(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    colour.remove(index);
  };

  return (
    <div className="space-y-4">
      <HealthSummariesSection />

      <SectionCard title="Genetic tests">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Structured genetic test rows; saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddGeneticOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add test
          </Button>
        </div>
        <div className="space-y-2">
          {genetic.fields.length === 0 ? (
            <CompactRecordRow
              label="Genetic test"
              primary=""
              empty
              onAdd={() => setAddGeneticOpen(true)}
            />
          ) : (
            genetic.fields.map((field, index) => {
              const row = geneticRows[index];
              const secondary = [row?.gene_code, row?.source]
                .filter((x) => x?.trim())
                .join(" · ");
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Genetic test"
                  primary={`${row?.test_type?.trim() || "—"} — ${row?.result?.trim() || "—"}`}
                  secondary={secondary || undefined}
                  onEdit={() => setEditGeneticIndex(index)}
                  onRemove={() => handleRemoveGenetic(index, row?.id ?? "")}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard title="Colour tests">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Structured colour test rows; saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddColourOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add test
          </Button>
        </div>
        <div className="space-y-2">
          {colour.fields.length === 0 ? (
            <CompactRecordRow
              label="Colour test"
              primary=""
              empty
              onAdd={() => setAddColourOpen(true)}
            />
          ) : (
            colour.fields.map((field, index) => {
              const row = colourRows[index];
              const secondary = [row?.gene_code, row?.source]
                .filter((x) => x?.trim())
                .join(" · ");
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Colour test"
                  primary={`${row?.colour_test?.trim() || "—"} — ${row?.result?.trim() || "—"}`}
                  secondary={secondary || undefined}
                  onEdit={() => setEditColourIndex(index)}
                  onRemove={() => handleRemoveColour(index, row?.id ?? "")}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      {removeError ? (
        <p className="text-sm text-red-400">{removeError}</p>
      ) : null}

      <AddGeneticTestModal
        open={addGeneticOpen}
        onClose={() => setAddGeneticOpen(false)}
        onCreated={(record) => genetic.append(record)}
      />
      <EditGeneticTestModal
        open={editGeneticIndex != null}
        onClose={() => setEditGeneticIndex(null)}
        rowIndex={editGeneticIndex}
      />
      <AddColourTestModal
        open={addColourOpen}
        onClose={() => setAddColourOpen(false)}
        onCreated={(record) => colour.append(record)}
      />
      <EditColourTestModal
        open={editColourIndex != null}
        onClose={() => setEditColourIndex(null)}
        rowIndex={editColourIndex}
      />
    </div>
  );
}
