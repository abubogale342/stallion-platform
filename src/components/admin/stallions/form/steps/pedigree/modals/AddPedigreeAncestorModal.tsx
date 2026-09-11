"use client";

import { useEffect, useState } from "react";
import {
  createPedigreeRecord,
  createStallionPedigreeLink,
  deleteStallionPedigreeLinks,
  fetchPedigreeWithRegistrations,
  prefillStallionPedigreeAncestors,
  previewPedigreePrefill,
  searchPedigrees,
  type PedigreePrefillSource,
} from "@/services/pedigree";
import type { FormPedigreeRegistrationRow } from "@/types/stallion-form";
import type { PedigreeRecordOption } from "@/types/pedigree";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import HelperText from "@/ui/HelperText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import { cn, PEDIGREE_TYPE_LABELS } from "@/utils/common";
import {
  formatPedigreeRegistrationLabel,
  pedigreeBriefGeneration,
  pedigreeBriefGenerationRange,
  pedigreeGenerationLabel,
} from "@/utils/pedigree";
import {
  createDefaultRegistration,
  findPedigreeRowIndex,
  mapPedigreeRecordToFormRow,
} from "@/utils/pedigree-form";
import { usePedigreeStep } from "../PedigreeStepContext";
import PedigreeRegistrationsEditor from "../PedigreeRegistrationsEditor";

type AddPedigreeAncestorModalProps = {
  open: boolean;
  onClose: () => void;
  generation: number;
  type: "sire" | "dam";
  progeny_ref: string;
  progenyLabel?: string;
};

function formatRecordSummary(record: PedigreeRecordOption): string {
  const regs = record.registrations ?? [];
  const primary =
    regs.find((r) => r.is_primary) ?? regs[0];
  const regLabel = primary
    ? formatPedigreeRegistrationLabel({
        association_name: primary.association_name ?? "",
        country: primary.country ?? "",
        registration_number: primary.registration_number ?? "",
      })
    : "";
  const year =
    record.birth_year != null ? ` · ${record.birth_year}` : "";
  return `${record.name}${year}${regLabel ? ` ${regLabel}` : ""}`;
}

/**
 * Range of generations a source offers, in the brief's numbering (see
 * `pedigreeBriefGeneration`). Falls back to the ancestors actually on file, so a
 * horse with only two tiers reads "generations 3-4" rather than a fixed "3-5".
 */
function generationRangeLabel(source: PedigreePrefillSource): string {
  const from =
    source.from_generation ?? source.ancestors[0]?.generation;
  const to =
    source.to_generation ??
    source.ancestors[source.ancestors.length - 1]?.generation;
  if (from == null || to == null) return "";
  return pedigreeBriefGenerationRange(from, to);
}

