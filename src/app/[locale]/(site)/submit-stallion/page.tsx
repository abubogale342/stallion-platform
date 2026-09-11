/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useRouter } from "@/i18n/navigation";
import { ProgenyRow } from "@/types/stallion";
import { cn, parseNumericInput } from "@/utils/common";
import { accentLinkClassName } from "@/ui/AccentLink";
import Button from "@/ui/Button";
import Card from "@/ui/Card";
import Input from "@/ui/Input";
import Label from "@/ui/Label";
import Select from "@/ui/Select";
import Textarea from "@/ui/Textarea";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Breed = "Quarter Horse" | "Paint" | "Appaloosa";
type Guarantee = "LFG" | "Colour" | "None";
type StallionStatus = "Active" | "Deceased";

type PerformanceRow = {
  year: string;
  event: string;
  /** Show / class; persisted as stallion_performance_records.class */
  performanceClass: string;
  result: string;
  reference: string;
  notes?: string;
  judges?: string;
  levelEarnings?: string;
};

const fieldLabelClass = "block text-xs font-medium normal-case tracking-normal text-zinc-400";
const fieldInputClass =
  "mt-1 rounded-md border-[#6b5736] focus:border-[#FFD700] placeholder:text-zinc-500";

function FileUpload({
  label,
  required,
  optionalLabel,
  onUploaded,
}: {
  label: string;
  required?: boolean;
  optionalLabel: string;
  onUploaded?: (url: string) => void;
}) {
  return (
    <div className="mt-1">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#b08d57] bg-zinc-900/50 py-4 transition hover:bg-zinc-900">
        <span className="text-xs text-zinc-400">
          {label} {required ? "*" : optionalLabel}
        </span>
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);

            if (onUploaded && url) onUploaded(url);
          }}
        />
      </label>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      as="section"
      className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg"
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle ? <p className="text-xs text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export default function SubmitStallionPage() {
  const t = useTranslations("submit.form");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [progenyRows, setProgenyRows] = useState<ProgenyRow[]>([
    {
      name: "",
      year: "",
      association: "",
      discipline: "",
      result: "",
      reference: "",
    },
  ]);

  const [status, setStatus] = useState<StallionStatus>("Active");
  const [registeredName, setRegisteredName] = useState("");
  const [countryOfStanding, setCountryOfStanding] = useState("United States");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [height, setHeight] = useState("");

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [officialRegistryLink, setOfficialRegistryLink] = useState("");

  const [studFee, setStudFee] = useState("");
  const [guarantee, setGuarantee] = useState<Guarantee>("None");
  const [breedingStats, setBreedingStats] = useState("");

  const [diseaseTesting, setDiseaseTesting] = useState("");
  const [colourTesting, setColourTesting] = useState("");

  const [performanceRows, setPerformanceRows] = useState<PerformanceRow[]>([
    { year: "", event: "", performanceClass: "", result: "", reference: "" },
  ]);

  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState(["", "", ""]);
  const [videoUrl, setVideoUrl] = useState("");

  const parseStudFee = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;
    const [valuePart, ...currencyParts] = parts;
    const currency = currencyParts.join(" ");
    const value = Number(valuePart);
    if (!Number.isFinite(value) || !currency) return null;
    return { value, currency };
  };

  const parseHeight = (input: string) => {
    const n = parseNumericInput(input);
    return n === null ? null : { value: n, unit: "HH" as const };
  };

  const removePerformanceRow = (index: any) => {
    const newRows = performanceRows.filter((_, i) => i !== index);
    setPerformanceRows(newRows);
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!registeredName.trim()) e.registeredName = t("validation.required");
    if (!registrationNumber.trim())
      e.registrationNumber = t("validation.required");
    if (!diseaseTesting.trim())
      e.diseaseTesting = t("validation.diseaseTestingRequired");
    return e;
  }, [registeredName, registrationNumber, diseaseTesting, t]);

  const canSubmit = Object.keys(errors).length === 0;

  const updatePerformanceRow = (
    idx: number,
    key: keyof PerformanceRow,
    value: string,
  ) => {
    setPerformanceRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    );
  };

  const addProgenyRow = () => {
    setProgenyRows((prev) => [
      ...prev,
      {
        name: "",
        year: "",
        association: "",
        discipline: "",
        result: "",
        reference: "",
      },
    ]);
  };

  const removeProgenyRow = (idx: number) => {
    setProgenyRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProgenyRow = (
    idx: number,
    key: keyof ProgenyRow,
    value: string,
  ) => {
    setProgenyRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      alert(t("submitAlert"));
      return;
    }

    const yob = parseNumericInput(yearOfBirth);
    const stallionPayload = {
      registeredName,
      status,
      countryOfStanding,
      yearOfBirth: yob,
      height: parseHeight(height),

      registrationNumber,
      officialRegistryLink,

      studFee: parseStudFee(studFee),
      breedingGuarantees: guarantee,
      breedingStatistics: breedingStats ? { notes: breedingStats } : undefined,

      diseaseTestingResults: diseaseTesting,
      colourTestingResults: colourTesting,

      performanceRecords: performanceRows
        .filter((r) => r.event.trim())
        .map((r) => {
          const py = parseNumericInput(r.year);
          const levelVal = parseNumericInput(r.levelEarnings ?? "");
          return {
            year: py,
            event: r.event,
            class: r.performanceClass,
            result: r.result,
            reference: r.reference
              ? { label: t("referenceLabel"), href: r.reference }
              : undefined,
            notes: r.notes,
            judges: r.judges,
            levelEarnings:
              levelVal === null
                ? null
                : { value: levelVal, currency: "USD" as const },
          };
        }),

      notableProgeny: progenyRows
        .filter((p) => p.name)
        .map((p) => ({
          name: p.name,
          year: parseNumericInput(p.year),
          association: p.association,
          discipline: p.discipline,
          result: p.result,
          reference: p.reference
            ? { label: t("referenceLabel"), href: p.reference }
            : undefined,
        })),

      media: {
        primaryImageUrl,
        gallery: galleryUrls.filter(Boolean).map((filename) => ({ filename })),
        videos: videoUrl ? [{ url: videoUrl, type: "reference" }] : [],
      },
    };

    void stallionPayload;
    router.push("/payment");
  };

  return (
    <div className="min-h-screen bg-black p-6 text-zinc-100">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {t("title")}
        </h1>
        <p className="text-zinc-400 text-sm">{t("subtitle")}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <SectionCard
          title={t("sections.identity.title")}
          subtitle={t("sections.identity.subtitle")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={fieldLabelClass}>{t("fields.status")}</Label>
              <Select
                variant="public"
                className={fieldInputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="Standing">{t("statusOptions.standing")}</option>
                <option value="Deceased">{t("statusOptions.deceased")}</option>
                <option value="Not Standing">
                  {t("statusOptions.notStanding")}
                </option>
                <option value="Historical Reference">
                  {t("statusOptions.historicalReference")}
                </option>
              </Select>
            </div>

            <div>
              <Label className={fieldLabelClass}>
                {t("fields.registeredName")}
              </Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={registeredName}
                onChange={(e) => setRegisteredName(e.target.value)}
                placeholder={t("placeholders.fullName")}
              />
            </div>

            <div>
              <Label className={fieldLabelClass}>
                {t("fields.countryOfStanding")}
              </Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={countryOfStanding}
                onChange={(e) => setCountryOfStanding(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className={fieldLabelClass}>
                  {t("fields.yearOfBirth")}
                </Label>
                <Input
                  variant="public"
                  className={fieldInputClass}
                  value={yearOfBirth}
                  onChange={(e) => setYearOfBirth(e.target.value)}
                  placeholder={t("placeholders.year")}
                />
              </div>
              <div>
                <Label className={fieldLabelClass}>{t("fields.height")}</Label>
                <Input
                  variant="public"
                  className={fieldInputClass}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={t("placeholders.height")}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.registry.title")}
          subtitle={t("sections.registry.subtitle")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.officialRegistryUrl")}
              </Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={officialRegistryLink}
                onChange={(e) => setOfficialRegistryLink(e.target.value)}
                placeholder={t("placeholders.registryUrl")}
              />
            </div>
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.registrationNumber")}
              </Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className={fieldLabelClass}>
                {t("fields.uploadRegistrationPapers")}
              </Label>
              <FileUpload
                label={t("upload.pdfOrImage")}
                required
                optionalLabel={tCommon("optionalParen")}
                onUploaded={(url) => setOfficialRegistryLink(url)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.performance.title")}
          subtitle={t("sections.performance.subtitle")}
        >
          <div className="space-y-4">
            {performanceRows.map((row, idx) => (
              <div
                key={idx}
                className="relative rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3"
              >
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removePerformanceRow(idx)}
                  className="absolute -top-2 -right-2 h-6 w-6 min-w-0 rounded-full border border-red-500 bg-red-900/80 p-0 text-xs text-white hover:bg-red-700"
                >
                  ✕
                </Button>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.year}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "year", e.target.value)
                    }
                    placeholder={t("placeholders.performanceYear")}
                  />
                  <Input
                    variant="public"
                    className={cn(fieldInputClass, "lg:col-span-2")}
                    value={row.event}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "event", e.target.value)
                    }
                    placeholder={t("placeholders.event")}
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.performanceClass}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "performanceClass", e.target.value)
                    }
                    placeholder={t("placeholders.class")}
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.result}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "result", e.target.value)
                    }
                    placeholder={t("placeholders.result")}
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.reference}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "reference", e.target.value)
                    }
                    placeholder={t("placeholders.refUrl")}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.notes}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "notes", e.target.value)
                    }
                    placeholder={t("placeholders.notes")}
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.judges}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "judges", e.target.value)
                    }
                    placeholder={t("placeholders.judges")}
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    value={row.levelEarnings}
                    onChange={(e) =>
                      updatePerformanceRow(idx, "levelEarnings", e.target.value)
                    }
                    placeholder={t("placeholders.earnings")}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="unstyled"
              size="none"
              onClick={() =>
                setPerformanceRows([
                  ...performanceRows,
                  {
                    year: "",
                    event: "",
                    performanceClass: "",
                    result: "",
                    reference: "",
                    notes: "",
                    judges: "",
                    levelEarnings: "",
                  },
                ])
              }
              className={accentLinkClassName({
                variant: "inline",
                className: "flex items-center gap-1 text-xs",
              })}
            >
              {t("sections.performance.addRow")}
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.progeny.title")}
          subtitle={t("sections.progeny.subtitle")}
        >
          <div className="space-y-3">
            {progenyRows.map((row, idx) => (
              <div
                key={idx}
                className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.progenyName")}
                    value={row.name}
                    onChange={(e) =>
                      updateProgenyRow(idx, "name", e.target.value)
                    }
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.year")}
                    value={row.year}
                    onChange={(e) =>
                      updateProgenyRow(idx, "year", e.target.value)
                    }
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.association")}
                    value={row.association}
                    onChange={(e) =>
                      updateProgenyRow(idx, "association", e.target.value)
                    }
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.discipline")}
                    value={row.discipline}
                    onChange={(e) =>
                      updateProgenyRow(idx, "discipline", e.target.value)
                    }
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.result")}
                    value={row.result}
                    onChange={(e) =>
                      updateProgenyRow(idx, "result", e.target.value)
                    }
                  />
                  <Input
                    variant="public"
                    className={fieldInputClass}
                    placeholder={t("placeholders.referenceLink")}
                    value={row.reference}
                    onChange={(e) =>
                      updateProgenyRow(idx, "reference", e.target.value)
                    }
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="unstyled"
                    size="none"
                    onClick={() => removeProgenyRow(idx)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    {t("sections.progeny.remove")}
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="goldOutline"
              size="md"
              onClick={addProgenyRow}
              className="border-[#D4AF37] px-3 py-2 text-sm text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
            >
              {t("sections.progeny.addRow")}
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.breeding.title")}
          subtitle={t("sections.breeding.subtitle")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={fieldLabelClass}>{t("fields.studFee")}</Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={studFee}
                onChange={(e) => setStudFee(e.target.value)}
                placeholder={t("placeholders.studFeeExample")}
              />
            </div>
            <div>
              <Label className={fieldLabelClass}>{t("fields.guarantee")}</Label>
              <Select
                variant="public"
                className={fieldInputClass}
                value={guarantee}
                onChange={(e) => setGuarantee(e.target.value as Guarantee)}
              >
                <option value="None">{t("guaranteeOptions.none")}</option>
                <option value="LFG">{t("guaranteeOptions.lfg")}</option>
                <option value="Colour">{t("guaranteeOptions.colour")}</option>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label className={fieldLabelClass}>
                {t("fields.breedingStatistics")}
              </Label>
              <Textarea
                variant="public"
                className={fieldInputClass}
                value={breedingStats}
                onChange={(e) => setBreedingStats(e.target.value)}
                placeholder={t("placeholders.breedingStats")}
                rows={3}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.health.title")}
          subtitle={t("sections.health.subtitle")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.diseaseTesting")}
              </Label>
              <Textarea
                variant="public"
                className={fieldInputClass}
                value={diseaseTesting}
                onChange={(e) => setDiseaseTesting(e.target.value)}
                placeholder={t("placeholders.diseaseTesting")}
                rows={2}
              />
              <FileUpload
                label={t("upload.diseaseResults")}
                required
                optionalLabel={tCommon("optionalParen")}
                onUploaded={(url) => setDiseaseTesting(url)}
              />
            </div>
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.colourTesting")}
              </Label>
              <Textarea
                variant="public"
                className={fieldInputClass}
                value={colourTesting}
                onChange={(e) => setColourTesting(e.target.value)}
                placeholder={t("placeholders.colourTesting")}
                rows={2}
              />
              <FileUpload
                label={t("upload.colourResults")}
                optionalLabel={tCommon("optionalParen")}
                onUploaded={(url) => setColourTesting(url)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("sections.media.title")}
          subtitle={t("sections.media.subtitle")}
        >
          <div className="space-y-4">
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.primaryHeroImage")}
              </Label>

              <FileUpload
                label={t("upload.primaryImage")}
                required
                optionalLabel={tCommon("optionalParen")}
                onUploaded={(url) => setPrimaryImageUrl(url)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {galleryUrls.map((_, i) => (
                <FileUpload
                  key={i}
                  label={t("upload.galleryImage", { index: i + 1 })}
                  optionalLabel={tCommon("optionalParen")}
                  onUploaded={(url) => {
                    const newUrls = [...galleryUrls];
                    newUrls[i] = url;
                    setGalleryUrls(newUrls);
                  }}
                />
              ))}
            </div>
            <div>
              <Label className={fieldLabelClass}>
                {t("fields.videoReferenceUrl")}
              </Label>
              <Input
                variant="public"
                className={fieldInputClass}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t("placeholders.videoUrl")}
              />
            </div>
          </div>
        </SectionCard>

        <Button
          type="submit"
          variant="goldOutline"
          size="lg"
          disabled={!canSubmit}
          className="w-full py-4 disabled:opacity-20"
        >
          {t("submitCta")}
        </Button>
      </form>
    </div>
  );
}
