"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteResearchImage,
  renameResearchImage,
} from "@/services/research";
import { useResearchImagesRefresh } from "@/components/research/research-images-refresh-context";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";

export default function ResearchImageActions({
  imageId,
  imageBucketPath,
  initialName,
}: {
  imageId: string;
  imageBucketPath: string;
  initialName: string;
}) {
  const router = useRouter();
  const refreshCtx = useResearchImagesRefresh();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onRenameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await renameResearchImage({ imageId, name });
      if (!result.ok) throw new Error(result.error);
      setRenameOpen(false);
      if (refreshCtx) refreshCtx.refresh();
      else router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Rename failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirm() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await deleteResearchImage({ imageId, imageBucketPath });
      if (!result.ok) throw new Error(result.error);

      setDeleteOpen(false);
      if (refreshCtx) refreshCtx.refresh();
      else router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => setRenameOpen(true)}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-800"
        >
          Rename
        </Button>
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={() => setDeleteOpen(true)}
          className="rounded-md border border-red-900/70 bg-red-950/30 px-3 py-2 text-xs font-medium uppercase tracking-wide text-red-200 hover:bg-red-900/30"
        >
          Delete
        </Button>
      </div>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename image"
        size="md"
        preventClose={saving}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setRenameOpen(false)}
              disabled={saving}
              className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="rename-image-form"
              variant="gold"
              size="md"
              loading={saving}
              className="rounded-md border-[#c09a64] bg-[#c09a64] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:bg-[#c09a64] hover:opacity-90"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <form id="rename-image-form" onSubmit={onRenameSubmit}>
          <Label>Image Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter image name"
          />
          <ErrorText className="text-xs text-red-300">{errorMessage}</ErrorText>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete image"
        size="md"
        preventClose={saving}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setDeleteOpen(false)}
              disabled={saving}
              className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              loading={saving}
              onClick={onDeleteConfirm}
              className="rounded-md border border-red-900/70 bg-red-950/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-900/40"
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-400">
          This removes the image from storage and deletes its database record.
        </p>
        <ErrorText className="text-xs text-red-300">{errorMessage}</ErrorText>
      </Modal>
    </>
  );
}
