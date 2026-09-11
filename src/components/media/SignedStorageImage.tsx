"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { bucketForStallionImagePath } from "@/utils/stallion";
import { getStallionImageSignedUrl } from "@/services/stallion";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";

type SignedStorageImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  filename?: string;
  bucketId?: string;
  fallbackSrc?: string;
  loadingClassName?: string;
  signedUrlTtlSeconds?: number;
};

async function resolveSignedImageUrl(params: {
  filename: string;
  bucketId?: string;
  expiresIn: number;
}): Promise<string | null> {
  const bucket =
    params.bucketId || bucketForStallionImagePath(params.filename);

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/stallion-images/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: params.filename,
          bucket,
          expiresIn: params.expiresIn,
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { signedUrl?: string };
        if (payload.signedUrl) return payload.signedUrl;
      }
    } catch {
      // Fall through to client resolver.
    }
  }

  return getStallionImageSignedUrl({
    filename: params.filename,
    bucket,
    expiresIn: params.expiresIn,
  });
}

export default function SignedStorageImage({
  filename,
  bucketId,
  fallbackSrc = STALLION_IMAGE_PLACEHOLDER_SRC,
  loadingClassName = "h-full w-full animate-pulse bg-zinc-800",
  signedUrlTtlSeconds = 3600,
  alt = "",
  ...imgProps
}: SignedStorageImageProps) {
  const normalizedFilename = useMemo(() => {
    const value = (filename ?? "").trim();
    return value ? value.replace(/^\/+/, "") : "";
  }, [filename]);

  const isDataUrl = normalizedFilename.startsWith("data:");
  // Public-bucket photos (published stallions/mares) already arrive as a
  // plain, stable URL — resolving them again through the signed-url API
  // would just echo the same value back after a wasted round trip.
  const isAlreadyResolvedUrl =
    isDataUrl ||
    normalizedFilename.startsWith("http://") ||
    normalizedFilename.startsWith("https://");
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(normalizedFilename) && !isAlreadyResolvedUrl
  );

  useEffect(() => {
    if (!normalizedFilename || isAlreadyResolvedUrl) {
      setResolvedSrc(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void resolveSignedImageUrl({
      filename: normalizedFilename,
      bucketId,
      expiresIn: signedUrlTtlSeconds,
    }).then((url) => {
      if (cancelled) return;
      setResolvedSrc(url);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedFilename, bucketId, signedUrlTtlSeconds, isAlreadyResolvedUrl]);

  if (!normalizedFilename) {
    return <img {...imgProps} src={fallbackSrc} alt={alt} />;
  }

  if (isAlreadyResolvedUrl) {
    return <img {...imgProps} src={normalizedFilename} alt={alt} />;
  }

  if (isLoading) {
    return <div aria-busy="true" className={loadingClassName} />;
  }

  return <img {...imgProps} src={resolvedSrc || fallbackSrc} alt={alt} />;
}
