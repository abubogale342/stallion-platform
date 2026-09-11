"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteStaffAction } from "@/app/dashboard/users/actions";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";

type InviteRole = "admin" | "data_entry";

export default function InviteUserModal({
  buttonLabel = "Invite user",
}: {
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("data_entry");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("data_entry");
    setFirstName("");
    setLastName("");
    setErrorMessage(null);
  }, [open]);

  function handleInvite() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Email is required.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      const result = await inviteStaffAction({
        email: trimmedEmail,
        role,
        first_name: firstName,
        last_name: lastName,
      });
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      setOpen(false);
      toast.success("Invite sent.");
      router.refresh();
    });
  }

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
        title="Invite user"
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
              disabled={!email.trim()}
              onClick={handleInvite}
            >
              Send invite
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Invite Admin or Data Entry staff. They set a password from the email
            link.
          </p>
          <div>
            <Label variant="admin" required>
              Email
            </Label>
            <Input
              className="mt-1.5"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInvite();
                }
              }}
            />
          </div>
          <div>
            <Label variant="admin" required>
              Role
            </Label>
            <div className="mt-1.5 flex gap-2" role="radiogroup" aria-label="Role">
              {(
                [
                  { value: "data_entry", label: "Data Entry" },
                  { value: "admin", label: "Admin" },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="unstyled"
                  size="none"
                  role="radio"
                  aria-checked={role === option.value}
                  onClick={() => setRole(option.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    role === option.value
                      ? "border-sky-500/60 bg-sky-950/60 text-sky-100"
                      : "border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label variant="admin">First name</Label>
            <Input
              className="mt-1.5"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <Label variant="admin">Last name</Label>
            <Input
              className="mt-1.5"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
        </div>
      </Modal>
    </>
  );
}
