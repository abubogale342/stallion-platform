"use client";

import { useState } from "react";
import type { PedigreeChartCell } from "@/types/stallion";
import Button from "@/ui/Button";
import Modal from "@/ui/Modal";
import { useTranslations } from "next-intl";
import OtherRegistrationDetails from "./OtherRegistrationDetails";

function RegistrationList({
  registrations,
}: {
  registrations: NonNullable<PedigreeChartCell["additional_registrations"]>;
}) {
  return (
    <div className="space-y-2">
      {registrations.map((reg, index) => (
        <OtherRegistrationDetails
          key={`${reg.association_name ?? ""}-${reg.country ?? ""}-${reg.registration_number ?? ""}-${index}`}
          registration={reg}
        />
      ))}
    </div>
  );
}

export default function PedigreeCellLabel({
  cell,
  isMobile,
}: {
  cell: PedigreeChartCell;
  isMobile: boolean;
}) {
  const t = useTranslations("profile.pedigree");
  const extras = cell.additional_registrations ?? [];
  const [open, setOpen] = useState(false);

  const horseName =
    cell.horse_name?.trim() ||
    cell.name.split("(")[0]?.trim() ||
    cell.name;

  const primaryLabel =
    cell.primary_registration ??
    (cell.name.includes("(")
      ? cell.name.slice(horseName.length).trim().replace(/^\(|\)$/g, "")
      : undefined);

  if (extras.length === 0) {
    return (
      <p className="text-[15px] font-medium leading-snug text-white break-words">
        {primaryLabel ? (
          <>
            {horseName}
            <span className="text-white/60"> ({primaryLabel})</span>
          </>
        ) : (
          cell.name
        )}
      </p>
    );
  }

  return (
    <div className="group relative inline-block max-w-full text-center">
      <p className="text-[15px] font-medium leading-snug text-white break-words">
        <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
          <span className="min-w-0 break-words">
            {horseName}
            {primaryLabel ? (
              <span className="text-white/60"> ({primaryLabel})</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="unstyled"
            size="none"
            aria-expanded={open}
            aria-label={t("showAdditionalRegistrations")}
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) setOpen(true);
            }}
            className="inline-grid size-[18px] shrink-0 place-items-center self-center rounded-sm border border-white/25 bg-white/10 p-0 text-[13px] font-semibold leading-none text-gold-alt hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-gold-alt/50"
          >
            <span className="block translate-y-px leading-none">+</span>
          </Button>
        </span>
      </p>

      {isMobile ? (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={t("otherRegistrations")}
          size="md"
          className="border-white/15 bg-[rgba(14,16,20,0.97)]"
        >
          <RegistrationList registrations={extras} />
        </Modal>
      ) : (
        <div
          className="absolute left-1/2 top-full z-30 mt-1 hidden w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-white/15 bg-[rgba(14,16,20,0.97)] px-3 py-2 text-left shadow-lg group-hover:block group-focus-within:block"
          role="tooltip"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            {t("otherRegistrations")}
          </p>
          <RegistrationList registrations={extras} />
        </div>
      )}
    </div>
  );
}
