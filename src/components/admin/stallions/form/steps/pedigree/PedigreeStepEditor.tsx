"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Spinner from "@/ui/Spinner";
import { deleteStallionPedigreeLinks } from "@/services/pedigree";
import { PEDIGREE_TYPE_LABELS } from "@/utils/common";
import { ADMIN_PEDIGREE_MAX_GENERATION, pedigreeGenerationLabel } from "@/utils/pedigree";
import type { FormPedigreeRow } from "@/types/stallion-form";
import {
  findPedigreeRowIndex,
  getPrimaryRegistrationDisplay,
  getProgenySlotsForGeneration,
  removePedigreeRowCascade,
} from "@/utils/pedigree-form";
import ConfirmRemoveDialog from "../../ConfirmRemoveDialog";
import { SectionCard } from "../../fields";
import { useConfirmRemove } from "../../useConfirmRemove";
import { useStallionPermissions } from "@/components/admin/DashboardRoleContext";
import { usePedigreeStep } from "./PedigreeStepContext";
import AddPedigreeAncestorModal from "./modals/AddPedigreeAncestorModal";
import EditPedigreeAncestorModal from "./modals/EditPedigreeAncestorModal";

type SlotSpec = {
  generation: number;
  type: "sire" | "dam";
  progeny_ref: string;
  progenyLabel?: string;
};

type PedigreeAncestorRowProps = {
  row?: FormPedigreeRow;
  rowIndex: number;
  slot: SlotSpec;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

function PedigreeAncestorRow({
  row,
  rowIndex,
  slot,
  onAdd,
  onEdit,
  onRemove,
}: PedigreeAncestorRowProps) {
  const { canDeleteChildren } = useStallionPermissions();
  const filled = Boolean(row?.pedigree_id?.trim());
  const primaryReg = row ? getPrimaryRegistrationDisplay(row) : "";
  const [confirmOpen, setConfirmOpen] = useState(false);

  const removeTitle = `Remove ${PEDIGREE_TYPE_LABELS[slot.type].toLowerCase()}?`;
  const removeMessage = row?.name?.trim()
    ? `Remove “${row.name.trim()}” from the pedigree? This cannot be undone.`
    : "Remove this ancestor from the pedigree? This cannot be undone.";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {PEDIGREE_TYPE_LABELS[slot.type]}
        </p>
        {filled && row ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-slate-100">
              {row.name.trim() || "—"}
            </span>
            {primaryReg ? (
              <span className="font-mono text-xs text-slate-400">
                {primaryReg}
              </span>
            ) : (
              <span className="text-xs text-slate-500">No registration</span>
            )}
            {row.needs_review ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/90">
                Needs review
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Not set</p>
        )}
        <span className="sr-only">Row index {rowIndex}</span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {filled ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
            >
              Edit
            </Button>
            {canDeleteChildren ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="border-red-900/50 text-red-300/90 hover:border-red-700/60"
            >
              Remove
            </Button>
            ) : null}
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAdd}
            className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
          >
            Add
          </Button>
        )}
      </div>
      </div>

      <ConfirmRemoveDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onRemove();
          setConfirmOpen(false);
        }}
        title={removeTitle}
        message={removeMessage}
      />
    </>
  );
}

function PedigreeAncestorPair({
  progenyLabel,
  sireRow,
  sireIndex,
  damRow,
  damIndex,
  generation,
  progeny_ref,
  onAdd,
  onEdit,
  onRemove,
}: {
  progenyLabel: string;
  sireRow?: FormPedigreeRow;
  sireIndex: number;
  damRow?: FormPedigreeRow;
  damIndex: number;
  generation: number;
  progeny_ref: string;
  onAdd: (slot: SlotSpec) => void;
  onEdit: (index: number) => void;
  onRemove: (row: FormPedigreeRow) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/20 p-3">
      <p className="mb-3 text-xs font-medium text-slate-400">
        Parents of <span className="text-slate-200">{progenyLabel}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <PedigreeAncestorRow
          row={sireRow}
          rowIndex={sireIndex}
          slot={{ generation, type: "sire", progeny_ref, progenyLabel }}
          onAdd={() =>
            onAdd({ generation, type: "sire", progeny_ref, progenyLabel })
          }
          onEdit={() => sireIndex >= 0 && onEdit(sireIndex)}
          onRemove={() => sireRow && onRemove(sireRow)}
        />
        <PedigreeAncestorRow
          row={damRow}
          rowIndex={damIndex}
          slot={{ generation, type: "dam", progeny_ref, progenyLabel }}
          onAdd={() =>
            onAdd({ generation, type: "dam", progeny_ref, progenyLabel })
          }
          onEdit={() => damIndex >= 0 && onEdit(damIndex)}
          onRemove={() => damRow && onRemove(damRow)}
        />
      </div>
    </div>
  );
}

