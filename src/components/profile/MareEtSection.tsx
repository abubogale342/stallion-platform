import type { Stallion } from "@/types/stallion";
import {
  profileSectionTitleClassName,
  profileStatLabelClassName,
  profileSubheadingClassName,
} from "@/components/profile/sectionTitle";
import { formatStudFeeAmount } from "@/utils/stallion";
import { isEtVerificationStale } from "@/utils/mare";
import { getLocale, getTranslations } from "next-intl/server";
import StatCard from "@/components/common/StatCard";
import Chip from "@/ui/Chip";

/**
 * ET Program block for donor mare profiles (replaces BreedingDetails in the
 * Commercial section). Every field is null-guarded; the whole section
 * self-suppresses when there is nothing to show. admin_notes is never rendered
 * (and is not readable publicly).
 */
/** Deceased/retired programmes render neutral rather than the active green pill. */
function isInactiveEtStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  return value === "deceased" || value === "retired" || value === "inactive";
}

export default async function MareEtSection({ stallion }: { stallion: Stallion }) {
  const t = await getTranslations("profile.etDetails");
  const locale = await getLocale();
  const et = stallion.et_details;

  const countries = (stallion.country_availability_resolved ?? []).filter(Boolean);

  const availabilityChips: string[] = (() => {
    const value = et?.embryo_availability?.trim();
    if (!value) return [];
    if (value.toLowerCase() === "both") {
      return [t("availabilityValues.fresh"), t("availabilityValues.frozen")];
    }
    const key = value.toLowerCase();
    if (key === "fresh") return [t("availabilityValues.fresh")];
    if (key === "frozen") return [t("availabilityValues.frozen")];
    return [value];
  })();

  const clinicDisplay = [et?.clinic_name?.trim(), et?.clinic_location?.trim()]
    .filter(Boolean)
    .join(" — ");

  // Spec: embryo fee renders as "$10,000AUD".
  const feeDisplay =
    et?.embryo_fee != null && Number.isFinite(et.embryo_fee)
      ? `$${formatStudFeeAmount(et.embryo_fee)}${(et.embryo_fee_currency ?? "").trim().toUpperCase()}`
      : "";

  const lastVerified = et?.last_verified_at?.trim() ?? "";
  const lastVerifiedDisplay = (() => {
    if (!lastVerified) return "";
    const date = new Date(lastVerified);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(locale, { dateStyle: "medium" });
  })();
  const stale = isEtVerificationStale(lastVerified);

  const hasCards =
    Boolean(et?.et_status?.trim()) ||
    Boolean(clinicDisplay) ||
    Boolean(et?.flush_history?.trim()) ||
    availabilityChips.length > 0 ||
    Boolean(feeDisplay) ||
    Boolean(lastVerifiedDisplay);

  const hasFooter =
    countries.length > 0 || et?.international_availability === true;

  if (!hasCards && !hasFooter) {
    return null;
  }

  return (
    <section className="px-5 py-2 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={profileSectionTitleClassName}>{t("title")}</h2>
        <p className="profile-et-note rounded-sm border border-gold/30 bg-gold/10 px-3 py-2 text-[13px] leading-[1.45] text-[#e8d4a8]">
          {t("contactOwnerNote")}
        </p>
      </div>

      {hasCards ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {et?.et_status?.trim() ? (
            <div className="rounded border border-white/10 bg-surface px-5 py-4 text-center">
              <p className={profileStatLabelClassName}>{t("status")}</p>
              <div className="mt-2">
                {/* Spec: active statuses render as a green pill. */}
                <span
                  className={
                    isInactiveEtStatus(et.et_status)
                      ? "inline-block rounded-[50px] border border-white/10 bg-white/5 px-3 py-1.5 text-[14px] text-white/70"
                      : "inline-block rounded-[50px] bg-[rgba(109,236,109,0.14)] px-3 py-1.5 text-[14px] text-[#6dec6d]"
                  }
                >
                  {et.et_status.trim()}
                </span>
              </div>
            </div>
          ) : null}
          {clinicDisplay ? (
            <StatCard
              variant="profile-gold"
              label={t("clinic")}
              value={clinicDisplay}
            />
          ) : null}
          {feeDisplay ? (
            <StatCard
              variant="profile-gold"
              label={t("embryoFee")}
              value={feeDisplay}
            />
          ) : null}
          {et?.flush_history?.trim() ? (
            <StatCard
              variant="profile-gold"
              label={t("flushHistory")}
              value={et.flush_history.trim()}
            />
          ) : null}
          {availabilityChips.length > 0 ? (
            <div className="rounded border border-white/10 bg-surface px-5 py-4 text-center">
              <p className={profileStatLabelClassName}>{t("availability")}</p>
              <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-3">
                {availabilityChips.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </div>
            </div>
          ) : null}
          {lastVerifiedDisplay ? (
            <div className="rounded border border-white/10 bg-surface px-5 py-4 text-center">
              <p className={profileStatLabelClassName}>{t("lastVerified")}</p>
              <p className="mt-2 text-[16px] font-medium text-white">
                {lastVerifiedDisplay}
              </p>
              {stale ? (
                <p className="mt-2 inline-block rounded-sm border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-[12px] text-amber-300/90">
                  {t("unverifiedBadge")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasFooter ? (
        <>
          <h3 className={`mt-6 ${profileSubheadingClassName}`}>
            {t("countryAvailability")}
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
            {et?.international_availability === true ? (
              <span className="rounded-sm border border-gold/40 bg-surface px-8 py-4 text-[16px] text-gold-alt">
                {t("internationalAvailability")}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
