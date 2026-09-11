"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createDirectoryEntryAction,
  type DirectoryEntryInput,
} from "@/app/dashboard/resources/actions";
import type { DirectoryKind } from "@/types/directory";
import Button from "@/ui/Button";
import DirectoryEntryModal, { EMPTY_ENTRY } from "./DirectoryEntryModal";

export default function DirectoryAddButton({
  kind,
  focusLabel,
  buttonLabel,
}: {
  kind: DirectoryKind;
  focusLabel: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setErrorMessage(null);
  };

  const handleSubmit = (value: DirectoryEntryInput) => {
    startTransition(async () => {
      setErrorMessage(null);
      const result = await createDirectoryEntryAction(kind, value);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>

      <DirectoryEntryModal
        open={open}
        onClose={close}
        title={buttonLabel}
        submitLabel="Create"
        focusLabel={focusLabel}
        kind={kind}
        initial={EMPTY_ENTRY}
        pending={pending}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </>
  );
}
