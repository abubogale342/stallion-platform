"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import Select from "@/ui/Select";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "language.english",
  "pt-BR": "language.portuguese",
};

export default function LanguageSelector({
  className,
  id = "language-selector",
}: {
  className?: string;
  id?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className={className}>
      <label className="sr-only" htmlFor={id}>
        {t("nav.language")}
      </label>
      <Select
        id={id}
        variant="nav"
        value={locale}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as AppLocale)}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {t(LOCALE_LABELS[loc])}
          </option>
        ))}
      </Select>
    </div>
  );
}
