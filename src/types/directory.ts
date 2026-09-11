/**
 * Shared vocabulary for the two reference directories behind the public
 * Resources pages. Kept out of `directory.server.ts` so client components can
 * import it without pulling in `server-only`.
 */
export type DirectoryKind = "commercial" | "associations";

export const DIRECTORY_KINDS: DirectoryKind[] = ["commercial", "associations"];

export function isDirectoryKind(value: unknown): value is DirectoryKind {
  return value === "commercial" || value === "associations";
}

export const DIRECTORY_LABELS: Record<
  DirectoryKind,
  { label: string; focusLabel: string; publicPath: string; singular: string }
> = {
  commercial: {
    label: "Commercial Directory",
    focusLabel: "Focus",
    publicPath: "/resources",
    singular: "provider",
  },
  associations: {
    label: "Associations & Registries",
    focusLabel: "Focus / Breed",
    publicPath: "/resources/associations",
    singular: "association",
  },
};
