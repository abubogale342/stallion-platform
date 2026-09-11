"use client";

import Button from "@/ui/Button";
import Modal from "@/ui/Modal";

type ConfirmRemoveDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  error?: string | null;
  loading?: boolean;
};

export default function ConfirmRemoveDialog({
  open,
  onClose,
  onConfirm,
  title = "Remove this item?",
  message = "This cannot be undone.",
  confirmLabel = "Remove",
  confirmVariant = "danger",
  error = null,
  loading = false,
}: ConfirmRemoveDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      preventClose={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="border border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="md"
            loading={loading}
            onClick={handleConfirm}
            className={confirmVariant === "danger" ? "border-red-900/50" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-300">{message}</p>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </Modal>
  );
}
