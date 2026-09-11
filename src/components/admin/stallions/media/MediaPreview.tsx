import SignedStorageImage from "@/components/media/SignedStorageImage";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";

export default function MediaPreview({
  storagePath,
  previewUrl,
  uploading,
  alt,
  className = "h-48 w-full max-w-md rounded-lg object-cover",
}: {
  storagePath?: string;
  previewUrl?: string;
  uploading?: boolean;
  alt: string;
  className?: string;
}) {
  if (uploading) {
    return (
      <div
        aria-busy="true"
        className={`flex items-center justify-center bg-slate-800 text-xs text-slate-500 ${className}`}
      >
        Uploading…
      </div>
    );
  }

  if (previewUrl) {
    return <img src={previewUrl} alt={alt} className={className} />;
  }

  if (storagePath?.trim()) {
    return (
      <SignedStorageImage
        filename={storagePath}
        alt={alt}
        fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
        className={className}
        loadingClassName={`animate-pulse rounded-lg bg-slate-800 ${className}`}
      />
    );
  }

  return (
    <img
      src={STALLION_IMAGE_PLACEHOLDER_SRC}
      alt={alt}
      className={className}
    />
  );
}
