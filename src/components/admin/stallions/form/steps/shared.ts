import { STALLION_STANDING_COUNTRIES } from "@/utils/stallion";

export function newRowId(): string {
  return `row-${Math.random().toString(36).slice(2, 11)}`;
}

export const COUNTRY_OF_RESIDENCE_OPTIONS = [
  { value: "", label: "Select country…" },
  ...STALLION_STANDING_COUNTRIES.map((c) => ({
    value: c.label,
    label: c.label,
  })),
];
