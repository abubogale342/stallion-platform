"use client";

import { useState } from "react";
import Button from "@/ui/Button";
import ConfirmRemoveDialog from "./ConfirmRemoveDialog";
import { useStallionPermissions } from "@/components/admin/DashboardRoleContext";

export function RepeatableList({
  title,
  onAdd,
  addLabel = "Add row",
  children,
}: {
  title: string;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
      >
        {addLabel}
      </Button>
    </div>
  );
}

export function RepeatableRowShell({
  index,
  onRemove,
  removeConfirmTitle,
  removeConfirmMessage,
  children,
}: {
  index: number;
  onRemove: () => void | Promise<void>;
  removeConfirmTitle?: string;
  removeConfirmMessage?: string;
  children: React.ReactNode;
}) {
  const { canDeleteChildren } = useStallionPermissions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const title = removeConfirmTitle ?? "Remove this row?";
  const message =
    removeConfirmMessage ??
    `Remove row ${index + 1}? This cannot be undone.`;

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
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            Row {index + 1}
          </span>
          {canDeleteChildren ? (
          <Button
            type="button"
            variant="unstyled"
            size="none"
            onClick={() => setConfirmOpen(true)}
            className="text-xs text-red-400/90 hover:text-red-300"
          >
            Remove
          </Button>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      </div>

      <ConfirmRemoveDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        title={title}
        message={message}
        loading={removing}
      />
    </>
  );
}
