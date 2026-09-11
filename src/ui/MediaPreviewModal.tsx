"use client";

import { useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

export default function MediaPreviewModal({
  trigger,
  children,
  ariaLabel = "Open media preview",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        size="none"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
      >
        {trigger}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} variant="preview">
        {children}
      </Modal>
    </>
  );
}
