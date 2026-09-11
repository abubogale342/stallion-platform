"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteDirectoryEntryAction,
  setDirectoryEntryActiveAction,
  updateDirectoryEntryAction,
  type DirectoryEntryInput,
} from "@/app/dashboard/resources/actions";
import type { DirectoryKind } from "@/types/directory";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Modal from "@/ui/Modal";
import DirectoryEntryModal from "./DirectoryEntryModal";

export type DirectoryRowActionsProps = {
  kind: DirectoryKind;
  focusLabel: string;
  entry: {
    id: string;
    name: string;
    country: string;
    focus: string | null;
    website: string | null;
    notes: string | null;
    isActive: boolean;
    logoPath: string | null;
    linkedStallions: number;
  };
};

export default function DirectoryRowActions({
  kind,
  focusLabel,
  entry,
}: DirectoryRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Stable identity so the modal's reset effect only fires when it opens.
  const initial = useMemo<DirectoryEntryInput>(
    () => ({
      name: entry.name,
      country: entry.country,
      focus: entry.focus ?? "",
      website: entry.website ?? "",
      notes: entry.notes ?? "",
      isActive: entry.isActive,
      logoPath: entry.logoPath ?? "",
    }),
    [
      entry.name,
      entry.country,
      entry.focus,
      entry.website,
      entry.notes,
      entry.isActive,
      entry.logoPath,
    ]
  );

  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      setErrorMessage(null);
      const result = await action();
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setEditOpen(true)}
          className="border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              setDirectoryEntryActiveAction(kind, entry.id, !entry.isActive)
            )
          }
          className="border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          {entry.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </Button>
      </div>

      {errorMessage && !editOpen && !confirmOpen ? (
        <ErrorText className="text-right">{errorMessage}</ErrorText>
      ) : null}

      <DirectoryEntryModal
        open={editOpen}
        onClose={() => {
          if (pending) return;
          setEditOpen(false);
          setErrorMessage(null);
        }}
        title={`Edit ${entry.name}`}
        submitLabel="Save changes"
        focusLabel={focusLabel}
        kind={kind}
        entryId={entry.id}
        initial={initial}
        pending={pending}
        errorMessage={editOpen ? errorMessage : null}
        onSubmit={(value) =>
          run(
            () => updateDirectoryEntryAction(kind, entry.id, value),
            () => setEditOpen(false)
          )
        }
      />

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (pending) return;
          setConfirmOpen(false);
          setErrorMessage(null);
        }}
        title={`Delete ${entry.name}?`}
        size="md"
        preventClose={pending}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
              className="border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              loading={pending}
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteDirectoryEntryAction(kind, entry.id),
                  () => setConfirmOpen(false)
                )
              }
            >
              Delete permanently
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            This removes the entry for good. To hide it from the public page
            while keeping the record, use Deactivate instead.
          </p>
          {entry.linkedStallions > 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-amber-200">
              {entry.linkedStallions}{" "}
              {entry.linkedStallions === 1 ? "stallion is" : "stallions are"}{" "}
              linked to this provider. Deleting it clears that link — the
              stallions stay, but their breeding service provider becomes empty.
            </p>
          ) : null}
          <ErrorText>{confirmOpen ? errorMessage : null}</ErrorText>
        </div>
      </Modal>
    </>
  );
}
