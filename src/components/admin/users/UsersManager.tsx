"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  resendStaffInviteAction,
  revokeStaffAccessAction,
  unbanStaffAccessAction,
  type StaffProfileListRow,
} from "@/app/dashboard/users/actions";
import ConfirmRemoveDialog from "@/components/admin/stallions/form/ConfirmRemoveDialog";
import Button from "@/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

type ConfirmMode = "revoke" | "unban";

export default function UsersManager({
  rows,
  selfAuthId,
}: {
  rows: StaffProfileListRow[];
  selfAuthId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<StaffProfileListRow | null>(
    null
  );
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>("revoke");
  const [revokedById, setRevokedById] = useState<Record<string, boolean>>({});

  function handleConfirm() {
    if (!confirmTarget) return;
    const email = confirmTarget.email;
    const mode = confirmMode;
    startTransition(async () => {
      const result =
        mode === "unban"
          ? await unbanStaffAccessAction(email)
          : await revokeStaffAccessAction(email);
      if (!result.ok) {
        setConfirmTarget(null);
        toast.error(result.error);
        return;
      }
      setConfirmTarget(null);
      setRevokedById((current) => ({
        ...current,
        [confirmTarget.id]: mode === "revoke",
      }));
      toast.success(mode === "unban" ? "Access restored." : "Access revoked.");
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="px-4 py-3 sm:px-6">Email</TableHeaderCell>
            <TableHeaderCell className="px-4 py-3 sm:px-6">Role</TableHeaderCell>
            <TableHeaderCell className="px-4 py-3 sm:px-6">Created</TableHeaderCell>
            <TableHeaderCell className="px-4 py-3 sm:px-6">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y divide-slate-800/60">
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-4 py-6 text-sm text-slate-500 sm:px-6" colSpan={4}>
                No staff profiles yet. Invite an admin or data-entry user.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const revoked = revokedById[row.id] ?? row.revoked;
              const canManage = row.role !== "owner" && row.auth_id !== selfAuthId;
              const showResend = canManage && row.invite_pending && !revoked;
              return (
                <TableRow key={row.id} className="text-slate-300">
                  <TableCell className="px-4 py-3 sm:px-6">{row.email}</TableCell>
                  <TableCell className="px-4 py-3 sm:px-6">
                    <span>{row.role}</span>
                    {revoked ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                        Revoked
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-500 sm:px-6">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {showResend ? (
                        <Button
                          type="button"
                          variant="unstyled"
                          size="none"
                          disabled={pending}
                          className="text-xs font-medium text-sky-400 hover:underline"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await resendStaffInviteAction(row.email);
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Invite resent.");
                            });
                          }}
                        >
                          Resend invite
                        </Button>
                      ) : null}
                      {canManage && revoked ? (
                        <Button
                          type="button"
                          variant="unstyled"
                          size="none"
                          disabled={pending}
                          className="text-xs font-medium text-sky-400 hover:underline"
                          onClick={() => {
                            setConfirmMode("unban");
                            setConfirmTarget(row);
                          }}
                        >
                          Unban
                        </Button>
                      ) : null}
                      {canManage && !revoked ? (
                        <Button
                          type="button"
                          variant="unstyled"
                          size="none"
                          disabled={pending}
                          className="text-xs font-medium text-red-400 hover:underline"
                          onClick={() => {
                            setConfirmMode("revoke");
                            setConfirmTarget(row);
                          }}
                        >
                          Revoke access
                        </Button>
                      ) : null}
                      {!canManage && !showResend ? (
                        <span className="text-xs text-slate-600">—</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ConfirmRemoveDialog
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (!pending) setConfirmTarget(null);
        }}
        onConfirm={handleConfirm}
        title={confirmMode === "unban" ? "Unban user?" : "Revoke access?"}
        message={
          confirmMode === "unban"
            ? confirmTarget
              ? `Restore dashboard access for “${confirmTarget.email}”? They will be able to sign in again.`
              : "Restore dashboard access for this user?"
            : confirmTarget
              ? `Ban “${confirmTarget.email}” so they cannot sign in? You can unban them later.`
              : "Ban this user so they cannot sign in?"
        }
        confirmLabel={confirmMode === "unban" ? "Unban" : "Revoke access"}
        loading={pending}
      />
    </div>
  );
}
