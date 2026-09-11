import { getTranslations } from "next-intl/server";

export default async function ProfileSourceDisclaimer() {
  const t = await getTranslations("profile.disclaimer");

  return (
    <aside className="px-5 pb-8 sm:px-8 lg:px-10" aria-label={t("ariaLabel")}>
      <p className="profile-canvas-muted max-w-3xl text-base leading-relaxed text-white/45">
        {t("text")}
      </p>
    </aside>
  );
}
