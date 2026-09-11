"use client";

import debounce from "lodash.debounce";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  publishStallionAction,
  unpublishStallionAction,
} from "@/app/dashboard/stallions/actions";
import type {
  AdminStallionListRow,
  AdminStallionPublishStatus,
  AdminStallionsStatusFilter,
  AdminStallionsTypeFilter,
} from "@/types/admin-stallions";
import { toastPublishValidationFailure } from "@/utils/stallion";
import {
  buildManageStallionsHref,
  parseAdminStallionsStatusFilter,
  parseAdminStallionsTypeFilter,
} from "./stallions-list-url";
import Badge from "@/ui/Badge";
import Button from "@/ui/Button";
import Modal from "@/ui/Modal";
import Pagination from "@/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";
import { useDashboardRole } from "@/components/admin/DashboardRoleContext";

const SEARCH_DEBOUNCE_MS = 300;

function PublishStatusBadge({
  status,
}: {
  status: AdminStallionPublishStatus;
}) {
  const isPublished = status === "published";
  return (
    <Badge variant={isPublished ? "success" : "warning"}>
      {isPublished ? "Published" : "Draft"}
    </Badge>
  );
}

function HorseTypeBadge({ horseType }: { horseType: "stallion" | "mare" }) {
  return (
    <Badge
      variant="default"
      className={horseType === "mare" ? "text-violet-300/90" : undefined}
    >
      {horseType === "mare" ? "Mare" : "Stallion"}
    </Badge>
  );
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StallionPublishAction({
  stallionId,
  stallionName,
  publishStatus,
}: {
  stallionId: string;
  stallionName: string;
  publishStatus: AdminStallionPublishStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isDraft = publishStatus === "draft";
  const label = isDraft ? "Publish" : "Unpublish";

  const confirmTitle = isDraft ? "Publish stallion?" : "Unpublish stallion?";
  const confirmMessage = isDraft
    ? `Publish “${stallionName}” on the public directory?`
    : `Unpublish “${stallionName}” and return it to draft?`;

  function handleConfirm() {
    startTransition(async () => {
      const result = isDraft
        ? await publishStallionAction(stallionId)
        : await unpublishStallionAction(stallionId);

      if (!result.ok) {
        toastPublishValidationFailure(toast, {
          title:
            result.code === "VALIDATION_ERROR"
              ? "Cannot publish — fix the following:"
              : result.error,
          validationMessages: result.validationMessages,
          editStallionId:
            result.code === "VALIDATION_ERROR" ? stallionId : undefined,
          onEdit: () => router.push(`/dashboard/stallions/${stallionId}/edit`),
        });
        return;
      }

      if (result.unchanged) {
        toast.message(`“${stallionName}” is already ${result.publish_status}.`);
      } else {
        toast.success(
          isDraft
            ? `“${stallionName}” is now published.`
            : `“${stallionName}” is now a draft.`
        );
      }
      if (result.photoSyncWarning) {
        toast.warning(result.photoSyncWarning);
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        size="none"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
        className="font-medium text-emerald-400/90 hover:text-emerald-300 hover:underline disabled:opacity-50"
      >
        {pending ? (isDraft ? "Publishing…" : "Unpublishing…") : label}
      </Button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmTitle}
        size="md"
        preventClose={pending}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isDraft ? "primary" : "danger"}
              size="md"
              loading={pending}
              onClick={handleConfirm}
              className={
                isDraft
                  ? undefined
                  : "rounded-md border border-red-900/70 bg-red-950/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-900/40"
              }
            >
              {pending ? (isDraft ? "Publishing…" : "Unpublishing…") : label}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-400">{confirmMessage}</p>
      </Modal>
    </>
  );
}

export default function ManageStallionsTable({
  rows,
  defaultQ,
  defaultStatus,
  defaultType = "all",
  page,
  pageSize,
  totalPages,
  total,
  errorMessage = null,
}: {
  rows: AdminStallionListRow[];
  defaultQ: string;
  defaultStatus: AdminStallionsStatusFilter;
  defaultType?: AdminStallionsTypeFilter;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  errorMessage?: string | null;
}) {
  const { canPublish } = useDashboardRole();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(defaultQ);
  const [status, setStatus] = useState<AdminStallionsStatusFilter>(defaultStatus);
  const [horseType, setHorseType] =
    useState<AdminStallionsTypeFilter>(defaultType);

  useEffect(() => {
    setSearch(defaultQ);
    setStatus(defaultStatus);
    setHorseType(defaultType);
  }, [defaultQ, defaultStatus, defaultType]);

  const debouncedPushFilters = useMemo(() => {
    return debounce(
      (
        q: string,
        nextStatus: AdminStallionsStatusFilter,
        nextType: AdminStallionsTypeFilter
      ) => {
        const trimmedQ = q.trim();
        const currentQ = (searchParams.get("q") ?? "").trim();
        const currentStatus = parseAdminStallionsStatusFilter(
          searchParams.get("status")
        );
        const currentType = parseAdminStallionsTypeFilter(
          searchParams.get("type")
        );
        if (
          trimmedQ === currentQ &&
          nextStatus === currentStatus &&
          nextType === currentType
        )
          return;

        router.replace(
          buildManageStallionsHref({
            q: trimmedQ,
            status: nextStatus,
            type: nextType,
            page: 1,
          })
        );
      },
      SEARCH_DEBOUNCE_MS
    );
  }, [router, searchParams]);

  useEffect(() => {
    return () => debouncedPushFilters.cancel();
  }, [debouncedPushFilters]);

  const applyStatus = (nextStatus: AdminStallionsStatusFilter) => {
    setStatus(nextStatus);
    debouncedPushFilters.cancel();
    router.replace(
      buildManageStallionsHref({
        q: search,
        status: nextStatus,
        type: horseType,
        page: 1,
      })
    );
  };

  const applyType = (nextType: AdminStallionsTypeFilter) => {
    setHorseType(nextType);
    debouncedPushFilters.cancel();
    router.replace(
      buildManageStallionsHref({
        q: search,
        status,
        type: nextType,
        page: 1,
      })
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-800/80 px-4 py-4 sm:px-6">
        <div className="min-w-[12rem] flex-1">
          <label
            htmlFor="stallions-search"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Search by name
          </label>
          <input
            id="stallions-search"
            name="q"
            type="search"
            value={search}
            placeholder="Stallion name…"
            autoComplete="off"
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              debouncedPushFilters(value, status, horseType);
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
          />
        </div>
        <div>
          <label
            htmlFor="stallions-status"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Publish status
          </label>
          <select
            id="stallions-status"
            name="status"
            value={status}
            onChange={(e) => {
              applyStatus(
                parseAdminStallionsStatusFilter(e.target.value) ?? "all"
              );
            }}
            className="mt-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="stallions-type"
            className="block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Type
          </label>
          <select
            id="stallions-type"
            name="type"
            value={horseType}
            onChange={(e) => {
              applyType(parseAdminStallionsTypeFilter(e.target.value));
            }}
            className="mt-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
          >
            <option value="all">All</option>
            <option value="stallion">Stallions</option>
            <option value="mare">Donor mares</option>
          </select>
        </div>
      </div>

      {errorMessage ? (
        <div className="mx-4 my-4 rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200 sm:mx-6">
          Failed to load stallions: {errorMessage}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
          No stallions match your search or filters.
        </p>
      ) : (
        <Table minWidth="">
          <TableHead>
            <TableRow className="border-b border-slate-800/80 text-xs uppercase tracking-wide text-slate-500">
              <TableHeaderCell className="px-4 py-2 font-medium sm:px-6">
                Name
              </TableHeaderCell>
              <TableHeaderCell className="px-4 py-2 font-medium sm:px-6">
                Type
              </TableHeaderCell>
              <TableHeaderCell className="px-4 py-2 font-medium sm:px-6">
                Status
              </TableHeaderCell>
              <TableHeaderCell className="px-4 py-2 font-medium sm:px-6">
                Updated
              </TableHeaderCell>
              <TableHeaderCell className="px-4 py-2 font-medium sm:px-6">
                Actions
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-slate-800/60">
            {rows.map((row) => {
              const canLinkPublic =
                row.publishStatus === "published" && Boolean(row.slug);

              return (
                <TableRow key={row.id} className="text-slate-300">
                  <TableCell className="px-4 py-3 sm:px-6">
                    {canLinkPublic ? (
                      <Link
                        href={`/${row.horseType === "mare" ? "mares" : "stallions"}/${row.slug}`}
                        className="font-medium text-sky-300/90 hover:text-sky-200 hover:underline"
                      >
                        {row.stallionName}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-200">
                        {row.stallionName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-6">
                    <HorseTypeBadge horseType={row.horseType} />
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PublishStatusBadge status={row.publishStatus} />
                      {/*
                        Milestone 17: the listing has to show at a glance which
                        stallions carry agent output nobody has signed off on.
                        Sits beside the publish badge rather than in its own
                        column so it reads as part of the same "state of this
                        record" glance.
                      */}
                      {row.agentNeedsReview ? (
                        <span title="Agent output on this record has not been reviewed">
                          <Badge variant="warning">Agent review</Badge>
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-slate-500 sm:px-6">
                    {formatUpdatedAt(row.updatedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <Link
                        href={`/dashboard/stallions/${row.id}/edit`}
                        className="font-medium text-sky-400/90 hover:text-sky-300 hover:underline"
                      >
                        Edit
                      </Link>
                      <span className="text-slate-700" aria-hidden>
                        ·
                      </span>
                      <Link
                        href={`/dashboard/stallions/${row.id}/media`}
                        className="font-medium text-violet-400/90 hover:text-violet-300 hover:underline"
                      >
                        Edit media
                      </Link>
                      {canPublish ? (
                        <>
                      <span className="text-slate-700" aria-hidden>
                        ·
                      </span>
                      <StallionPublishAction
                        stallionId={row.id}
                        stallionName={row.stallionName}
                        publishStatus={row.publishStatus}
                      />
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        variant="admin"
        className="border-t border-slate-800/80 px-4 py-3 sm:px-6"
        buildHref={(p) => buildManageStallionsHref({ q: defaultQ, status: defaultStatus, type: defaultType, page: p })}
      />
    </>
  );
}
