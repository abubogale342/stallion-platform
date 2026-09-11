import type { AdminStallionPublishStatus } from "@/types/admin-stallions";

export const TRANSLATABLE_PROFILE_LOCALES = ["pt-BR"] as const;
export type TranslatableProfileLocale = (typeof TRANSLATABLE_PROFILE_LOCALES)[number];

export type BreedingMethodLabels = Record<string, string>;

export type StallionProfileTranslationRow = {
  id: string;
  stallion_id: string;
  locale: string;
  summary: string | null;
  performance_summary: string | null;
  breeding_summary: string | null;
  coat_colour: string | null;
  breed_label: string | null;
  discipline_coverage: string | null;
  breeding_method_labels: BreedingMethodLabels;
  publish_status: AdminStallionPublishStatus;
  created_at: string;
  updated_at: string;
};

export type StallionProfileTranslationFormValues = {
  locale: TranslatableProfileLocale;
  summary: string;
  performance_summary: string;
  breeding_summary: string;
  coat_colour: string;
  breed_label: string;
  discipline_coverage: string;
  breeding_method_labels: BreedingMethodLabels;
  publish_status: AdminStallionPublishStatus;
};

export type TranslationIdentityFieldKey =
  | "coat_colour"
  | "breed_label"
  | "discipline_coverage";

export function isDefaultProfileLocale(locale: string): boolean {
  return locale === "en";
}

export function isTranslatableProfileLocale(
  locale: string
): locale is TranslatableProfileLocale {
  return (TRANSLATABLE_PROFILE_LOCALES as readonly string[]).includes(locale);
}
