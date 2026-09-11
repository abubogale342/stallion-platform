"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Stallion } from "@/types/stallion";
import SignedStorageImage from "@/components/media/SignedStorageImage";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";
import { formatCurrency, formatStallionHeight } from "@/utils/common";
import CountryFlag from "@/ui/CountryFlag";
import Field from "@/ui/Field";
import { resolveStallionCountry } from "@/utils/stallion";

const heroValueClass = "mt-1 text-[16px] text-white";

function HeroField({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  if (value == null) return null;
  if (typeof value === "string" && !value.trim()) return null;

  return (
    <Field label={label} variant="display">
      <p className={heroValueClass}>{value}</p>
    </Field>
  );
}

function getKnownPedigreeName(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "unknown") return undefined;
  return trimmed;
}

function formatHeroPedigreeLine(
  sire: string | undefined,
  dam: string | undefined,
  unknownSire: string,
  unknownDam: string,
  separator: string
): string | null {
  const knownSire = getKnownPedigreeName(sire);
  const knownDam = getKnownPedigreeName(dam);

  if (!knownSire && !knownDam) return null;
  if (knownSire && knownDam) return `${knownSire} ${separator} ${knownDam}`;
  if (knownSire) return `${knownSire} ${separator} ${unknownDam}`;
  return `${unknownSire} ${separator} ${knownDam}`;
}

function CountryLabel({ country }: { country: string | undefined }) {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  const resolved = resolveStallionCountry(trimmed);
  const display = resolved?.label ?? trimmed;
  const code = resolved?.code;

  return (
    <span className="inline-flex items-center gap-1.5">
      {display}
      {code ? <CountryFlag code={code} /> : null}
    </span>
  );
}

function DisciplineCoverageField({
  label,
  labels,
  fallback,
}: {
  label: string;
  labels: string[];
  fallback?: string;
}) {
  return (
    <HeroField
      label={label}
      value={
        labels.length > 0 ? labels.join(", ") : fallback?.trim() || undefined
      }
    />
  );
}

function formatStallionLteDisplay(
  stallion: Stallion,
  locale: string
): string | undefined {
  const lte = stallion.stallion_lte;
  if (!lte) return undefined;
  const value = Number(lte.value);
  if (!Number.isFinite(value) || value === 0) return undefined;
  return formatCurrency(lte.value, lte.currency, locale);
}

