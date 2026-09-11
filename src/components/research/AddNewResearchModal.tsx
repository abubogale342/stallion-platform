"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createResearchSnippet,
  fetchResearchStallionOptions,
  uploadResearchImages,
  type ResearchStallionOption,
} from "@/services/research";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Modal from "@/ui/Modal";
import Select from "@/ui/Select";
import Textarea from "@/ui/Textarea";
import {
  DEFAULT_RESEARCH_LOCALE,
  researchLocaleSelectOptions,
  type ResearchLocale,
} from "@/utils/common";

type PastedImage = {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
};

export default function AddNewResearchModal({
  defaultStallionId = "",
  snippetId = "",
  showStallionNameInput = true,
  showPasteArea = true,
  buttonLabel = "Add New",
  title = "Add New Research Item",
  onAfterUpload,
}: {
  defaultStallionId?: string;
  snippetId?: string;
  showStallionNameInput?: boolean;
  showPasteArea?: boolean;
  buttonLabel?: string;
  title?: string;
  /** When set (e.g. detail page), used instead of router.refresh so parent can show loading. */
  onAfterUpload?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedStallionId, setSelectedStallionId] = useState(defaultStallionId);
  const [stallionOptions, setStallionOptions] = useState<ResearchStallionOption[]>([]);
  const [loadingStallions, setLoadingStallions] = useState(false);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PastedImage[]>([]);
  const [locale, setLocale] = useState<ResearchLocale>(DEFAULT_RESEARCH_LOCALE);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedStallionId(defaultStallionId);
    setDescription("");
    setLocale(DEFAULT_RESEARCH_LOCALE);
    setErrorMessage(null);
  }, [defaultStallionId, open]);

  useEffect(() => {
    if (!open || !showStallionNameInput) return;
    let active = true;

    async function loadStallions() {
      setLoadingStallions(true);
      const result = await fetchResearchStallionOptions();

      if (!active) return;

      if (!result.ok) {
        setErrorMessage(result.error);
        setStallionOptions([]);
      } else {
        setStallionOptions(result.options);
        if (!selectedStallionId && result.options.length > 0) {
          setSelectedStallionId(result.options[0].id);
        }
      }
      setLoadingStallions(false);
    }

    loadStallions();

    return () => {
      active = false;
    };
  }, [open, showStallionNameInput]);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  useEffect(() => {
    if (!open || !showPasteArea) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((i) => i.type.startsWith("image/"));
      if (imageItems.length === 0) return;
      e.preventDefault();
      imageItems.forEach((item) => {
        const file = item.getAsFile();
        if (file) addImageFromFile(file);
      });
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, showPasteArea]);

  function addImageFromFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    setImages((prev) => [
      ...prev,
      { id, file, previewUrl, name: `Image ${prev.length + 1}` },
    ]);
  }

  function updateImageName(id: string, value: string) {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, name: value } : img))
    );
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleCreateResearchStallion() {
    const normalizedDescription = description.trim();
    if (!selectedStallionId) {
      setErrorMessage("Please select a stallion.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await createResearchSnippet({
        stallionId: selectedStallionId,
        description: normalizedDescription || null,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setOpen(false);
      setSelectedStallionId(defaultStallionId);
      setDescription("");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create research stallion.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadResearchImages() {
    if (!snippetId) {
      setErrorMessage("Missing snippet id for upload.");
      return;
    }
    if (images.length === 0) {
      setErrorMessage("Paste at least one image before upload.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await uploadResearchImages({
        snippetId,
        locale,
        images: images.map((img) => ({
          file: img.file,
          name: img.name,
        })),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setImages([]);
      setLocale(DEFAULT_RESEARCH_LOCALE);
      setOpen(false);
      if (onAfterUpload) {
        onAfterUpload();
      } else {
        router.refresh();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload research images.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  const modalFooter = showStallionNameInput ? (
    <Button
      type="button"
      variant="gold"
      size="md"
      loading={saving}
      onClick={handleCreateResearchStallion}
      className="rounded-md border-[#c09a64] bg-[#c09a64] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:bg-[#c09a64] hover:opacity-90"
    >
      {saving ? "Creating..." : "Create"}
    </Button>
  ) : showPasteArea ? (
    <Button
      type="button"
      variant="gold"
      size="md"
      loading={saving}
      onClick={handleUploadResearchImages}
      className="rounded-md border-[#c09a64] bg-[#c09a64] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:bg-[#c09a64] hover:opacity-90"
    >
      {saving ? "Uploading..." : "Upload"}
    </Button>
  ) : undefined;

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        size="none"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-800"
      >
        {buttonLabel}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="lg"
        preventClose={saving}
        footer={modalFooter}
      >
        {showStallionNameInput ? (
          <div>
            <Label>Stallion</Label>
            <Select
              value={selectedStallionId}
              onChange={(e) => setSelectedStallionId(e.target.value)}
              disabled={loadingStallions || saving}
            >
              {stallionOptions.length === 0 ? (
                <option value="">
                  {loadingStallions ? "Loading stallions..." : "No stallions found"}
                </option>
              ) : null}
              {stallionOptions.map((stallion) => (
                <option key={stallion.id} value={stallion.id}>
                  {stallion.stallion_name?.trim() || "Unnamed Stallion"}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {showStallionNameInput ? (
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description"
              rows={3}
            />
          </div>
        ) : null}

        {showPasteArea ? (
          <div>
            <Label>Language</Label>
            <Select
              value={locale}
              onChange={(e) => setLocale(e.target.value as ResearchLocale)}
              disabled={saving}
            >
              {researchLocaleSelectOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              Applies to every image in this upload.
            </p>
          </div>
        ) : null}

        {showPasteArea ? (
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-950/60 p-4 text-sm text-slate-400 outline-none focus:border-sky-500">
            Paste image from clipboard any time while this modal is open (Ctrl/Cmd +
            V)
          </div>
        ) : null}

        {showPasteArea && images.length > 0 ? (
          <ul className="space-y-3">
            {images.map((img) => (
              <li
                key={img.id}
                className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-[140px_1fr_auto]"
              >
                <img
                  src={img.previewUrl}
                  alt={img.name || "Pasted clipboard image"}
                  className="h-24 w-full rounded object-cover"
                />
                <div>
                  <Label>Image Name</Label>
                  <Input
                    value={img.name}
                    onChange={(e) => updateImageName(img.id, e.target.value)}
                    placeholder="Enter image name"
                  />
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeImage(img.id)}
                  className="h-fit"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : showPasteArea ? (
          <p className="text-xs text-slate-500">No pasted images yet.</p>
        ) : null}

        <ErrorText className="text-xs text-red-300">{errorMessage}</ErrorText>
      </Modal>
    </>
  );
}
