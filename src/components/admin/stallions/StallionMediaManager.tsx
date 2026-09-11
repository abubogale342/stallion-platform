"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/stallions/form/fields";
import PublishStatusBadge from "@/components/admin/stallions/PublishStatusBadge";
import {
  isManagedStallionPhotoPath,
  persistStallionMediaMetadataFromBrowser,
  removeStallionPhotoPaths,
  updateStallionVideoUrl,
  uploadStallionPhoto,
} from "@/services/stallion";
import { syncPublishedStallionPhotosAction } from "@/app/dashboard/stallions/actions";
import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import type { FormGalleryItem } from "@/types/stallion-form";
import Button from "@/ui/Button";
import MediaPreview from "./media/MediaPreview";
import { useStallionPermissions } from "@/components/admin/DashboardRoleContext";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

export type StallionMediaGalleryItem = {
  id: string;
  storagePath?: string;
  previewUrl?: string;
  fileName?: string;
  uploading?: boolean;
};

export type StallionMediaInitial = {
  primaryStoragePath?: string;
  gallery: { storagePath: string }[];
  videoUrl?: string;
};

function newItemId(): string {
  return `media-${Math.random().toString(36).slice(2, 11)}`;
}

function galleryToFormItems(items: StallionMediaGalleryItem[]): FormGalleryItem[] {
  return items
    .filter((g) => g.storagePath?.trim())
    .map((g) => ({
      tempId: g.id,
      url: g.storagePath!.trim(),
    }));
}

