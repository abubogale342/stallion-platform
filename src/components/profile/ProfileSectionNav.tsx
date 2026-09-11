"use client";

import { useTranslations } from "next-intl";
import Button from "@/ui/Button";

const STALLION_ITEMS = [
  { id: "overview", key: "overview" },
  { id: "pedigree", key: "pedigree" },
  { id: "performance", key: "performance" },
  { id: "breeding-statistics", key: "breedingStatistics" },
  { id: "notable-progeny", key: "notableProgeny" },
  { id: "genetic-testing", key: "geneticTesting" },
  { id: "color-testing", key: "colorTesting" },
  { id: "media", key: "media" },
] as const;

/** Donor mare profiles: ET Program tab instead of a breeding tab (per Figma). */
const MARE_ITEMS = [
  { id: "overview", key: "overview" },
  { id: "pedigree", key: "pedigree" },
  { id: "performance", key: "performance" },
  // Spec §4: the mare tab is labelled "Progeny Record".
  { id: "notable-progeny", key: "progenyRecord" },
  { id: "et-program", key: "etProgram" },
  { id: "genetic-testing", key: "geneticTesting" },
  { id: "color-testing", key: "colorTesting" },
  { id: "media", key: "media" },
] as const;

export default function ProfileSectionNav({
  variant = "stallion",
}: {
  variant?: "stallion" | "mare";
}) {
  const t = useTranslations("profile.sectionNav");
  const ITEMS = variant === "mare" ? MARE_ITEMS : STALLION_ITEMS;

  const handleScrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section>
      <div className="overflow-x-auto">
        <nav className="profile-tabbar flex min-w-max items-center gap-8 px-5 py-3 text-[14px] text-white/85 sm:px-8 sm:text-[15px] lg:min-w-0 lg:justify-between lg:gap-4 lg:px-10 lg:text-[16px]">
          {ITEMS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="unstyled"
              size="none"
              onClick={() => handleScrollTo(item.id)}
              className="cursor-pointer whitespace-nowrap transition-opacity hover:opacity-80 hover:text-gold lg:flex-1 lg:text-center"
            >
              {t(item.key)}
            </Button>
          ))}
        </nav>
      </div>
    </section>
  );
}