function PedigreeGenerationSection({
  generation,
  rows,
  onAdd,
  onEdit,
  onRemove,
  onRemoveGeneration,
}: {
  generation: number;
  rows: FormPedigreeRow[];
  onAdd: (slot: SlotSpec) => void;
  onEdit: (index: number) => void;
  onRemove: (row: FormPedigreeRow) => void;
  onRemoveGeneration: () => void;
}) {
  const { canDeleteChildren } = useStallionPermissions();
  const progenies = getProgenySlotsForGeneration(generation, rows);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const generationLabel = pedigreeGenerationLabel(generation);

  return (
    <SectionCard
      title={generationLabel}
      headerAction={
        canDeleteChildren ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="border-red-900/50 text-red-300/90 hover:border-red-700/60"
        >
          Remove generation
        </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {progenies.length === 0 ? (
          <p className="text-xs text-slate-500">
            Add ancestors in the generation above to show parent slots here.
          </p>
        ) : null}
        {progenies.map((progeny, slotIndex) => {
          const sireIndex = findPedigreeRowIndex(rows, {
            generation,
            type: "sire",
            progeny_ref: progeny.ref,
          });
          const damIndex = findPedigreeRowIndex(rows, {
            generation,
            type: "dam",
            progeny_ref: progeny.ref,
          });

          return (
            <PedigreeAncestorPair
              key={`${generation}-${progeny.ref}-${slotIndex}`}
              progenyLabel={progeny.label}
              sireRow={sireIndex >= 0 ? rows[sireIndex] : undefined}
              sireIndex={sireIndex}
              damRow={damIndex >= 0 ? rows[damIndex] : undefined}
              damIndex={damIndex}
              generation={generation}
              progeny_ref={progeny.ref}
              onAdd={onAdd}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          );
        })}
      </div>

      <ConfirmRemoveDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onRemoveGeneration();
          setConfirmOpen(false);
        }}
        title={`Remove ${generationLabel}?`}
        message={`Remove ${generationLabel} and all ancestors in that tier? This cannot be undone.`}
      />
    </SectionCard>
  );
}