function HeroDetails({
  stallion,
  pedigreeLine,
  disciplineLabels,
  nameSizeClass,
  labels,
}: {
  stallion: Stallion;
  pedigreeLine: string | null;
  disciplineLabels: string[];
  nameSizeClass: string;
  labels: {
    unnamedStallion: string;
    status: string;
    country: string;
    registry: string;
    registrationNumberShort: string;
    yearOfBirth: string;
    stallionLte: string;
    height: string;
    heightValue: string | undefined;
    breed: string;
    color: string;
    disciplineCoverage: string;
  };
}) {
  const country = stallion.country_of_residence?.trim();
  const locale = useLocale();
  const stallionLte = formatStallionLteDisplay(stallion, locale);

  return (
    <div className="space-y-5">
      <div>
        <h1
          className={`profile-canvas-text font-bold tracking-normal text-white ${nameSizeClass}`}
        >
          {stallion.stallion_name || labels.unnamedStallion}
        </h1>
        {pedigreeLine ? (
          <p className="profile-canvas-muted mt-3 text-[16px] leading-[1.5] text-white/60">
            {pedigreeLine}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {stallion.stallion_status ? (
            <p className="profile-canvas-muted text-[16px] text-white/60">
              {labels.status}:{" "}
              <span className="profile-canvas-accent text-[16px] text-gold">
                {stallion.stallion_status}
              </span>
            </p>
          ) : null}
          {country ? (
            <p className="profile-canvas-muted text-[16px] text-white/60">
              {labels.country}:{" "}
              <span className="profile-canvas-accent text-[16px] text-gold">
                <CountryLabel country={country} />
              </span>
            </p>
          ) : null}
          {stallion.registry?.trim() ? (
            <p className="profile-canvas-muted text-[16px] text-white/60">
              {labels.registry}:{" "}
              <span className="profile-canvas-accent text-[16px] text-gold">
                {stallion.registry.trim()}
              </span>
            </p>
          ) : null}
          {stallion.registration_number?.trim() ? (
            <p className="profile-canvas-muted text-[16px] text-white/60">
              {labels.registrationNumberShort}:{" "}
              <span className="profile-canvas-accent text-[16px] text-gold">
                {stallion.registration_number.trim()}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-x-7 gap-y-6 rounded-md bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <HeroField label={labels.yearOfBirth} value={stallion.year_of_birth} />
        <HeroField label={labels.height} value={labels.heightValue} />
        <HeroField label={labels.stallionLte} value={stallionLte} />
        <HeroField
          label={labels.breed}
          value={stallion.breed_label ?? stallion.breed ?? undefined}
        />
        <HeroField label={labels.color} value={stallion.coat_colour ?? undefined} />
        <DisciplineCoverageField
          label={labels.disciplineCoverage}
          labels={disciplineLabels}
          fallback={stallion.discipline_coverage_description}
        />
      </div>
    </div>
  );
}

export default function StallionHeroSection({ stallion }: { stallion: Stallion }) {
  const t = useTranslations("profile.hero");
  const tTable = useTranslations("stallions.table");
  const locale = useLocale();
  const disciplineLabels = (stallion.discipline_focus ?? []).filter(Boolean);
  const pedigreeLine = formatHeroPedigreeLine(
    stallion.pedigree?.sire?.name,
    stallion.pedigree?.dam?.name,
    t("unknownSire"),
    t("unknownDam"),
    tTable("pedigreeSeparator")
  );
  const labels = {
    unnamedStallion: t("unnamedStallion"),
    status: t("status"),
    country: t("country"),
    registry: t("registry"),
    registrationNumberShort: t("registrationNumberShort"),
    yearOfBirth: t("yearOfBirth"),
    stallionLte: t("stallionLte"),
    height: t("height"),
    heightValue: formatStallionHeight(stallion.height_hands, locale)?.display,
    breed: t("breed"),
    color: t("color"),
    disciplineCoverage: t("disciplineCoverage"),
  };

  return (
    <section className="profile-hero w-full bg-black">
      {/* Mobile / tablet: stacked — image first, details below */}
      <div className="lg:hidden">
        <SignedStorageImage
          filename={stallion.media?.primary_image_url}
          fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
          alt={stallion.stallion_name}
          className="block h-auto w-full bg-black object-cover object-center"
          loadingClassName="block h-[55vw] w-full animate-pulse bg-zinc-800"
        />
        <div className="px-5 py-8 sm:px-8 sm:py-10">
          <HeroDetails
            stallion={stallion}
            pedigreeLine={pedigreeLine}
            disciplineLabels={disciplineLabels}
            nameSizeClass="text-[44px] leading-[1.05] sm:text-[52px] sm:leading-[1.1]"
            labels={labels}
          />
        </div>
      </div>

      {/* Desktop: 35% details, 65% image */}
      <div className="hidden lg:grid lg:grid-cols-[35%_65%]">
        <div className="flex flex-col justify-center bg-black px-7 py-10 xl:px-10">
          <HeroDetails
            stallion={stallion}
            pedigreeLine={pedigreeLine}
            disciplineLabels={disciplineLabels}
            nameSizeClass="text-[60px] leading-[68px]"
            labels={labels}
          />
        </div>
        <div className="flex aspect-[2/1] w-full items-center justify-center self-start overflow-hidden bg-black">
          <SignedStorageImage
            filename={stallion.media?.primary_image_url}
            fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
            alt={stallion.stallion_name}
            className="block h-full w-full object-contain object-center"
            loadingClassName="block h-full w-full animate-pulse bg-zinc-800"
          />
        </div>
      </div>
    </section>
  );
}