export default function StallionMediaManager({
  stallionId,
  stallionName,
  publishStatus,
  initial,
}: {
  stallionId: string;
  stallionName: string;
  publishStatus: AdminStallionPublishStatus;
  initial: StallionMediaInitial;
}) {
  const { canDeleteChildren } = useStallionPermissions();
  const primaryInputId = useId();
  const galleryInputId = useId();
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [primaryStoragePath, setPrimaryStoragePath] = useState(
    initial.primaryStoragePath ?? ""
  );
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState<string | null>(
    null
  );
  const [primaryUploading, setPrimaryUploading] = useState(false);

  const [gallery, setGallery] = useState<StallionMediaGalleryItem[]>(() =>
    initial.gallery.map((g) => ({
      id: newItemId(),
      storagePath: g.storagePath,
    }))
  );

  const [videoUrl, setVideoUrl] = useState(initial.videoUrl ?? "");
  const [savingVideo, setSavingVideo] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);

  const primaryPathRef = useRef(primaryStoragePath);
  const galleryRef = useRef(gallery);
  primaryPathRef.current = primaryStoragePath;
  galleryRef.current = gallery;

  const revokePreview = useCallback((url: string | null | undefined) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreview(primaryPreviewUrl);
      gallery.forEach((item) => revokePreview(item.previewUrl));
    };
  }, [gallery, primaryPreviewUrl, revokePreview]);

  const persistMedia = useCallback(
    async (
      primaryPath: string,
      galleryItems: StallionMediaGalleryItem[]
    ): Promise<boolean> => {
      const result = await persistStallionMediaMetadataFromBrowser(stallionId, {
        primary_image_url: primaryPath,
        gallery: galleryToFormItems(galleryItems),
      });

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      if (publishStatus === "published") {
        const sync = await syncPublishedStallionPhotosAction(stallionId);
        if (!sync.ok) {
          toast.warning(`Photos saved, but ${sync.error.toLowerCase()}`);
        }
      }

      return true;
    },
    [stallionId, publishStatus]
  );

  async function handlePrimaryPick(file: File | undefined) {
    if (!file) return;

    const previousPath = primaryPathRef.current.trim();
    revokePreview(primaryPreviewUrl);
    const blobPreview = URL.createObjectURL(file);
    setPrimaryPreviewUrl(blobPreview);
    setPrimaryUploading(true);

    try {
      const upload = await uploadStallionPhoto({
        file,
        stallionId,
        kind: "primary",
        slugHint: stallionName,
      });

      if ("error" in upload) {
        toast.error(upload.error);
        revokePreview(blobPreview);
        setPrimaryPreviewUrl(null);
        return;
      }

      revokePreview(blobPreview);
      setPrimaryPreviewUrl(null);
      setPrimaryStoragePath(upload.path);
      primaryPathRef.current = upload.path;

      const ok = await persistMedia(upload.path, galleryRef.current);
      if (!ok) return;

      if (
        previousPath &&
        previousPath !== upload.path &&
        isManagedStallionPhotoPath(previousPath)
      ) {
        await removeStallionPhotoPaths([previousPath]);
      }

      toast.success("Primary photo saved.");
    } finally {
      setPrimaryUploading(false);
      if (primaryInputRef.current) primaryInputRef.current.value = "";
    }
  }

  async function removePrimary() {
    const previousPath = primaryPathRef.current.trim();
    revokePreview(primaryPreviewUrl);
    setPrimaryPreviewUrl(null);
    setPrimaryStoragePath("");
    primaryPathRef.current = "";

    const ok = await persistMedia("", galleryRef.current);
    if (!ok) {
      setPrimaryStoragePath(previousPath);
      primaryPathRef.current = previousPath;
      return;
    }

    if (previousPath && isManagedStallionPhotoPath(previousPath)) {
      await removeStallionPhotoPaths([previousPath]);
    }

    toast.success("Primary photo removed.");
  }

  async function handleGalleryPick(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setGalleryBusy(true);

    try {
      let nextGallery = [...galleryRef.current];

      for (const file of list) {
        const id = newItemId();
        const previewUrl = URL.createObjectURL(file);
        const placeholder: StallionMediaGalleryItem = {
          id,
          previewUrl,
          fileName: file.name,
          uploading: true,
        };

        nextGallery = [...nextGallery, placeholder];
        galleryRef.current = nextGallery;
        setGallery(nextGallery);

        const upload = await uploadStallionPhoto({
          file,
          stallionId,
          kind: "gallery",
          slugHint: stallionName,
        });

        if ("error" in upload) {
          toast.error(`${file.name}: ${upload.error}`);
          revokePreview(previewUrl);
          nextGallery = nextGallery.filter((g) => g.id !== id);
          galleryRef.current = nextGallery;
          setGallery(nextGallery);
          continue;
        }

        revokePreview(previewUrl);
        nextGallery = nextGallery.map((g) =>
          g.id === id
            ? {
                ...g,
                storagePath: upload.path,
                previewUrl: undefined,
                uploading: false,
              }
            : g
        );
        galleryRef.current = nextGallery;
        setGallery(nextGallery);

        const ok = await persistMedia(primaryPathRef.current, nextGallery);
        if (!ok) {
          nextGallery = nextGallery.filter((g) => g.id !== id);
          galleryRef.current = nextGallery;
          setGallery(nextGallery);
          if (isManagedStallionPhotoPath(upload.path)) {
            await removeStallionPhotoPaths([upload.path]);
          }
          return;
        }
      }

      if (list.length > 0) {
        toast.success(
          list.length === 1
            ? "Gallery image saved."
            : `${list.length} gallery images saved.`
        );
      }
    } finally {
      setGalleryBusy(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function removeGalleryItem(id: string) {
    const item = galleryRef.current.find((g) => g.id === id);
    const pathToDelete = item?.storagePath?.trim();

    revokePreview(item?.previewUrl);
    const nextGallery = galleryRef.current.filter((g) => g.id !== id);
    galleryRef.current = nextGallery;
    setGallery(nextGallery);

    const ok = await persistMedia(primaryPathRef.current, nextGallery);
    if (!ok) {
      if (item) {
        setGallery([...nextGallery, item]);
        galleryRef.current = [...nextGallery, item];
      }
      return;
    }

    if (pathToDelete && isManagedStallionPhotoPath(pathToDelete)) {
      await removeStallionPhotoPaths([pathToDelete]);
    }

    toast.success("Gallery image removed.");
  }

  async function saveVideoUrl() {
    setSavingVideo(true);
    try {
      const result = await updateStallionVideoUrl(stallionId, videoUrl);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Video URL saved.");
    } finally {
      setSavingVideo(false);
    }
  }

  const primaryBusy = primaryUploading;
  const hasPrimary = Boolean(
    primaryUploading || primaryPreviewUrl || primaryStoragePath.trim()
  );

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/dashboard/stallions"
          className="text-xs font-medium text-slate-500 hover:text-slate-300"
        >
          ← Back to stallions
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/80">
              Stallion media
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100">
                {stallionName}
              </h1>
              <PublishStatusBadge status={publishStatus} />
            </div>
            <p className="font-mono text-xs text-slate-600">{stallionId}</p>
          </div>
          <Link
            href={`/dashboard/stallions/${stallionId}/edit`}
            className="text-xs font-medium text-sky-400/90 hover:text-sky-300 hover:underline"
          >
            Full editor
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          Photos upload to storage and save to the database as soon as each file
          is added. Gallery multi-select uploads one file at a time, saving after
          each.
        </p>
      </div>

      <SectionCard title="Primary photo">
        <div className="relative inline-block max-w-full">
          <MediaPreview
            storagePath={
              primaryPreviewUrl || primaryUploading
                ? undefined
                : primaryStoragePath
            }
            previewUrl={primaryPreviewUrl ?? undefined}
            uploading={primaryUploading}
            alt={`${stallionName} primary`}
            className="h-56 w-full max-w-md rounded-lg border border-slate-700/80 object-cover"
          />
          {hasPrimary && !primaryBusy && canDeleteChildren ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={primaryBusy || galleryBusy}
              onClick={() => void removePrimary()}
              className="absolute right-2 top-2 border-red-500/40 bg-slate-950/90 text-red-300 hover:bg-red-950/80"
            >
              Remove
            </Button>
          ) : null}
        </div>
        <div>
          <label
            htmlFor={primaryInputId}
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Upload primary
          </label>
          <input
            id={primaryInputId}
            ref={primaryInputRef}
            type="file"
            accept={ACCEPT_IMAGES}
            disabled={primaryBusy || galleryBusy}
            className="block w-full max-w-md text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-violet-900/50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-violet-100 hover:file:bg-violet-900/70 disabled:opacity-50"
            onChange={(e) => void handlePrimaryPick(e.target.files?.[0])}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Gallery"
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={primaryBusy || galleryBusy}
            onClick={() => galleryInputRef.current?.click()}
            className="border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
          >
            {galleryBusy ? "Uploading…" : "Add images"}
          </Button>
        }
      >
        <input
          id={galleryInputId}
          ref={galleryInputRef}
          type="file"
          accept={ACCEPT_IMAGES}
          multiple
          disabled={primaryBusy || galleryBusy}
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files;
            if (picked?.length) void handleGalleryPick(picked);
          }}
        />
        {gallery.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
            No gallery images yet. Use &quot;Add images&quot; to upload.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {gallery.map((item, index) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-lg border border-slate-700/90 bg-slate-900/50"
              >
                <div className="relative aspect-[4/3] bg-slate-900">
                  <MediaPreview
                    storagePath={
                      item.previewUrl || item.uploading
                        ? undefined
                        : item.storagePath
                    }
                    previewUrl={item.previewUrl}
                    uploading={item.uploading}
                    alt={`${stallionName} gallery ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {!item.uploading && canDeleteChildren ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={primaryBusy || galleryBusy}
                      onClick={() => void removeGalleryItem(item.id)}
                      className="absolute right-2 top-2 border-red-500/40 bg-slate-950/90 px-2 py-0.5 text-red-300 hover:bg-red-950/80"
                      aria-label={`Remove gallery image ${index + 1}`}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Video">
        <label className="block text-xs font-medium text-slate-400">
          Video URL
          <input
            type="url"
            value={videoUrl}
            disabled={savingVideo}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={savingVideo || primaryBusy || galleryBusy}
          onClick={() => void saveVideoUrl()}
          className="border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
        >
          {savingVideo ? "Saving…" : "Save video URL"}
        </Button>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-6">
        <Link
          href="/dashboard/stallions"
          className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
