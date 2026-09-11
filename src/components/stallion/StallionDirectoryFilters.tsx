"use client";

import debounce from "lodash.debounce";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import DirectoryFilterSelect from "@/components/stallion/DirectoryFilterSelect";
import PedigreeBloodlineFilters from "@/components/stallion/PedigreeBloodlineFilters";
import {
  BLOODLINE_PARAM,
  serializeBloodlineConditions,
} from "@/utils/bloodline-search";
import type { BloodlineCondition } from "@/utils/bloodline-search";
import {
  CANONICAL_COAT_COLOURS,
  coatColourLabel,
} from "@/utils/coat-colour-i18n";
import { useRouter } from "@/i18n/navigation";
import type { StallionBreed, SemenAvailability } from "@/types/stallion";
import { STALLION_STANDING_COUNTRIES } from "@/utils/stallion";
import {
  buildStallionDirectoryHref,
  hasActiveDirectoryFilters,
  parseDirectoryAvailabilityFilter,
  parseDirectoryBreedFilter,
  parseDirectoryFiltersFromSearchParams,
} from "@/utils/stallion";
import { SEMEN_AVAILABILITY_MESSAGE_KEYS } from "@/utils/semen-availability-i18n";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Bloodline (ancestor) search controls. Hidden per client request 2026-07,
 * restored 2026-09 at the client's request.
 *
 * These stand on their own: each condition names an ancestor and pins it to its
 * own generations and line, and the keyword field above goes back to matching
 * the horse's own name.
 */
const SHOW_BLOODLINE_FILTERS = true;

const COUNTRY_KEYS: Record<string, string> = {
  Australia: "australia",
  Austria: "austria",
  Brazil: "brazil",
  Canada: "canada",
  Colombia: "colombia",
  Germany: "germany",
  Italy: "italy",
  Mexico: "mexico",
  "New Zealand": "newZealand",
  Poland: "poland",
  Portugal: "portugal",
  UK: "uk",
  USA: "usa",
};

const BREED_VALUES: StallionBreed[] = ["Quarter Horse", "Paint", "Appaloosa"];
const BREED_KEYS: Record<StallionBreed, string> = {
  "Quarter Horse": "quarterHorse",
  Paint: "paint",
  Appaloosa: "appaloosa",
};

const AVAILABILITY_VALUES: SemenAvailability[] = [
  "Method not disclosed",
  "Fresh",
  "Chilled",
  "Cooled",
  "Frozen",
  "ICSI",
  "Combination",
  "Live Cover",
];
const AVAILABILITY_KEYS = SEMEN_AVAILABILITY_MESSAGE_KEYS;

const DISCIPLINE_OPTIONS = [
  "Ranch",
  "Reining",
  "Cutting",
  "Barrel Racing",
  "Racing",
  "Roping",
  "Western Pleasure",
] as const;

const GENETIC_PROFILE_OPTIONS = [
  "HYPP N/N",
  "GBED N/N",
  "HERDA N/N",
  "PSSM N/N",
] as const;

const inputClass =
  "w-full rounded-[4px] border border-[#262626] bg-transparent h-[40px] px-[15px] text-[14px] text-white placeholder:text-[#aaa] outline-none transition-colors focus:border-[#c09a64]/60";

