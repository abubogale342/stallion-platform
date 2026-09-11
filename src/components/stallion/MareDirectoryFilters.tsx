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
  parseBloodlinesFromSearchParams,
  serializeBloodlineConditions,
} from "@/utils/bloodline-search";
import type { BloodlineCondition } from "@/utils/bloodline-search";
import { useRouter } from "@/i18n/navigation";
import type { StallionBreed } from "@/types/stallion";
import { STALLION_STANDING_COUNTRIES, parseDirectoryBreedFilter } from "@/utils/stallion";
import { buildMareDirectoryHref } from "@/utils/mare";
import {
  CANONICAL_COAT_COLOURS,
  coatColourLabel,
} from "@/utils/coat-colour-i18n";

const SEARCH_DEBOUNCE_MS = 300;

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

const ET_STATUS_VALUES = ["Donor", "Seasonal", "Deceased"] as const;
const ET_STATUS_KEYS: Record<string, string> = {
  Donor: "donor",
  Seasonal: "seasonal",
  Deceased: "deceased",
};

const EMBRYO_AVAILABILITY_VALUES = ["Fresh", "Frozen", "Both"] as const;
const EMBRYO_AVAILABILITY_KEYS: Record<string, string> = {
  Fresh: "fresh",
  Frozen: "frozen",
  Both: "both",
};

const inputClass =
  "w-full rounded-[4px] border border-line bg-transparent h-[40px] px-[15px] text-[14px] text-white placeholder:text-grey outline-none transition-colors focus:border-[#c09a64]/60";

