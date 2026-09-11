import type { Stallion } from "@/types/stallion";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { getTranslations } from "next-intl/server";

export default async function BreedingSummaryBlock({
  stallion,
}: {
  stallion: Stallion;
}) {
  const text = stallion.breeding_notes?.trim();
  if (!text) return null;

  const t = await getTranslations("profile.breedingSummary");

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>{t("title")}</h2>
      <p className="mt-4 max-w-none whitespace-pre-line text-base leading-7 text-white/60">
        {text}
      </p>
    </section>
  );
}
