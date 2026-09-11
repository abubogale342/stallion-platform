"use client";

import { useRef, useState } from "react";
import type { DirectoryEntryInput } from "@/app/dashboard/resources/actions";
import type { DirectoryKind } from "@/types/directory";
import { createClient } from "@/services/supabase";
import {
  DIRECTORY_LOGOS_BUCKET,
  DIRECTORY_LOGO_MAX_BYTES,
  DIRECTORY_LOGO_MIME_TYPES,
  directoryLogoPublicUrl,
  directoryLogoStoragePath,
} from "@/utils/directory";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Textarea from "@/ui/Textarea";

export const EMPTY_ENTRY: DirectoryEntryInput = {
  name: "",
  country: "",
  focus: "",
  website: "",
  notes: "",
  isActive: true,
  logoPath: "",
};

/**
 * Shared add/edit form for both reference directories. The only thing that
 * differs between them is the label on the free-text focus field, so the caller
 * passes that in rather than the form branching on the directory.
 */
export default function DirectoryEntryModal({
  open,
  onClose,
  title,
  submitLabel,
  kind,
  focusLabel,
  entryId,
  initial,
  pending,
  errorMessage,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  kind: DirectoryKind;
  focusLabel: string;
  /** Existing row id, or undefined when adding. Only shapes the upload path. */
  entryId?: string;
  initial: DirectoryEntryInput;
  pending: boolean;
  errorMessage: string | null;
  onSubmit: (value: DirectoryEntryInput) => void;
}) {
  const [value, setValue] = useState<DirectoryEntryInput>(initial);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);


  // Reset to the row's current values each time the modal opens, so a cancelled
  // edit does not leak into the next one. Comparing against the last-seen prop
  // during render is React's documented alternative to syncing with an effect.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setValue(initial);
      setLogoError(null);
    }
  }

  const set = <K extends keyof DirectoryEntryInput>(
    key: K,
    next: DirectoryEntryInput[K]
  ) => setValue((prev) => ({ ...prev, [key]: next }));

  const logoPreview = directoryLogoPublicUrl(value.logoPath);
  const busy = pending || uploading;

  /**
   * Upload straight from the browser into the public bucket, then keep only the
   * returned path in form state. The row is saved separately, so a logo picked
   * and then cancelled leaves an unreferenced object behind rather than a
   * broken row — the safer of the two failure modes for a reference table.
   */
  const onPickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);

    if (!(DIRECTORY_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setLogoError("Logo must be a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > DIRECTORY_LOGO_MAX_BYTES) {
      setLogoError("Logo must be under 2 MB.");
      return;
    }

    setUploading(true);
    try {
      // New entries have no id yet, so a random one keeps concurrent uploads
      // from colliding. The path is only ever a storage key.
      const path = directoryLogoStoragePath(
        kind,
        entryId ?? crypto.randomUUID(),
        file.name
      );
      const { error } = await createClient()
        .storage.from(DIRECTORY_LOGOS_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        setLogoError(error.message);
        return;
      }
      set("logoPath", path);
    } finally {
      setUploading(false);
      // Allow re-picking the same file after a failure.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      preventClose={pending}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={busy}
            className="border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={pending}
            disabled={busy}
            onClick={() => onSubmit(value)}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="directory-name" required>
            Name
          </Label>
          <Input
            id="directory-name"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="American Quarter Horse Association"
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="directory-country" required>
            Country
          </Label>
          <Input
            id="directory-country"
            value={value.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="USA"
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="directory-focus">{focusLabel}</Label>
          <Input
            id="directory-focus"
            value={value.focus}
            onChange={(e) => set("focus", e.target.value)}
            placeholder="Quarter Horse"
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="directory-website">Website</Label>
          <Input
            id="directory-website"
            value={value.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="aqha.com"
            disabled={pending}
          />
          <p className="mt-1 text-xs text-slate-500">
            https:// is added automatically if you leave it off.
          </p>
        </div>

        <div>
          <Label htmlFor="directory-logo">Logo</Label>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-slate-900">
              {logoPreview ? (
                /* The storage host is not in the Image config, and this is a
                   40px form preview, so next/image buys nothing here. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt=""
                  className="size-8 object-contain"
                />
              ) : (
                <span className="size-4 rounded-[2px] bg-slate-700" aria-hidden />
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                id="directory-logo"
                type="file"
                accept={DIRECTORY_LOGO_MIME_TYPES.join(",")}
                disabled={busy}
                onChange={(e) => onPickLogo(e.target.files?.[0])}
                className="max-w-[220px] text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2.5 file:py-1.5 file:text-xs file:text-slate-200 hover:file:bg-slate-700 disabled:opacity-50"
              />
              {uploading ? (
                <span className="text-xs text-slate-400">Uploading…</span>
              ) : null}
              {value.logoPath && !uploading ? (
                <button
                  type="button"
                  onClick={() => {
                    set("logoPath", "");
                    setLogoError(null);
                  }}
                  disabled={busy}
                  className="text-xs text-red-300 transition-colors hover:text-red-200 disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Shown at 16×16 beside the name. JPEG, PNG or WebP, under 2 MB.
            Optional — entries without one show a grey square.
          </p>
          <ErrorText>{logoError}</ErrorText>
        </div>

        <div>
          <Label htmlFor="directory-notes">Notes</Label>
          <Textarea
            id="directory-notes"
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
            disabled={pending}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-sky-500"
          />
          Visible on the public Resources page
        </label>

        <ErrorText>{errorMessage}</ErrorText>
      </div>
    </Modal>
  );
}