export default function PedigreeStepEditor() {
  const { canDeleteChildren } = useStallionPermissions();
  const { stallionId, rows, setRows, loading, loadError } = usePedigreeStep();
  const { requestRemove, dialog: confirmRemoveDialog } = useConfirmRemove();
  const [actionError, setActionError] = useState<string | null>(null);

  const loadedMaxGeneration = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.generation), 1),
    [rows]
  );

  const [visibleThroughGen, setVisibleThroughGen] = useState(1);
  useEffect(() => {
    setVisibleThroughGen((prev) => Math.max(prev, loadedMaxGeneration));
  }, [loadedMaxGeneration]);
  const [addSlot, setAddSlot] = useState<SlotSpec | null>(null);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);

  const handleAddGeneration = () => {
    if (visibleThroughGen >= ADMIN_PEDIGREE_MAX_GENERATION) return;
    setVisibleThroughGen((prev) => prev + 1);
  };

  const handleRemoveGeneration = async (fromGeneration: number) => {
    if (fromGeneration <= 1) return;
    setActionError(null);
    const kept = rows.filter((row) => row.generation < fromGeneration);
    const keptIds = new Set(kept.map((row) => row.tempId));
    const removedLinkIds = rows
      .filter((row) => !keptIds.has(row.tempId))
      .map((row) => row.id.trim())
      .filter(Boolean);

    if (removedLinkIds.length > 0) {
      const result = await deleteStallionPedigreeLinks(removedLinkIds);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
    }

    setRows(kept);
    setVisibleThroughGen((prev) => Math.min(prev, fromGeneration - 1));
  };

  const handleRemoveRow = async (row: FormPedigreeRow) => {
    setActionError(null);
    const kept = removePedigreeRowCascade(rows, row.tempId);
    const keptIds = new Set(kept.map((entry) => entry.tempId));
    const removedLinkIds = rows
      .filter((entry) => !keptIds.has(entry.tempId))
      .map((entry) => entry.id.trim())
      .filter(Boolean);

    if (removedLinkIds.length > 0) {
      const result = await deleteStallionPedigreeLinks(removedLinkIds);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
    }

    setRows(kept);
  };

  const generationNumbers = useMemo(() => {
    const gens: number[] = [];
    for (let g = 2; g <= visibleThroughGen; g++) gens.push(g);
    return gens;
  }, [visibleThroughGen]);

  const canAddGeneration = visibleThroughGen < ADMIN_PEDIGREE_MAX_GENERATION;
  const canRemoveGeneration = visibleThroughGen > 1;
  const nextGeneration = visibleThroughGen + 1;

  const sireIndex = findPedigreeRowIndex(rows, {
    generation: 1,
    type: "sire",
    progeny_ref: "",
  });
  const damIndex = findPedigreeRowIndex(rows, {
    generation: 1,
    type: "dam",
    progeny_ref: "",
  });

  if (!stallionId) {
    return (
      <p className="text-sm text-slate-500">
        Save the stallion draft on the Identity step first, then return here to
        add pedigree ancestors.
      </p>
    );
  }

  if (loading) {
    return (
      <div
        className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/20 px-6 py-12"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner size="md" />
        <p className="text-sm text-slate-400">Loading pedigree…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Each ancestor saves immediately to the database when you add, edit, or
        remove — nothing is deferred to Save or Next.
      </p>

      {loadError ? <ErrorText>{loadError}</ErrorText> : null}
      {actionError ? <ErrorText>{actionError}</ErrorText> : null}

      <SectionCard title={pedigreeGenerationLabel(1)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <PedigreeAncestorRow
            row={sireIndex >= 0 ? rows[sireIndex] : undefined}
            rowIndex={sireIndex}
            slot={{ generation: 1, type: "sire", progeny_ref: "" }}
            onAdd={() =>
              setAddSlot({ generation: 1, type: "sire", progeny_ref: "" })
            }
            onEdit={() => setEditRowIndex(sireIndex)}
            onRemove={() => sireIndex >= 0 && handleRemoveRow(rows[sireIndex])}
          />
          <PedigreeAncestorRow
            row={damIndex >= 0 ? rows[damIndex] : undefined}
            rowIndex={damIndex}
            slot={{ generation: 1, type: "dam", progeny_ref: "" }}
            onAdd={() =>
              setAddSlot({ generation: 1, type: "dam", progeny_ref: "" })
            }
            onEdit={() => setEditRowIndex(damIndex)}
            onRemove={() => damIndex >= 0 && handleRemoveRow(rows[damIndex])}
          />
        </div>
      </SectionCard>

      {generationNumbers.map((generation) => (
        <PedigreeGenerationSection
          key={generation}
          generation={generation}
          rows={rows}
          onAdd={setAddSlot}
          onEdit={setEditRowIndex}
          onRemove={handleRemoveRow}
          onRemoveGeneration={() => handleRemoveGeneration(generation)}
        />
      ))}

      {canAddGeneration || canRemoveGeneration ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-700/90 px-4 py-3">
          <p className="text-xs text-slate-500">
            {canAddGeneration
              ? `Add ${pedigreeGenerationLabel(nextGeneration)} ancestor slots for each ancestor in ${pedigreeGenerationLabel(visibleThroughGen)}. `
              : null}
            {canRemoveGeneration
              ? "Remove a generation to hide that tier (1st generation sire/dam slots always remain)."
              : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {canRemoveGeneration && canDeleteChildren ? (
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() =>
                  requestRemove({
                    title: `Remove ${pedigreeGenerationLabel(visibleThroughGen)}?`,
                    message: `Remove ${pedigreeGenerationLabel(visibleThroughGen)} and all ancestors in that tier? This cannot be undone.`,
                    onConfirm: () => handleRemoveGeneration(visibleThroughGen),
                  })
                }
                className="border-red-900/50 text-red-300/90 hover:border-red-700/60"
              >
                Remove {pedigreeGenerationLabel(visibleThroughGen)}
              </Button>
            ) : null}
            {canAddGeneration ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleAddGeneration}
                className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
              >
                Add {pedigreeGenerationLabel(nextGeneration)}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AddPedigreeAncestorModal
        open={addSlot != null}
        onClose={() => setAddSlot(null)}
        generation={addSlot?.generation ?? 1}
        type={addSlot?.type ?? "sire"}
        progeny_ref={addSlot?.progeny_ref ?? ""}
        progenyLabel={addSlot?.progenyLabel}
      />

      <EditPedigreeAncestorModal
        open={editRowIndex != null && editRowIndex >= 0}
        onClose={() => setEditRowIndex(null)}
        rowIndex={editRowIndex}
      />

      {confirmRemoveDialog}
    </div>
  );
}