export default function AddPedigreeAncestorModal({
  open,
  onClose,
  generation,
  type,
  progeny_ref,
  progenyLabel,
}: AddPedigreeAncestorModalProps) {
  const { stallionId, rows, setRows, reload } = usePedigreeStep();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PedigreeRecordOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createBirthYear, setCreateBirthYear] = useState("");
  const [createHeight, setCreateHeight] = useState("");
  const [createRegistrations, setCreateRegistrations] = useState<
    FormPedigreeRegistrationRow[]
  >([createDefaultRegistration()]);
  const [prefillPrompt, setPrefillPrompt] = useState<{
    horseName: string;
    linkId: string;
    sources: PedigreePrefillSource[];
    lookupFailed?: boolean;
  } | null>(null);
  const [prefillSourceId, setPrefillSourceId] = useState<string | null>(null);
  const [prefillSaving, setPrefillSaving] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  const slotTitle = `${pedigreeGenerationLabel(generation)} ${PEDIGREE_TYPE_LABELS[type]}`;
  const modalTitle = progenyLabel
    ? `Add ${PEDIGREE_TYPE_LABELS[type]} — parents of ${progenyLabel}`
    : `Add ${slotTitle}`;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearchError(null);
    setActionError(null);
    setMode("search");
    setCreateName("");
    setCreateBirthYear("");
    setCreateHeight("");
    setCreateRegistrations([createDefaultRegistration()]);
  }, [open, generation, type, progeny_ref]);

  useEffect(() => {
    if (!open || mode !== "search") return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      const result = await searchPedigrees({ query: q, type });
      if (!result.ok) {
        setSearchError(result.error);
        setResults([]);
      } else {
        setResults(result.results);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [open, mode, query, type]);

  const appendRow = (
    record: PedigreeRecordOption,
    linkId: string,
    progenyTreeId: string
  ) => {
    const existingIndex = findPedigreeRowIndex(rows, {
      generation,
      type,
      progeny_ref,
    });
    const row = mapPedigreeRecordToFormRow(record, {
      generation,
      type,
      progeny_ref,
      tempId: linkId,
    });
    row.id = linkId;
    row.tempId = linkId;
    row.progeny_id = progenyTreeId;

    if (existingIndex >= 0) {
      setRows((current) =>
        current.map((entry, index) => (index === existingIndex ? row : entry))
      );
    } else {
      setRows((current) => [...current, row]);
    }
  };

  const maybePromptPrefill = async (
    pedigreeId: string,
    horseName: string,
    linkId: string
  ) => {
    // The brief requires the prompt whenever data exists, so neither of the two
    // ways this can come up empty may close silently -- staff cannot otherwise
    // tell "no ancestors on file" apart from "the check never ran".
    if (!stallionId) {
      setPrefillError(
        "The draft has not been saved yet, so known ancestors could not be checked. Save the draft and re-select this horse to prefill."
      );
      setPrefillPrompt({ horseName, linkId, sources: [], lookupFailed: true });
      setPrefillSourceId(null);
      onClose();
      return;
    }

    const previewResult = await previewPedigreePrefill({
      pedigreeId,
      excludeStallionId: stallionId,
      anchorGeneration: generation,
    });

    if (!previewResult.ok) {
      setPrefillError(previewResult.error);
      setPrefillPrompt({ horseName, linkId, sources: [], lookupFailed: true });
      setPrefillSourceId(null);
      onClose();
      return;
    }

    if (previewResult.preview.sources.length > 0) {
      setPrefillError(null);
      setPrefillPrompt({
        horseName: previewResult.preview.horse_name?.trim() || horseName,
        linkId,
        sources: previewResult.preview.sources,
      });
      setPrefillSourceId(previewResult.preview.sources[0]?.source_anchor_id ?? null);
    }

    onClose();
  };

  const persistLink = async (pedigreeId: string) => {
    if (!stallionId) {
      return { ok: false as const, error: "Stallion id is missing. Save the draft first." };
    }

    const existingIndex = findPedigreeRowIndex(rows, {
      generation,
      type,
      progeny_ref,
    });
    const existingRow = existingIndex >= 0 ? rows[existingIndex] : null;

    const progenyRow =
      generation > 1 ? rows.find((row) => row.tempId === progeny_ref) : undefined;

    if (generation > 1 && !progenyRow?.id?.trim()) {
      return {
        ok: false as const,
        error:
          "The parent ancestor must be linked before adding deeper generations.",
      };
    }

    if (existingRow?.id?.trim()) {
      const removed = await deleteStallionPedigreeLinks([existingRow.id]);
      if (!removed.ok) return removed;
    }

    return createStallionPedigreeLink(stallionId, {
      pedigree_id: pedigreeId,
      generation,
      progeny_id: progenyRow?.id ?? null,
    });
  };

  const handleSelect = async (id: string) => {
    setSaving(true);
    setActionError(null);

    const linkResult = await persistLink(id);
    if (!linkResult.ok) {
      setActionError(linkResult.error);
      setSaving(false);
      return;
    }

    const result = await fetchPedigreeWithRegistrations(id);
    if (!result.ok) {
      setActionError(result.error);
      setSaving(false);
      return;
    }

    const progenyTreeId =
      generation > 1
        ? rows.find((row) => row.tempId === progeny_ref)?.id ?? ""
        : "";

    appendRow(result.record, linkResult.id, progenyTreeId);
    await maybePromptPrefill(id, result.record.name, linkResult.id);
    setSaving(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    setActionError(null);
    const birthYear = createBirthYear.trim()
      ? Number.parseInt(createBirthYear.trim(), 10)
      : null;
    const result = await createPedigreeRecord({
      name: createName,
      type,
      birth_year: Number.isFinite(birthYear) ? birthYear : null,
      height: createHeight.trim() || null,
      registrations: createRegistrations,
    });
    if (!result.ok) {
      setActionError(result.error);
      setSaving(false);
      return;
    }

    const linkResult = await persistLink(result.record.id);
    if (!linkResult.ok) {
      setActionError(linkResult.error);
      setSaving(false);
      return;
    }

    const progenyTreeId =
      generation > 1
        ? rows.find((row) => row.tempId === progeny_ref)?.id ?? ""
        : "";

    appendRow(result.record, linkResult.id, progenyTreeId);
    onClose();
    setSaving(false);
  };

  const handlePrefillConfirm = async () => {
    if (!prefillPrompt || !stallionId || !prefillSourceId) return;
    setPrefillSaving(true);
    setPrefillError(null);
    const result = await prefillStallionPedigreeAncestors(
      stallionId,
      prefillPrompt.linkId,
      prefillSourceId
    );
    if (!result.ok) {
      setPrefillError(result.error);
      setPrefillSaving(false);
      return;
    }
    await reload();
    setPrefillSaving(false);
    setPrefillPrompt(null);
    setPrefillSourceId(null);
  };

  const canCreate = createName.trim().length > 0;
  const selectedSource =
    prefillPrompt?.sources.find((source) => source.source_anchor_id === prefillSourceId) ??
    prefillPrompt?.sources[0] ??
    null;
  const selectedRange = selectedSource ? generationRangeLabel(selectedSource) : "";
  const prefillTitle = !prefillPrompt
    ? "Known generations"
    : prefillPrompt.lookupFailed
      ? `Could not check known generations for ${prefillPrompt.horseName}`
      : selectedRange
        ? `Known generations found for ${prefillPrompt.horseName} — prefill ${selectedRange}?`
        : `Known generations found for ${prefillPrompt.horseName}`;

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      preventClose={saving}
      footer={
        mode === "create" ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setMode("search")}
              disabled={saving}
              className="border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Back to search
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={saving}
              disabled={!canCreate}
              onClick={handleCreate}
            >
              Create and add
            </Button>
          </div>
        ) : (
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
              onClick={() => {
                setMode("create");
                setCreateName(query.trim());
              }}
              className="border border-slate-600 text-slate-200"
            >
              Create new pedigree
            </Button>
          </div>
        )
      }
    >
      {mode === "search" ? (
        <div className="space-y-4">
          <div>
            <Label variant="admin">Search by name or registration number</Label>
            <Input
              className="mt-1.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Smart Little Lena or US-1234567"
              autoFocus
            />
          </div>

          {searchError ? <ErrorText>{searchError}</ErrorText> : null}
          {actionError ? <ErrorText>{actionError}</ErrorText> : null}

          {searching ? (
            <p className="text-sm text-slate-500">Searching…</p>
          ) : query.trim() && results.length === 0 ? (
            <p className="text-sm text-slate-500">
              No matching pedigrees. Create a new record instead.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSelect(record.id)}
                    className="w-full rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:border-sky-500/40 hover:bg-slate-900/60 disabled:opacity-50"
                  >
                    <span className="font-medium">{record.name}</span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-400">
                      {formatRecordSummary(record)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label variant="admin" required>
                Name
              </Label>
              <Input
                className="mt-1.5"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <Label variant="admin">Birth year</Label>
              <Input
                className="mt-1.5"
                type="number"
                value={createBirthYear}
                onChange={(e) => setCreateBirthYear(e.target.value)}
              />
            </div>
            <div>
              <Label variant="admin">Height (HH)</Label>
              <Input
                className="mt-1.5"
                value={createHeight}
                onChange={(e) => setCreateHeight(e.target.value)}
                placeholder="15.2"
              />
            </div>
          </div>

          <PedigreeRegistrationsEditor
            registrations={createRegistrations}
            onChange={setCreateRegistrations}
            primaryRadioName="add-pedigree-reg-primary"
            showReview={false}
          />

          {actionError ? <ErrorText>{actionError}</ErrorText> : null}
        </div>
      )}
    </Modal>

    <Modal
      open={prefillPrompt != null}
      onClose={() => {
        if (prefillSaving) return;
        setPrefillPrompt(null);
        setPrefillSourceId(null);
        setPrefillError(null);
      }}
      title={prefillTitle}
      size="md"
      preventClose={prefillSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              if (prefillSaving) return;
              setPrefillPrompt(null);
              setPrefillSourceId(null);
              setPrefillError(null);
            }}
            disabled={prefillSaving}
            className="border border-slate-700 text-slate-300"
          >
            {selectedSource ? "Cancel" : "Close"}
          </Button>
          {selectedSource ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={prefillSaving}
              onClick={handlePrefillConfirm}
            >
              Prefill
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {prefillPrompt && prefillPrompt.sources.length > 1 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Source
            </p>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {prefillPrompt.sources.map((source) => {
                const selected = source.source_anchor_id === selectedSource?.source_anchor_id;
                const range = generationRangeLabel(source);
                return (
                  <li key={source.source_anchor_id}>
                    <button
                      type="button"
                      disabled={prefillSaving}
                      onClick={() => setPrefillSourceId(source.source_anchor_id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50",
                        selected
                          ? "border-sky-500/50 bg-sky-950/30 text-slate-100"
                          : "border-slate-800/80 bg-slate-900/30 text-slate-200 hover:border-sky-500/40"
                      )}
                    >
                      {source.source_stallion_name}
                      {range ? ` ${range}` : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {selectedSource ? (
          <div>
            {prefillPrompt && prefillPrompt.sources.length > 1 ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </p>
            ) : null}
            <ul
              className={cn(
                "max-h-56 space-y-1.5 overflow-y-auto",
                prefillPrompt && prefillPrompt.sources.length > 1 ? "mt-2" : ""
              )}
            >
              {selectedSource.ancestors.map((ancestor, index) => (
                <li
                  key={`${ancestor.generation}-${ancestor.name}-${index}`}
                  className="flex items-baseline gap-3 text-sm text-slate-200"
                >
                  <span className="w-4 shrink-0 tabular-nums text-slate-500">
                    {pedigreeBriefGeneration(ancestor.generation)}
                  </span>
                  <span>{ancestor.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : prefillPrompt?.lookupFailed ? (
          <p className="text-sm text-slate-400">
            The registry could not be checked for {prefillPrompt.horseName}&rsquo;s
            known ancestors. The horse was still added — enter its ancestors
            manually, or retry by re-selecting it.
          </p>
        ) : (
          <p className="text-sm text-slate-500">No known generations to prefill.</p>
        )}

        {selectedSource ? (
          <HelperText className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-200/90">
            Prefill copies known ancestors once — it does not stay in sync if
            parentage is updated elsewhere. Please confirm whether you want
            parentage to stay live-linked as registry data expands.
          </HelperText>
        ) : null}

        {prefillError ? <ErrorText>{prefillError}</ErrorText> : null}
      </div>
    </Modal>
    </>
  );
}
