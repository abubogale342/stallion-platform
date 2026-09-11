import { cn } from "@/utils/common";

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/embed\/([^/?]+)/);
    if (m) return m[1] ?? null;
    const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1] ?? null;
  } catch {
    return null;
  }
  return null;
}

function captionClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function figureClass(align?: "left" | "center" | "right"): string {
  if (align === "center") return "mx-auto max-w-4xl space-y-2";
  if (align === "right") return "ml-auto mr-0 max-w-4xl space-y-2";
  return "max-w-4xl space-y-2";
}

export default function CmsVideo({
  url,
  caption,
  align,
}: {
  url: string;
  caption?: string;
  align?: "left" | "center" | "right";
}) {
  const id = extractYoutubeId(url.trim());
  if (!id) {
    return (
      <div className={figureClass(align)}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-sky-400 underline hover:text-sky-300"
        >
          Open video
        </a>
        {caption ? (
          <p className={cn("text-xs text-zinc-500", captionClass(align))}>{caption}</p>
        ) : null}
      </div>
    );
  }

  return (
    <figure className={figureClass(align)}>
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <iframe
          title={caption || "Video"}
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {caption ? (
        <figcaption className={cn("text-xs text-zinc-500", captionClass(align))}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