export default function MareDirectoryFilters({
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
  const t = useTranslations("mares.filters");
  const tStallions = useTranslations("stallions.filters");
  const tCountries = useTranslations("stallions.countries");
  const locale = useLocale();

  const filtersFromUrl = useMemo(
    () => ({
      keyword: (searchParams.get("q") ?? "").trim(),
      country: searchParams.get("country") ?? "All",
      breed: parseDirectoryBreedFilter(searchParams.get("breed")),
      discipline: searchParams.get("discipline") ?? "All",
      color: searchParams.get("color") ?? "All",
      geneticProfile: searchParams.get("geneticProfile") ?? "All",
      etStatus: searchParams.get("etStatus") ?? "All",
      embryoAvailability: searchParams.get("embryoAvailability") ?? "All",
      bloodlines: parseBloodlinesFromSearchParams(searchParams),
    }),
    [searchParams]
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filtersFromUrl.keyword ||
          filtersFromUrl.country !== "All" ||
          filtersFromUrl.breed !== "All" ||
          filtersFromUrl.discipline !== "All" ||
          filtersFromUrl.color !== "All" ||
          filtersFromUrl.geneticProfile !== "All" ||
          filtersFromUrl.etStatus !== "All" ||
          filtersFromUrl.embryoAvailability !== "All" ||
          filtersFromUrl.bloodlines.length
      ),
    [filtersFromUrl]
  );

  const [keyword, setKeyword] = useState(filtersFromUrl.keyword);
  const [country, setCountry] = useState(filtersFromUrl.country);
  const [breed, setBreed] = useState<StallionBreed | "All">(filtersFromUrl.breed);
  const [discipline, setDiscipline] = useState(filtersFromUrl.discipline);
  const [color, setColor] = useState(filtersFromUrl.color);
  const [geneticProfile, setGeneticProfile] = useState(
    filtersFromUrl.geneticProfile
  );
  const [etStatus, setEtStatus] = useState(filtersFromUrl.etStatus);
  const [embryoAvailability, setEmbryoAvailability] = useState(
    filtersFromUrl.embryoAvailability
  );
  const [bloodlines, setBloodlines] = useState<BloodlineCondition[]>(
    () => filtersFromUrl.bloodlines
  );

  const [isOpen, setIsOpen] = useState(hasActiveFilters);
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
    setDiscipline((prev) =>
      prev === filtersFromUrl.discipline ? prev : filtersFromUrl.discipline
    );
    setColor((prev) => (prev === filtersFromUrl.color ? prev : filtersFromUrl.color));
    setGeneticProfile((prev) =>
      prev === filtersFromUrl.geneticProfile ? prev : filtersFromUrl.geneticProfile
    );
    setEtStatus((prev) =>
      prev === filtersFromUrl.etStatus ? prev : filtersFromUrl.etStatus
    );
    setEmbryoAvailability((prev) =>
      prev === filtersFromUrl.embryoAvailability
        ? prev
        : filtersFromUrl.embryoAvailability
    );
    setBloodlines((prev) =>
      // Compare the URL form so a half-typed condition survives the sync.
      serializeBloodlineConditions(prev).join("\u0000") ===
      serializeBloodlineConditions(filtersFromUrl.bloodlines).join("\u0000")
        ? prev
        : filtersFromUrl.bloodlines
    );

    if (hasActiveFilters) {
      setIsOpen(true);
    }
  }, [filtersFromUrl, hasActiveFilters]);

  const debouncedPushFilters = useMemo(() => {
    return debounce(
      (
        q: string,
        nextCountry: string,
        nextBreed: StallionBreed | "All",
        nextDiscipline: string,
        nextColor: string,
        nextGeneticProfile: string,
        nextEtStatus: string,
        nextEmbryoAvailability: string,
        nextBloodlines: BloodlineCondition[]
      ) => {
        const trimmedQ = q.trim();
        const currentQ = (searchParams.get("q") ?? "").trim();
        const currentCountry = searchParams.get("country") ?? "All";
        const currentBreed = parseDirectoryBreedFilter(searchParams.get("breed"));
        const currentDiscipline = searchParams.get("discipline") ?? "All";
        const currentColor = searchParams.get("color") ?? "All";
        const currentGeneticProfile = searchParams.get("geneticProfile") ?? "All";
        const currentEtStatus = searchParams.get("etStatus") ?? "All";
        const currentEmbryoAvailability =
          searchParams.get("embryoAvailability") ?? "All";
        const currentBloodlines = searchParams
          .getAll(BLOODLINE_PARAM)
          .join("\u0000");
        const nextBloodlineParams = serializeBloodlineConditions(nextBloodlines);
        if (
          trimmedQ === currentQ &&
          nextCountry === currentCountry &&
          nextBreed === currentBreed &&
          nextDiscipline === currentDiscipline &&
          nextColor === currentColor &&
          nextGeneticProfile === currentGeneticProfile &&
          nextEtStatus === currentEtStatus &&
          nextEmbryoAvailability === currentEmbryoAvailability &&
          nextBloodlineParams.join("\u0000") === currentBloodlines
        )
          return;

        router.replace(
          buildMareDirectoryHref({
            q: trimmedQ,
            country: nextCountry,
            breed: nextBreed,
            discipline: nextDiscipline,
            color: nextColor,
            geneticProfile: nextGeneticProfile,
            etStatus: nextEtStatus,
            embryoAvailability: nextEmbryoAvailability,
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

    debouncedPushFilters(
      keyword,
      country,
      breed,
      discipline,
      color,
      geneticProfile,
      etStatus,
      embryoAvailability,
      bloodlines
    );
    return () => debouncedPushFilters.cancel();
  }, [keyword, country, breed, discipline, color, geneticProfile, etStatus, embryoAvailability, bloodlines, debouncedPushFilters]);

  const onReset = () => {
    setKeyword("");
    setCountry("All");
    setBreed("All");
    setDiscipline("All");
    setColor("All");
    setGeneticProfile("All");
    setEtStatus("All");
    setEmbryoAvailability("All");
    setBloodlines([]);
    router.replace("/mares");
  };

  const filterContent = (
    <div className="flex flex-col gap-4 font-poppins">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <p className="text-[16px] leading-[28px] text-white">{t("searchLabel")}</p>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-[15px] top-1/2 h-4 w-4 -translate-y-1/2 text-grey"
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

      <hr className="border-t border-line" />

      {/* Country */}
      <DirectoryFilterSelect
        label={tStallions("countryLabel")}
        value={country}
        onChange={setCountry}
        allLabel={tStallions("allCountries")}
        options={[
          { value: "All", label: tStallions("allCountries") },
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
        label={tStallions("breedLabel")}
        value={breed}
        onChange={(v) => setBreed(v as StallionBreed | "All")}
        allLabel={tStallions("allBreeds")}
        options={[
          { value: "All", label: tStallions("allBreeds") },
          ...BREED_VALUES.map((value) => ({
            value,
            label: tStallions(`breeds.${BREED_KEYS[value]}`),
          })),
        ]}
      />

      {/* Discipline */}
      <DirectoryFilterSelect
        label={t("disciplineLabel")}
        value={discipline}
        onChange={setDiscipline}
        allLabel={t("allDisciplines")}
        options={[
          { value: "All", label: t("allDisciplines") },
          ...DISCIPLINE_OPTIONS.map((value) => ({ value, label: value })),
        ]}
      />

      {/* Color */}
      <DirectoryFilterSelect
        label={t("colorLabel")}
        value={color}
        onChange={setColor}
        allLabel={t("allColors")}
        options={[
          { value: "All", label: t("allColors") },
          ...CANONICAL_COAT_COLOURS.map((value) => ({
            value,
            label: coatColourLabel(value, locale) ?? value,
          })),
        ]}
      />

      {/* Genetic profile */}
      <DirectoryFilterSelect
        label={t("geneticProfileLabel")}
        value={geneticProfile}
        onChange={setGeneticProfile}
        allLabel={t("allGeneticProfiles")}
        options={[
          { value: "All", label: t("allGeneticProfiles") },
          ...GENETIC_PROFILE_OPTIONS.map((value) => ({ value, label: value })),
        ]}
      />

      {/* ET status */}
      <DirectoryFilterSelect
        label={t("etStatusLabel")}
        value={etStatus}
        onChange={setEtStatus}
        allLabel={t("allEtStatuses")}
        options={[
          { value: "All", label: t("allEtStatuses") },
          ...ET_STATUS_VALUES.map((value) => ({
            value,
            label: t(`etStatus.${ET_STATUS_KEYS[value]}`),
          })),
        ]}
      />

      {/* Embryo availability */}
      <DirectoryFilterSelect
        label={t("embryoAvailabilityLabel")}
        value={embryoAvailability}
        onChange={setEmbryoAvailability}
        allLabel={t("allEmbryoAvailability")}
        options={[
          { value: "All", label: t("allEmbryoAvailability") },
          ...EMBRYO_AVAILABILITY_VALUES.map((value) => ({
            value,
            label: t(`embryoAvailability.${EMBRYO_AVAILABILITY_KEYS[value]}`),
          })),
        ]}
      />

      {/* Bloodline (ancestor) search — same controls as the stallion directory */}
      <PedigreeBloodlineFilters
        conditions={bloodlines}
        onChange={setBloodlines}
        horseType="mare"
      />

      <hr className="border-t border-line" />

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="flex h-[40px] w-full items-center justify-center rounded-[2px] border border-line bg-surface text-[12px] font-medium text-gold-alt transition-colors hover:border-[#c09a64]/40"
      >
        {tStallions("resetAll")}
      </button>
    </div>
  );

  if (mobileCollapsible) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex h-[56px] w-full items-center justify-between px-5"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[0.24px] text-gold-alt">
            {t("filterHeading")}
          </span>
          <SlidersHorizontal className="h-4 w-4 text-grey" aria-hidden />
        </button>
        {isOpen && (
          <div className="border-t border-line px-5 pb-5 pt-4">
            {filterContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.24px] text-gold-alt">
        {t("filterHeading")}
      </p>
      {total !== undefined && (
        <p className="text-[12px] font-medium text-grey-2">
          {t("showing", { filtered: filteredCount ?? total, total })}
        </p>
      )}
      {filterContent}
    </div>
  );
}
