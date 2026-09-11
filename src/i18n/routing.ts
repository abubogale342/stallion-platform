import { defineRouting } from "next-intl/routing";

export const locales = ["en", "pt-BR"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
