"use client";

import { useState } from "react";
import Button from "@/ui/Button";
import ConfirmRemoveDialog from "./ConfirmRemoveDialog";
import { useStallionPermissions } from "@/components/admin/DashboardRoleContext";

type CompactRecordRowProps = {
  label: string;
  primary: string;
  secondary?: string;
  onAdd?: () => void;
  onEdit?: () => void;
  onRemove?: () => void | Promise<void>;
  /**
   * Reorder controls. Only rows whose order carries meaning supply these —
   * breeding service providers, where the first row is the provider a visitor
   * is meant to contact first. Passing undefined leaves the row unchanged, so
   * every other list keeps its current two-button layout.
   */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  empty?: boolean;
  /** Button label when empty (default "Add"). */
  addLabel?: string;
  removeConfirmTitle?: string;
  removeConfirmMessage?: string;
};

export default function CompactRecordRow({
  label,
  primary,
  secondary,
  onAdd,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  empty = false,
  addLabel = "Add",
  removeConfirmTitle,
  removeConfirmMessage,
}: CompactRecordRowProps) {
  const { canDeleteChildren } = useStallionPermissions();
  const allowRemove = Boolean(onRemove) && canDeleteChildren;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const title =
    removeConfirmTitle ?? `Remove ${label.toLowerCase()}?`;
  const message =
    removeConfirmMessage ??
    (primary.trim()
      ? `Remove “${primary.trim()}”? This cannot be undone.`
      : "This cannot be undone.");

  const handleConfirmRemove = async () => {
    if (!onRemove) return;
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
            {label}
          </p>
          {empty ? (
            <p className="mt-1 text-sm text-slate-500">Not set</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-slate-100">
                {primary.trim() || "—"}
              </span>
              {secondary ? (
                <span className="text-xs text-slate-400">{secondary}</span>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {empty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
            >
              {addLabel}
            </Button>
          ) : (
            <>
              {onMoveUp || onMoveDown ? (
                <div className="flex gap-1">
                  {/*
                    Buttons rather than drag-and-drop: the row order is the
                    sort order, and two clicks that are keyboard reachable beat
                    a pointer gesture nobody can perform with a screen reader.
                    Disabled at the ends rather than hidden, so the control does
                    not shift position as rows move.
                  */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onMoveUp}
                    disabled={!onMoveUp}
                    aria-label={`Move ${label.toLowerCase()} up`}
                    className="border border-slate-600 px-2 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onMoveDown}
                    disabled={!onMoveDown}
                    aria-label={`Move ${label.toLowerCase()} down`}
                    className="border border-slate-600 px-2 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
                  >
                    ↓
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="border border-slate-600 text-slate-300 hover:border-sky-500/40 hover:text-sky-200"
              >
                Edit
              </Button>
              {allowRemove ? (
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
          )}
        </div>
      </div>

      {allowRemove ? (
        <ConfirmRemoveDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmRemove}
          title={title}
          message={message}
          loading={removing}
        />
      ) : null}
    </>
  );
}
