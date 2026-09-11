import type { GeneticTestEntry, Stallion } from "@/types/stallion";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { getTranslations } from "next-intl/server";

type GeneticItem = { key: string; value: string; geneCode?: string };

function parseTestingString(raw?: string): GeneticItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  return text
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const byDash = chunk.split(/\s*[-:]\s*/);
      if (byDash.length >= 2) {
        const [key, ...rest] = byDash;
        return {
          key: key.trim().toUpperCase(),
          value: rest.join(" - ").trim(),
        };
      }
      return { key: chunk.trim().toUpperCase(), value: "" };
    });
}

function fromGeneticTests(rows: GeneticTestEntry[]): GeneticItem[] {
  return rows
    .map((entry) => ({
      key: entry.test_type.toUpperCase(),
      value: entry.result?.trim() ?? "",
      geneCode: entry.gene_code,
    }))
    .filter((item) => item.key.length > 0);
}

function resultColor(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "text-grey";

  if (/carrier|n\/h|n\/mh|n\/myhm/i.test(normalized)) {
    return "text-[#8eb694]";
  }

  if (/\bn\/n\b/i.test(normalized)) {
    return "text-grey";
  }

  return "text-grey";
}

export default async function HealthCard({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.geneticHealth");
  const tCommon = await getTranslations("common");

  const structured = stallion.genetic_tests ?? [];
  const useStructured = structured.length > 0;

  const parsed: GeneticItem[] = useStructured
    ? fromGeneticTests(structured)
    : [
        ...parseTestingString(stallion.genetic_testing_results ?? undefined),
        ...parseTestingString(stallion.genetic_disease_testing_results ?? undefined),
      ];

  const uniqueMap = new Map<string, GeneticItem>();
  for (const item of parsed) {
    if (!uniqueMap.has(item.key)) uniqueMap.set(item.key, item);
  }
  const items = Array.from(uniqueMap.values());
  if (items.length === 0) return null;

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>{t("title")}</h2>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-md bg-surface px-4 py-4 text-base"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-white">{item.key}</span>
              <span className={`shrink-0 text-right ${resultColor(item.value)}`}>
                {item.value || tCommon("empty")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
