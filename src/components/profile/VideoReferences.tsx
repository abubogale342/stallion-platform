import type { Stallion } from "@/types/stallion";
import Section from "./Section";
import { getTranslations } from "next-intl/server";

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

export default async function VideoReferences({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.videoReferences");
  const videoUrl = stallion.media?.video_url;
  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;

  return (
    <Section
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {!videoUrl ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[16px] leading-relaxed text-zinc-500 md:text-[17px]">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="aspect-video bg-zinc-100">
              {ytId ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={t("iframeTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-[16px] leading-relaxed text-zinc-600 md:text-[17px]">
                  {t("embedUnavailable")} <br />
                  {t("useLinkBelow")}
                </div>
              )}
            </div>
            <div className="border-t border-zinc-200 p-4">
              <p className="text-[14px] font-medium leading-snug text-zinc-500 md:text-[15px]">
                {t("referenceVideo")}
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[16px] text-blue-600 hover:underline md:text-[17px]"
              >
                {t("openVideoLink")}
              </a>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
