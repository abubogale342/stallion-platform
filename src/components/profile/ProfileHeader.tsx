"use client";

import type { Stallion } from "@/types/stallion";
import { formatCurrency, formatStallionHeight, resolveRegistryField } from "@/utils/common";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";
import SignedStorageImage from "@/components/media/SignedStorageImage";
import AccentLink from "@/ui/AccentLink";
import Field from "@/ui/Field";
import Label from "@/ui/Label";
import { useLocale, useTranslations } from "next-intl";

const profileValueClass =
  "text-[16px] font-normal leading-snug text-zinc-100 md:text-[17px]";

export default function ProfileHeader({ stallion }: { stallion: Stallion }) {
  const t = useTranslations("profile.header");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const empty = tCommon("empty");
  const disciplines = (stallion.discipline_focus ?? []).filter(Boolean);
  const registryField = resolveRegistryField(stallion.official_registry_link ?? undefined);

  const showStallionLte = (() => {
    const lte = stallion.stallion_lte;
    if (!lte) return false;
    const v = lte.value;
    if (v == null) return false;
    const n = Number(v);
    if (Number.isNaN(n)) return false;
    return n !== 0;
  })();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg shadow-black/30 md:p-6">
      <div className="grid gap-5 md:grid-cols-2 md:items-start md:gap-5 lg:gap-6">
        <div className="min-w-0 md:max-w-none">
          <div className="aspect-4/5 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <SignedStorageImage
              filename={stallion.media?.primary_image_url}
              fallbackSrc={STALLION_IMAGE_PLACEHOLDER_SRC}
              alt={stallion.stallion_name}
              className="h-full w-full object-contain object-center"
              loadingClassName="h-full w-full animate-pulse bg-zinc-800"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-3 md:space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white">
              {stallion.stallion_name || t("unnamedStallion")}
            </h1>
            <p className="text-[15px] leading-snug text-zinc-500">
              {t("statusCountry", {
                status: stallion.stallion_status ?? empty,
                country: stallion.country_of_residence ?? empty,
              })}
            </p>
            <p className="text-[15px] leading-snug text-zinc-500">
              {stallion.pedigree?.sire?.name || empty} ×{" "}
              {stallion.pedigree?.dam?.name || empty}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 md:p-4">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label={t("yearOfBirth")} variant="displayProfile">
                <p className={profileValueClass}>
                  {stallion.year_of_birth != null ? stallion.year_of_birth : empty}
                </p>
              </Field>

              <Field label={t("height")} variant="displayProfile">
                <p className={profileValueClass}>
                  {formatStallionHeight(stallion.height_hands, locale)?.display ?? empty}
                </p>
              </Field>

              <Field label={t("registrationNumber")} variant="displayProfile">
                <p className={profileValueClass}>
                  {stallion.registration_number || empty}
                </p>
              </Field>

              <Field label={t("breed")} variant="displayProfile">
                <p className={profileValueClass}>
                  {stallion.breed_label || stallion.breed || empty}
                </p>
              </Field>

              <Field label={t("color")} variant="displayProfile">
                <p className={profileValueClass}>{stallion.coat_colour || empty}</p>
              </Field>

              {showStallionLte && stallion.stallion_lte ? (
                <Field label={t("stallionLte")} variant="displayProfile">
                  <p className={profileValueClass}>
                    {formatCurrency(
                      stallion.stallion_lte.value,
                      stallion.stallion_lte.currency,
                      locale
                    )}
                  </p>
                </Field>
              ) : null}

              <div>
                <Label variant="displayProfile">{t("disciplineCoverage")}</Label>
                {disciplines.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-2">
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
                  <p className={profileValueClass}>
                    {stallion.discipline_coverage_description || empty}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label variant="displayProfile">{t("registryRegistries")}</Label>
                {registryField.kind === "link" ? (
                  <AccentLink
                    href={registryField.href}
                    variant="inline"
                    external
                    className="inline-block text-[16px] md:text-[17px]"
                    title={registryField.display}
                  >
                    {t("viewDocument")}
                  </AccentLink>
                ) : (
                  <p className={profileValueClass}>{registryField.text}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
