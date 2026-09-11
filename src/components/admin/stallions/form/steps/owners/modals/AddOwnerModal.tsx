"use client";

import { useEffect, useState } from "react";
import {
  createOwnerRecord,
  fetchOwnerById,
  linkOwnerToStallion,
  ownerRecordToFormLink,
  searchOwners,
} from "@/services/owner";
import type { OwnerRecordOption } from "@/types/owner";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import { createEmptyOwnerLink, formatOwnerSummary } from "@/utils/owner";
import { newRowId } from "../../shared";
import { useOwnersStep } from "../OwnersStepContext";
import { OwnerFields } from "../OwnerFields";

type AddOwnerModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddOwnerModal({ open, onClose }: AddOwnerModalProps) {
  const { stallionId, links, setLinks } = useOwnersStep();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnerRecordOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "create">("search");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createFields, setCreateFields] = useState(createEmptyOwnerLink("new"));

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearchError(null);
    setActionError(null);
    setMode("search");
    setCreateFields(createEmptyOwnerLink("new"));
  }, [open]);

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
      const result = await searchOwners({ query: q });
      if (!result.ok) {
        setSearchError(result.error);
        setResults([]);
      } else {
        setResults(result.results);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [open, mode, query]);

  const isAlreadyLinked = (ownerId: string) =>
    links.some((link) => link.owner_id === ownerId);

  const appendLink = (record: OwnerRecordOption, publicDisplayNameOnly: boolean) => {
    const tempId = newRowId();
    const link = ownerRecordToFormLink(record, {
      tempId,
      public_display_name_only: publicDisplayNameOnly,
    });
    setLinks((current) => [...current, link]);
    onClose();
  };

  const handleSelect = async (ownerId: string) => {
    if (!stallionId) {
      setActionError("Stallion id is missing. Save the draft first.");
      return;
    }
    if (isAlreadyLinked(ownerId)) {
      setActionError("This owner is already linked to the stallion.");
      return;
    }

    setSaving(true);
    setActionError(null);

    const linkResult = await linkOwnerToStallion(stallionId, ownerId, {
      sort_order: links.length,
      is_primary: links.length === 0,
      public_display_name_only: false,
    });
    if (!linkResult.ok) {
      setActionError(linkResult.error);
      setSaving(false);
      return;
    }

    const result = await fetchOwnerById(ownerId);
    if (!result.ok) {
      setActionError(result.error);
      setSaving(false);
      return;
    }

    appendLink(result.record, false);
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!stallionId) {
      setActionError("Stallion id is missing. Save the draft first.");
      return;
    }
    if (!createFields.owner_name.trim()) {
      setActionError("Owner name is required.");
      return;
    }

    setSaving(true);
    setActionError(null);

    const createResult = await createOwnerRecord({
      owner_name: createFields.owner_name,
      country: createFields.country,
      email: createFields.email,
      phone: createFields.phone,
      farm_ranch: createFields.farm_ranch,
      farm_ranch_website: createFields.farm_ranch_website,
      address_line_1: createFields.address_line_1,
      address_line_2: createFields.address_line_2,
      suburb: createFields.suburb,
      state_region: createFields.state_region,
      postal_code: createFields.postal_code,
      full_address: createFields.full_address,
      facebook: createFields.facebook,
      instagram: createFields.instagram,
    });
    if (!createResult.ok) {
      setActionError(createResult.error);
      setSaving(false);
      return;
    }

    const linkResult = await linkOwnerToStallion(
      stallionId,
      createResult.record.id,
      {
        sort_order: links.length,
        is_primary: links.length === 0,
        public_display_name_only: createFields.public_display_name_only,
      }
    );
    if (!linkResult.ok) {
      setActionError(linkResult.error);
      setSaving(false);
      return;
    }

    appendLink(createResult.record, createFields.public_display_name_only);
    setSaving(false);
  };

  const canCreate = createFields.owner_name.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add owner"
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
                setCreateFields((current) => ({
                  ...current,
                  owner_name: query.trim(),
                }));
              }}
              className="border border-slate-600 text-slate-200"
            >
              Create new owner
            </Button>
          </div>
        )
      }
    >
      {mode === "search" ? (
        <div className="space-y-4">
          <div>
            <Label variant="admin">Search by name, farm, or email</Label>
            <Input
              className="mt-1.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Smith Ranch or owner@example.com"
              autoFocus
            />
          </div>

          {searchError ? <ErrorText>{searchError}</ErrorText> : null}
          {actionError ? <ErrorText>{actionError}</ErrorText> : null}

          {searching ? (
            <p className="text-sm text-slate-500">Searching…</p>
          ) : query.trim() && results.length === 0 ? (
            <p className="text-sm text-slate-500">
              No matching owners. Create a new record instead.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((record) => {
                const linked = isAlreadyLinked(record.id);
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      disabled={saving || linked}
                      onClick={() => handleSelect(record.id)}
                      className="w-full rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:border-sky-500/40 hover:bg-slate-900/60 disabled:opacity-50"
                    >
                      <span className="font-medium">{record.owner_name}</span>
                      {formatOwnerSummary(record) ? (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {formatOwnerSummary(record)}
                        </span>
                      ) : null}
                      {linked ? (
                        <span className="mt-0.5 block text-xs text-amber-400/90">
                          Already linked
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <OwnerFields fields={createFields} onChange={setCreateFields} />
          {actionError ? <ErrorText>{actionError}</ErrorText> : null}
        </div>
      )}
    </Modal>
  );
}
