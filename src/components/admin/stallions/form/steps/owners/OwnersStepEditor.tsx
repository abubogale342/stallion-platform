"use client";

import { useState } from "react";
import { unlinkOwnerFromStallion } from "@/services/owner";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Spinner from "@/ui/Spinner";
import ConfirmRemoveDialog from "../../ConfirmRemoveDialog";
import { useStallionPermissions } from "@/components/admin/DashboardRoleContext";
import SectionCard from "../../SectionCard";
import { useOwnersStep } from "./OwnersStepContext";
import AddOwnerModal from "./modals/AddOwnerModal";
import EditOwnerModal from "./modals/EditOwnerModal";

type OwnerRowProps = {
  index: number;
  onEdit: () => void;
  onRemove: () => void;
};

function OwnerRow({ index, onEdit, onRemove }: OwnerRowProps) {
  const { canDeleteChildren } = useStallionPermissions();
  const { links } = useOwnersStep();
  const link = links[index];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!link) return null;

  const summaryParts = [link.farm_ranch, link.country].filter((part) =>
    part.trim()
  );
  const removeTitle = "Remove owner?";
  const removeMessage = link.owner_name.trim()
    ? `Remove “${link.owner_name.trim()}” from this stallion? The owner record will remain in the database.`
    : "Remove this owner from the stallion? The owner record will remain in the database.";

  const handleConfirmRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
      setConfirmOpen(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/20 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Owner {index + 1}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-slate-100">
              {link.owner_name.trim() || "—"}
            </span>
            {summaryParts.length > 0 ? (
              <span className="text-xs text-slate-400">
                {summaryParts.join(" · ")}
              </span>
            ) : (
              <span className="text-xs text-slate-500">No farm or country</span>
            )}
          </div>
          {link.public_display_name_only ? (
            <p className="mt-1 text-xs text-slate-500">
              Public display: name only
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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
        </div>
      </div>

      <ConfirmRemoveDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        title={removeTitle}
        message={removeMessage}
        loading={removing}
      />
    </>
  );
}

export default function OwnersStepEditor() {
  const { stallionId, links, setLinks, loading, loadError } = useOwnersStep();
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRemove = async (index: number) => {
    const link = links[index];
    if (!link?.owner_id?.trim() || !stallionId) return;

    setActionError(null);
    const result = await unlinkOwnerFromStallion(stallionId, link.owner_id);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setLinks((current) => current.filter((_, i) => i !== index));
  };

  if (!stallionId) {
    return (
      <p className="text-sm text-slate-500">
        Save the stallion draft on the Identity step first, then return here to
        add owners.
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
        <p className="text-sm text-slate-400">Loading owners…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Each owner saves immediately to the database when you add, edit, or
        remove — nothing is deferred to Save or Next.
      </p>

      {loadError ? <ErrorText>{loadError}</ErrorText> : null}
      {actionError ? <ErrorText>{actionError}</ErrorText> : null}

      <SectionCard
        title="Owners"
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
          >
            Add owner
          </Button>
        }
      >
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">No owners linked yet.</p>
        ) : (
          <div className="space-y-3">
            {links.map((link, index) => (
              <OwnerRow
                key={link.tempId || link.owner_id || `owner-${index}`}
                index={index}
                onEdit={() => setEditIndex(index)}
                onRemove={() => handleRemove(index)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <AddOwnerModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditOwnerModal
        open={editIndex != null}
        onClose={() => setEditIndex(null)}
        linkIndex={editIndex}
      />
    </div>
  );
}
