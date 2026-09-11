import type { Stallion } from "@/types/stallion";
import Section from "./Section";
import { getTranslations } from "next-intl/server";

export default async function DisciplineCoverage({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.disciplineCoverage");
  const disciplines = (stallion.discipline_focus ?? []).filter(Boolean);

  return (
    <Section
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {disciplines.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {disciplines.map((discipline) => (
            <span
              key={discipline}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-200"
            >
              {discipline}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[16px] leading-[1.55] text-zinc-300 md:text-[17px] md:leading-[1.6]">
          {stallion.discipline_coverage_description || t("empty")}
        </p>
      )}
    </Section>
  );
}
