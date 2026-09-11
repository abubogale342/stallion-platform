"use client";

import type { PedigreeChartAdditionalRegistration } from "@/types/stallion";
import { useTranslations } from "next-intl";

export default function OtherRegistrationDetails({
  registration,
}: {
  registration: PedigreeChartAdditionalRegistration;
}) {
  const t = useTranslations("profile.pedigree");
  const assoc = registration.association_name?.trim();
  const country = registration.country?.trim().toUpperCase();
  const regNum = registration.registration_number?.trim();

  return (
    <div className="space-y-0.5 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      {assoc && assoc !== "—" ? (
        <p className="text-xs text-white/80">
          <span className="text-white/45">{t("association")} </span>
          {assoc}
        </p>
      ) : null}
      {country ? (
        <p className="text-xs text-white/80">
          <span className="text-white/45">{t("country")} </span>
          {country}
        </p>
      ) : null}
      {regNum ? (
        <p className="text-xs text-white/80">
          <span className="text-white/45">{t("registration")} </span>
          {regNum}
        </p>
      ) : null}
    </div>
  );
}
