import type { ColourTestEntry, Stallion } from "@/types/stallion";
import { profileSectionTitleClassName } from "@/components/profile/sectionTitle";
import { getTranslations } from "next-intl/server";

type ColourItem = { key: string; label: string; result: string };

function parseLegacyColourTesting(raw?: string): ColourItem[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((token) => {
      const byDash = token.split(/\s*[-:]\s*/);
      if (byDash.length >= 2) {
        const [name, ...rest] = byDash;
        return {
          key: name.trim().toLowerCase(),
          label: name.trim(),
          result: rest.join(" - ").trim(),
        };
      }
      return { key: token.toLowerCase(), label: token, result: "" };
    });
}

function fromColourTests(rows: ColourTestEntry[]): ColourItem[] {
  return rows
    .map((entry) => ({
      key: entry.colour_test.toLowerCase(),
      label: entry.colour_test,
      result: entry.result?.trim() ?? "",
    }))
    .filter((item) => item.label.length > 0);
}

export default async function ColourTestingSection({
  stallion,
}: {
  stallion: Stallion;
}) {
  const t = await getTranslations("profile.colourTesting");

  const structured = stallion.colour_tests ?? [];
  const items: ColourItem[] = structured.length > 0
    ? fromColourTests(structured)
    : parseLegacyColourTesting(stallion.colour_testing_results ?? undefined);

  if (items.length === 0) return null;

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>{t("title")}</h2>

      <div className="mt-5 flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item.key}
            className="rounded-sm border border-white/10 bg-surface px-4 py-3 text-[16px] text-white"
          >
            {item.result ? `${item.label} — ${item.result}` : item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
