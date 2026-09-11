import Image from "next/image";

/**
 * The 16×16 mark that sits left of a business name in both public directories
 * (Figma 411:2458 associations, 411:2018 commercial).
 *
 * The box is rendered whether or not a logo exists: staff will be entering
 * directory rows long before every entry has a mark, and reserving the space
 * keeps the names in a single column instead of ragged. Rows without one get a
 * neutral grey square.
 */
export default function DirectoryLogo({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="block size-4 shrink-0 rounded-[2px] bg-line"
      />
    );
  }

  return (
    <Image
      src={src}
      // Decorative: the business name sits immediately beside it in the same
      // cell, so announcing the logo too would just repeat the row's name.
      alt=""
      aria-hidden
      width={16}
      height={16}
      // Logos arrive at whatever aspect ratio the organisation uses, so contain
      // rather than crop — a squashed or cropped mark reads as a broken one.
      className="size-4 shrink-0 rounded-[2px] object-contain"
      unoptimized
      title={name}
    />
  );
}
