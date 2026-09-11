import type { Stallion } from "@/types/stallion";
import {
  profileSectionTitleClassName,
  profileStatLabelClassName,
  profileSubheadingClassName,
} from "@/components/profile/sectionTitle";
import {
  formatStudFee,
  stallionStudFeeRows,
} from "@/utils/stallion";
import { formatSemenMethodLabel } from "@/utils/semen-availability-i18n";
import { getLocale, getTranslations } from "next-intl/server";
import StatCard from "@/components/common/StatCard";
import Chip from "@/ui/Chip";

function AvailabilityChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-3">
      {items.map((item) => (
        <Chip key={item}>{item}</Chip>
      ))}
    </span>
  );
}

export default async function BreedingDetails({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.breedingDetails");
  const locale = await getLocale();

  const availabilityItems: string[] = (() => {
    const list = stallion.breeding_methods ?? [];
    const raw = list.length > 0 ? list : (() => {
      const legacy = stallion.breeding_availability;
      if (!legacy) return [];
      if (legacy === "Combination") return ["Chilled", "Frozen"];
      return [legacy];
    })();
    return raw.map((method) =>
      formatSemenMethodLabel(method, locale, stallion.breeding_method_labels)
    );
  })();

  const studFees = stallionStudFeeRows(stallion);
  const guaranteesDisplay = stallion.breeding_guarantees_resolved || "";
  const countries = (stallion.country_availability_resolved ?? []).filter(Boolean);

  const hasCards =
    availabilityItems.length > 0 ||
    studFees.length > 0 ||
    Boolean(guaranteesDisplay);
  if (!hasCards && countries.length === 0) {
    return null;
  }

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <h2 className={profileSectionTitleClassName}>{t("title")}</h2>

      {hasCards ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {availabilityItems.length > 0 ? (
            <div className="rounded border border-white/10 bg-surface px-5 py-4 text-center">
              <p className={profileStatLabelClassName}>{t("availability")}</p>
              <div className="mt-2">
                <AvailabilityChips items={availabilityItems} />
              </div>
            </div>
          ) : null}
          {studFees.length > 0 ? (
            <StatCard variant="profile-gold" label={t("studFee")}>
              <ul className="mt-2 space-y-2">
                {studFees.map((fee, index) => (
                  <li
                    key={`${fee.currency}-${fee.value}-${index}`}
                    className="text-[24px] font-medium leading-none text-gold"
                  >
                    {formatStudFee(fee.value, fee.currency)}
                  </li>
                ))}
              </ul>
            </StatCard>
          ) : null}
          {guaranteesDisplay ? (
            <StatCard
              variant="profile-gold"
              label={t("guarantees")}
              value={guaranteesDisplay}
            />
          ) : null}
        </div>
      ) : null}

      {countries.length > 0 ? (
        <>
          <h3 className={`mt-6 ${profileSubheadingClassName}`}>
            {t("availability")}
          </h3>
          <div className="mt-5 flex flex-wrap gap-4">
            {countries.map((country) => (
              <span
                key={country}
                className="rounded-sm border border-white/10 bg-surface px-8 py-4 text-[16px] text-white"
              >
                {country}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
