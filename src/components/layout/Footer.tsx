"use client";

import { Link } from "@/i18n/navigation";
import LanguageSelector from "@/components/layout/LanguageSelector";
import type { ResolvedFooterContent, ResolvedHeaderContent } from "@/types/cms";
import { useTranslations } from "next-intl";

const labelClass =
  "text-[12px] font-semibold uppercase tracking-[2px] leading-none text-grey-2";
const linkClass =
  "text-[14px] leading-[1.4] text-white transition-opacity hover:opacity-80";
const termsClass =
  "text-[14px] text-grey-2 transition-opacity hover:opacity-80";

export default function Footer({
  showLandingNav = true,
  showAbout = true,
  showPricing = true,
  content,
  navLabels,
}: {
  showLandingNav?: boolean;
  showAbout?: boolean;
  showPricing?: boolean;
  content?: ResolvedFooterContent;
  navLabels?: ResolvedHeaderContent;
}) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const footer = content ?? {
    brandTitle: t("brandTitle"),
    tagline: t("tagline"),
    breeds: t("breeds"),
    regionsLine1: t("regionsLine1"),
    regionsLine2: t("regionsLine2"),
    linksHeading: t("linksHeading"),
    submitListing: t("submitListing"),
    contactHeading: t("contactHeading"),
    contactEmail: "info@leadingsiresregistry.com",
    copyright: t("copyright"),
    termsOfUse: t("termsOfUse"),
    privacyPolicy: t("privacyPolicy"),
  };
  const nav = navLabels ?? {
    brand: tNav("brand"),
    registry: tNav("registry"),
    stallionDirectory: tNav("stallionDirectory"),
    mareDirectory: tNav("mareDirectory"),
    blog: tNav("blog"),
    about: tNav("about"),
    pricing: tNav("pricing"),
    resources: tNav("resources"),
    commercialDirectory: tNav("commercialDirectory"),
    associationsRegistries: tNav("associationsRegistries"),
    login: tNav("login"),
  };

  return (
    <footer className="border-t border-zinc-900 bg-black text-zinc-300">
      <div className="w-full px-5 py-10 sm:px-8 md:py-12 lg:py-14">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.9fr_0.95fr]">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[16px] leading-7 text-white">
                {t("brandTitle")}
              </p>
              <p className="text-[14px] leading-[1.4] text-zinc-300">
                {footer.tagline}
              </p>
            </div>
            <div className="space-y-1">
              <p className={labelClass}>{footer.breeds}</p>
              <p className={labelClass}>{footer.regionsLine1}</p>
              <p className={labelClass}>{footer.regionsLine2}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className={labelClass}>{t("linksHeading")}</p>
            <div className="flex flex-col gap-4">
              {showLandingNav ? (
                <Link href="/" className={linkClass}>
                  {nav.registry}
                </Link>
              ) : null}
              <Link href="/stallions" className={linkClass}>
                {nav.stallionDirectory}
              </Link>
              <Link href="/mares" className={linkClass}>
                {nav.mareDirectory}
              </Link>
              <Link href="/blog" className={linkClass}>
                {nav.blog}
              </Link>
              <Link href="/resources" className={linkClass}>
                {nav.resources}
              </Link>
              <Link
                href="/submit-stallion/before-submit"
                className={linkClass}
              >
                {footer.submitListing}
              </Link>
              {showAbout ? (
                <Link href="/about" className={linkClass}>
                  {nav.about}
                </Link>
              ) : null}
              {showPricing ? (
                <Link href="/pricing" className={linkClass}>
                  {nav.pricing}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className={labelClass}>{footer.contactHeading}</p>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${footer.contactEmail}`}
                className="text-[14px] text-gold transition-opacity hover:opacity-80"
              >
                {footer.contactEmail}
              </a>
              <a
                href="https://facebook.com/leadingsiresregistry"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-gold transition-opacity hover:opacity-80"
              >
                facebook.com/leadingsiresregistry
              </a>
            </div>
            {/* <LanguageSelector /> */}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-900 px-5 py-7 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px] font-medium text-grey-2">
            {footer.copyright}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className={termsClass}>
              {footer.termsOfUse}
            </Link>
            <Link href="/" className={termsClass}>
              {footer.privacyPolicy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
