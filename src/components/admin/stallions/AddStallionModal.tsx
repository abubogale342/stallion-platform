"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftStallionAction } from "@/app/dashboard/stallions/actions";
import type { HorseType } from "@/types/stallion";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";

const HORSE_TYPE_OPTIONS: { value: HorseType; label: string }[] = [
  { value: "stallion", label: "Stallion" },
  { value: "mare", label: "Mare" },
];

export default function AddStallionModal({
  buttonLabel = "Add horse",
}: {
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [horseType, setHorseType] = useState<HorseType>("stallion");
  const [stallionName, setStallionName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setHorseType("stallion");
    setStallionName("");
    setErrorMessage(null);
  }, [open]);

  const typeLabel = horseType === "mare" ? "mare" : "stallion";

  const handleCreate = () => {
    const name = stallionName.trim();
    if (!name) {
      setErrorMessage("Registered name is required.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      const result = await createDraftStallionAction(name, horseType);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/stallions/${result.stallion_id}/edit`);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        size="none"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-3 py-1.5 text-xs font-medium text-sky-100 transition hover:bg-sky-950/50"
      >
        {buttonLabel}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={horseType === "mare" ? "Add mare" : "Add stallion"}
        size="md"
        preventClose={pending}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={pending}
              disabled={!stallionName.trim()}
              onClick={handleCreate}
            >
              Create draft
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label variant="admin">Record type</Label>
            <div className="mt-1.5 flex gap-2" role="radiogroup" aria-label="Record type">
              {HORSE_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="unstyled"
                  size="none"
                  role="radio"
                  aria-checked={horseType === option.value}
                  onClick={() => setHorseType(option.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    horseType === option.value
                      ? "border-sky-500/60 bg-sky-950/60 text-sky-100"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Enter the registered name to create a draft {typeLabel}. You will
            continue on the full edit form.
          </p>
          <div>
            <Label variant="admin" required>
              Registered name
            </Label>
            <Input
              className="mt-1.5"
              value={stallionName}
              onChange={(e) => setStallionName(e.target.value)}
              placeholder="e.g. Smart Little Lena"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
          {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
        </div>
      </Modal>
    </>
  );
}
