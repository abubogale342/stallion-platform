"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import SignedStorageImage from "@/components/media/SignedStorageImage";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";
import MediaPreviewModal from "@/ui/MediaPreviewModal";
import { useTranslations } from "next-intl";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    return null;
  } catch {
    return null;
  }
}

export default function PhotoGallery({ stallion }: { stallion: any }) {
  const t = useTranslations("profile.media");
  const galleryImages =
    stallion?.media?.gallery
      ?.map((item: { filename: string }) => item.filename)
      .filter(Boolean) ||
    stallion?.media?.galleryUrls?.filter((filename: string) => filename !== "") ||
    [];
  const videoUrl = stallion?.media?.video_url as string | undefined;
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const videoThumb = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : undefined;
  const hasMedia = galleryImages.length > 0 || Boolean(videoUrl);
  if (!hasMedia) return null;

  const stallionFallback = stallion?.stallion_name || t("stallionFallback");

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>
        {t("title")}
      </h2>

      <div className="mt-5 flex flex-wrap gap-4">
        {galleryImages.map((filename: string, idx: number) => (
          <MediaPreviewModal
            key={idx}
            ariaLabel={t("openImage", { index: idx + 1 })}
            trigger={
              <figure className="group h-32 w-full overflow-hidden rounded border border-white/10 bg-surface transition hover:border-white/20 sm:w-[250px]">
                <SignedStorageImage
                  filename={filename}
                  fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
                  alt={`${stallionFallback} media ${idx + 1}`}
                  className="h-full w-full object-cover object-center"
                  loadingClassName="h-full w-full animate-pulse bg-zinc-800"
                />
              </figure>
            }
          >
            <SignedStorageImage
              filename={filename}
              fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
              alt={`${stallionFallback} media ${idx + 1}`}
              className="h-auto max-h-[92vh] w-full object-contain object-center"
              loadingClassName="h-[60vh] w-full animate-pulse bg-zinc-800"
            />
          </MediaPreviewModal>
        ))}

        {videoUrl ? (
          <MediaPreviewModal
            ariaLabel={t("openVideoPreview")}
            trigger={
              <div className="group relative h-32 w-full overflow-hidden rounded border border-white/10 bg-surface transition hover:border-white/20 sm:w-[250px]">
                {videoThumb ? (
                  <img
                    src={videoThumb}
                    alt={t("videoThumbnail")}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-300">
                    {t("video")}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black">
                    ▶
                  </span>
                </div>
              </div>
            }
          >
            {youtubeId ? (
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                  title={t("videoPreviewTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded border border-white/20 px-4 py-2 text-white hover:bg-white/10"
              >
                {t("openVideoLink")}
              </a>
            )}
          </MediaPreviewModal>
        ) : null}
      </div>
    </section>
  );
}