export default function StallionDirectoryFilters({
  total,
  filteredCount,
  mobileCollapsible = false,
}: {
  total?: number;
  filteredCount?: number;
  mobileCollapsible?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("stallions.filters");
  const tCountries = useTranslations("stallions.countries");
  const locale = useLocale();

  const filtersFromUrl = useMemo(
    () => parseDirectoryFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const [keyword, setKeyword] = useState(filtersFromUrl.keyword);
  const [country, setCountry] = useState(filtersFromUrl.country);
  const [breed, setBreed] = useState<StallionBreed | "All">(filtersFromUrl.breed);
  const [availability, setAvailability] = useState<SemenAvailability | "All">(
    filtersFromUrl.availability
  );
  const [color, setColor] = useState(filtersFromUrl.color);
  const [geneticProfile, setGeneticProfile] = useState(filtersFromUrl.geneticProfile);
  const [discipline, setDiscipline] = useState(filtersFromUrl.discipline);
  const [bloodlines, setBloodlines] = useState<BloodlineCondition[]>(
    () => filtersFromUrl.bloodlines
  );

  const [isOpen, setIsOpen] = useState(() => hasActiveDirectoryFilters(searchParams));
  const skipNextUrlPush = useRef(true);

  useEffect(() => {
    skipNextUrlPush.current = true;

    setKeyword((prev) =>
      prev === filtersFromUrl.keyword ? prev : filtersFromUrl.keyword
    );
    setCountry((prev) =>
      prev === filtersFromUrl.country ? prev : filtersFromUrl.country
    );
    setBreed((prev) => (prev === filtersFromUrl.breed ? prev : filtersFromUrl.breed));
    setAvailability((prev) =>
      prev === filtersFromUrl.availability ? prev : filtersFromUrl.availability
    );
    setColor((prev) => (prev === filtersFromUrl.color ? prev : filtersFromUrl.color));
    setGeneticProfile((prev) =>
      prev === filtersFromUrl.geneticProfile ? prev : filtersFromUrl.geneticProfile
    );
    setDiscipline((prev) =>
      prev === filtersFromUrl.discipline ? prev : filtersFromUrl.discipline
    );
    setBloodlines((prev) =>
      // Compare the URL form so a half-typed condition survives the sync.
      serializeBloodlineConditions(prev).join("\u0000") ===
      serializeBloodlineConditions(filtersFromUrl.bloodlines).join("\u0000")
        ? prev
        : filtersFromUrl.bloodlines
    );

    if (hasActiveDirectoryFilters(searchParams)) {
      setIsOpen(true);
    }
  }, [
    filtersFromUrl.keyword,
    filtersFromUrl.country,
    filtersFromUrl.breed,
    filtersFromUrl.availability,
    filtersFromUrl.color,
    filtersFromUrl.geneticProfile,
    filtersFromUrl.discipline,
    filtersFromUrl.bloodlines,
    searchParams,
  ]);

  const debouncedPushFilters = useMemo(() => {
    return debounce(
      (
        q: string,
        nextCountry: string,
        nextBreed: StallionBreed | "All",
        nextAvailability: SemenAvailability | "All",
        nextColor: string,
        nextGeneticProfile: string,
        nextDiscipline: string,
        nextBloodlines: BloodlineCondition[]
      ) => {
        const trimmedQ = q.trim();
        const currentQ = (searchParams.get("q") ?? "").trim();
        const currentCountry = searchParams.get("country") ?? "All";
        const currentBreed = parseDirectoryBreedFilter(searchParams.get("breed"));
        const currentAvailability = parseDirectoryAvailabilityFilter(searchParams.get("availability"));
        const currentColor = searchParams.get("color") ?? "All";
        const currentGeneticProfile = searchParams.get("geneticProfile") ?? "All";
        const currentDiscipline = searchParams.get("discipline") ?? "All";
        const currentBloodlines = searchParams.getAll(BLOODLINE_PARAM).join("\u0000");
        const nextBloodlineParams = serializeBloodlineConditions(nextBloodlines);
        if (
          trimmedQ === currentQ &&
          nextCountry === currentCountry &&
          nextBreed === currentBreed &&
          nextAvailability === currentAvailability &&
          nextColor === currentColor &&
          nextGeneticProfile === currentGeneticProfile &&
          nextDiscipline === currentDiscipline &&
          nextBloodlineParams.join("\u0000") === currentBloodlines
        )
          return;

        router.replace(
          buildStallionDirectoryHref({
            q: trimmedQ,
            country: nextCountry,
            breed: nextBreed,
            availability: nextAvailability,
            color: nextColor,
            geneticProfile: nextGeneticProfile,
            discipline: nextDiscipline,
            bloodlines: nextBloodlines,
            page: 1,
          })
        );
      },
      SEARCH_DEBOUNCE_MS
    );
  }, [router, searchParams]);

  useEffect(() => {
    if (skipNextUrlPush.current) {
      skipNextUrlPush.current = false;
      return;
    }

    debouncedPushFilters(keyword, country, breed, availability, color, geneticProfile, discipline, bloodlines);
    return () => debouncedPushFilters.cancel();
  }, [keyword, country, breed, availability, color, geneticProfile, discipline, bloodlines, debouncedPushFilters]);

  const onReset = () => {
    setKeyword("");
    setCountry("All");
    setBreed("All");
    setAvailability("All");
    setDiscipline("All");
    setColor("All");
    setGeneticProfile("All");
    setBloodlines([]);
    router.replace("/stallions");
  };

  const filterContent = (
    <div className="flex flex-col gap-4 font-poppins">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <p className="text-[16px] leading-[28px] text-white">Search</p>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-[15px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]"
            aria-hidden
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("keywordPlaceholder")}
            className={`${inputClass} pl-[41px]`}
          />
        </div>
      </div>

      <hr className="border-t border-[#262626]" />

      {/* Country */}
      <DirectoryFilterSelect
        label={t("countryLabel")}
        value={country}
        onChange={setCountry}
        allLabel={t("allCountries")}
        options={[
          { value: "All", label: t("allCountries") },
          ...STALLION_STANDING_COUNTRIES.map((c) => {
            const key = COUNTRY_KEYS[c.label];
            return {
              value: c.label,
              label: key ? tCountries(key) : c.label,
            };
          }),
        ]}
      />

      {/* Breed */}
      <DirectoryFilterSelect
        label={t("breedLabel")}
        value={breed}
        onChange={(v) => setBreed(v as StallionBreed | "All")}
        allLabel={t("allBreeds")}
        options={[
          { value: "All", label: t("allBreeds") },
          ...BREED_VALUES.map((value) => ({
            value,
            label: t(`breeds.${BREED_KEYS[value]}`),
          })),
        ]}
      />

      {/* Discipline */}
      <DirectoryFilterSelect
        label="Discipline"
        value={discipline}
        onChange={setDiscipline}
        options={[
          { value: "All", label: "All" },
          ...DISCIPLINE_OPTIONS.map((value) => ({ value, label: value })),
        ]}
      />

      {/* Semen Availability */}
      <DirectoryFilterSelect
        label={t("semenAvailabilityLabel")}
        value={availability}
        onChange={(v) => setAvailability(v as SemenAvailability | "All")}
        allLabel={t("allOptions")}
        options={[
          { value: "All", label: t("allOptions") },
          ...AVAILABILITY_VALUES.map((value) => ({
            value,
            label: t(`availability.${AVAILABILITY_KEYS[value]}`),
          })),
        ]}
      />

      {/* Color */}
      <DirectoryFilterSelect
        label="Color"
        value={color}
        onChange={setColor}
        options={[
          { value: "All", label: "All" },
          ...CANONICAL_COAT_COLOURS.map((value) => ({
            value,
            label: coatColourLabel(value, locale) ?? value,
          })),
        ]}
      />

      {/* Genetic profile */}
      <DirectoryFilterSelect
        label="Genetic profile"
        value={geneticProfile}
        onChange={setGeneticProfile}
        options={[
          { value: "All", label: "All" },
          ...GENETIC_PROFILE_OPTIONS.map((value) => ({ value, label: value })),
        ]}
      />

      {SHOW_BLOODLINE_FILTERS ? (
        <PedigreeBloodlineFilters
          conditions={bloodlines}
          onChange={setBloodlines}
          horseType="stallion"
        />
      ) : null}

      <hr className="border-t border-[#262626]" />

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="flex h-[40px] w-full items-center justify-center rounded-[2px] border border-[#262626] bg-[#121212] text-[12px] font-medium text-[#c09a64] transition-colors hover:border-[#c09a64]/40"
      >
        {t("resetAll")}
      </button>
    </div>
  );

  if (mobileCollapsible) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#262626] bg-[#121212]">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-[56px] w-full items-center justify-between px-5"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[0.24px] text-[#c09a64]">
            Filter Stallions
          </span>
          <SlidersHorizontal className="h-4 w-4 text-[#aaa]" aria-hidden />
        </button>
        {isOpen && (
          <div className="border-t border-[#262626] px-5 pb-5 pt-4">
            {filterContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24px] text-[#c09a64]">
        Filter Stallions
      </p>
      {total !== undefined && (
        <p className="text-[12px] font-medium text-[#727272]">
          {"Showing "}
          <span className="text-[#c09a64]">{filteredCount ?? total}</span>
          {" of "}
          <span className="text-[#c09a64]">{total}</span>
          {" stallions"}
        </p>
      )}
      {filterContent}
    </div>
  );
}
