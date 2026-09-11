import type { Stallion } from "@/types/stallion";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { getTranslations } from "next-intl/server";

export default async function OverviewBlock({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.overview");
  const text = stallion.summary?.trim();

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>{t("title")}</h2>
      {text ? (
        <p className="profile-canvas-body mt-4 max-w-none whitespace-pre-line text-base leading-7 text-white/60">
          {text}
        </p>
      ) : null}
    </section>
  );
}
