"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignHorseAction,
  listHorseAssignments,
  listStaffProfiles,
  unassignHorseAction,
  type HorseAssignmentRow,
  type StaffProfileListRow,
} from "@/app/dashboard/users/actions";
import Button from "@/ui/Button";

export default function HorseAssignmentsPanel({
  stallionId,
}: {
  stallionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<HorseAssignmentRow[]>([]);
  const [staff, setStaff] = useState<StaffProfileListRow[]>([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const [assigned, listed] = await Promise.all([
      listHorseAssignments(stallionId),
      listStaffProfiles(),
    ]);
    if (assigned.ok) setRows(assigned.rows);
    else setError(assigned.error);
    if (listed.ok) {
      setStaff(listed.rows.filter((row) => row.role !== "owner"));
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per horse
  }, [stallionId]);

  const assignedIds = new Set(rows.map((row) => row.user_id));
  const available = staff.filter((row) => !assignedIds.has(row.auth_id));

  return (
    <section className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Assigned staff</h2>
      <p className="mt-1 text-xs text-slate-500">
        Admins and data-entry users only see this horse in Manage Horses when
        they are assigned here (data entry can also see all drafts).
      </p>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <ul className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-slate-500">No assignments yet.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.user_id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300"
            >
              <span>
                {row.email}{" "}
                <span className="text-xs text-slate-500">({row.role})</span>
              </span>
              <Button
                type="button"
                variant="unstyled"
                size="none"
                disabled={pending}
                className="text-xs text-red-400 hover:underline"
                onClick={() => {
                  startTransition(async () => {
                    const result = await unassignHorseAction(
                      stallionId,
                      row.user_id
                    );
                    if (!result.ok) toast.error(result.error);
                    else {
                      toast.success("Unassigned");
                      await reload();
                    }
                  });
                }}
              >
                Unassign
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="min-w-56 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">Select staff…</option>
          {available.map((row) => (
            <option key={row.auth_id} value={row.auth_id}>
              {row.email} ({row.role})
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={pending || !userId}
          className="border border-slate-600"
          onClick={() => {
            startTransition(async () => {
              const result = await assignHorseAction(stallionId, userId);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Assigned");
                setUserId("");
                await reload();
              }
            });
          }}
        >
          Assign
        </Button>
      </div>
    </section>
  );
}
