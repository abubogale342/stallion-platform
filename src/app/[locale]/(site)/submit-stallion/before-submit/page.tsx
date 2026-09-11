"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/ui/Button";

export default function StallionRequestPage() {
  const t = useTranslations("submit.beforeSubmit");

  return (
    <div className="max-w-3xl mx-auto py-20 px-6 text-center">
      <h1 className="text-3xl font-bold text-white mb-8 uppercase tracking-widest">
        {t("title")}
      </h1>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-none p-10 text-left mb-10">
        <p className="text-zinc-300 mb-8 leading-relaxed">{t("intro")}</p>

        <ul className="space-y-6 text-zinc-400 text-sm mb-10">
          <li className="flex items-start gap-4">
            <span className="text-[#b08d57] font-bold">•</span>
            <span>{t("step1")}</span>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-[#b08d57] font-bold">•</span>
            <span>{t("step2")}</span>
          </li>
        </ul>
      </div>

      <Link
        href="/submit-stallion"
        className={buttonClassName({
          variant: "goldSubmit",
          size: "cms",
          className: "inline-block px-12",
        })}
      >
        {t("cta")}
      </Link>
    </div>
  );
}
