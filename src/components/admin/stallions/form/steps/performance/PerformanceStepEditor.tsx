"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { deletePerformanceRecord } from "@/services/performance";
import { deleteRacingResult } from "@/services/racing";
import type { StallionFormValues } from "@/types/stallion-form";
import Button from "@/ui/Button";
import TranslatableTextarea from "../../TranslatableTextarea";
import SectionCard from "../../SectionCard";
import CompactRecordRow from "../../CompactRecordRow";
import AddPerformanceRecordModal from "./modals/AddPerformanceRecordModal";
import EditPerformanceRecordModal from "./modals/EditPerformanceRecordModal";
import AddRacingRecordModal from "./modals/AddRacingRecordModal";
import EditRacingRecordModal from "./modals/EditRacingRecordModal";
import RacingSummarySection from "./RacingSummarySection";

export default function PerformanceStepEditor() {
  const { control, watch } = useFormContext<StallionFormValues>();
  const perf = useFieldArray({ control, name: "performance_records" });
  const racing = useFieldArray({ control, name: "racing_records" });
  const performanceRows = watch("performance_records") ?? [];
  const racingRows = watch("racing_records") ?? [];

  const [addPerfOpen, setAddPerfOpen] = useState(false);
  const [editPerfIndex, setEditPerfIndex] = useState<number | null>(null);
  const [addRacingOpen, setAddRacingOpen] = useState(false);
  const [editRacingIndex, setEditRacingIndex] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleRemovePerf = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deletePerformanceRecord(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    perf.remove(index);
  };

  const handleRemoveRacing = async (index: number, id: string) => {
    setRemoveError(null);
    if (id.trim()) {
      const result = await deleteRacingResult(id);
      if (!result.ok) {
        setRemoveError(result.error);
        return;
      }
    }
    racing.remove(index);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Performance summary">
        <TranslatableTextarea
          englishName="performance_summary"
          translationKey="performance_summary"
          label="Performance summary"
          rows={4}
          hint="Shown above the performance table on the public profile."
        />
      </SectionCard>

      <SectionCard title="Performance records">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Show and event records; saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddPerfOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add record
          </Button>
        </div>
        <div className="space-y-2">
          {perf.fields.length === 0 ? (
            <CompactRecordRow
              label="Performance"
              primary=""
              empty
              onAdd={() => setAddPerfOpen(true)}
            />
          ) : (
            perf.fields.map((field, index) => {
              const row = performanceRows[index];
              const secondary = [row?.year, row?.association, row?.discipline]
                .filter((x) => x?.trim())
                .join(" · ");
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Performance"
                  primary={`${row?.event?.trim() || "—"} — ${row?.achievement?.trim() || "—"}`}
                  secondary={secondary || undefined}
                  onEdit={() => setEditPerfIndex(index)}
                  onRemove={() => handleRemovePerf(index, row?.id ?? "")}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      <RacingSummarySection />

      <SectionCard title="Racing records">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Individual races; saved immediately when you add or edit.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddRacingOpen(true)}
            className="border border-slate-600 text-slate-300"
          >
            Add race
          </Button>
        </div>
        <div className="space-y-2">
          {racing.fields.length === 0 ? (
            <CompactRecordRow
              label="Race"
              primary=""
              empty
              onAdd={() => setAddRacingOpen(true)}
            />
          ) : (
            racing.fields.map((field, index) => {
              const row = racingRows[index];
              const secondary = [row?.track, row?.year]
                .filter((x) => x?.trim())
                .join(" · ");
              const position =
                row?.finish_position?.trim() ? `P${row.finish_position}` : "";
              return (
                <CompactRecordRow
                  key={field.id}
                  label="Race"
                  primary={`${row?.race_name?.trim() || "—"}${position ? ` (${position})` : ""}`}
                  secondary={secondary || undefined}
                  onEdit={() => setEditRacingIndex(index)}
                  onRemove={() => handleRemoveRacing(index, row?.id ?? "")}
                />
              );
            })
          )}
        </div>
      </SectionCard>

      {removeError ? (
        <p className="text-sm text-red-400">{removeError}</p>
      ) : null}

      <AddPerformanceRecordModal
        open={addPerfOpen}
        onClose={() => setAddPerfOpen(false)}
        onCreated={(record) => perf.append(record)}
      />
      <EditPerformanceRecordModal
        open={editPerfIndex != null}
        onClose={() => setEditPerfIndex(null)}
        rowIndex={editPerfIndex}
      />
      <AddRacingRecordModal
        open={addRacingOpen}
        onClose={() => setAddRacingOpen(false)}
        onCreated={(record) => racing.append(record)}
      />
      <EditRacingRecordModal
        open={editRacingIndex != null}
        onClose={() => setEditRacingIndex(null)}
        rowIndex={editRacingIndex}
      />
    </div>
  );
}
