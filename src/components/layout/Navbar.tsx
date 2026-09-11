"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Button from "@/ui/Button";
import LanguageSelector from "@/components/layout/LanguageSelector";
import type { ResolvedHeaderContent } from "@/types/cms";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" d="M4 7h16" />
      <path strokeLinecap="round" d="M4 12h16" />
      <path strokeLinecap="round" d="M4 17h16" />
    </svg>
  );
}

const loginButtonClass =
  "inline-flex items-center justify-center rounded-md bg-[#cac09b] px-5 py-2.5 text-[18px] font-semibold uppercase tracking-wide text-black transition-opacity hover:opacity-90 sm:py-2";

const navLinkClass =
  "text-[14px] text-white transition-opacity hover:opacity-80";

const navLinkActiveClass = "text-[14px] text-gold";

const mobileLinkClass =
  "block w-full px-1 py-2.5 text-[15px] text-white transition-opacity hover:opacity-80";

const mobileLinkActiveClass =
  "block w-full px-1 py-2.5 text-[15px] text-gold";

export default function Navbar({
  showLandingNav = true,
  showAbout = true,
  showPricing = true,
  content,
}: {
  showLandingNav?: boolean;
  showAbout?: boolean;
  showPricing?: boolean;
  content?: ResolvedHeaderContent;
}) {
  const t = useTranslations("nav");
  const labels = content ?? {
    brand: t("brand"),
    registry: t("registry"),
    stallionDirectory: t("stallionDirectory"),
    mareDirectory: t("mareDirectory"),
    blog: t("blog"),
    about: t("about"),
    pricing: t("pricing"),
    resources: t("resources"),
    commercialDirectory: t("commercialDirectory"),
    associationsRegistries: t("associationsRegistries"),
    login: t("login"),
  };
  const pathname = usePathname();
  const mobileMenuId = useId();

  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResourcesOpen(false);
    setMobileOpen(false);
    setMobileResourcesOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setResourcesOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileOpen(false);
        setMobileResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const linkClass = (href: string) =>
    pathname === href ? navLinkActiveClass : navLinkClass;

  const mobileLink = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
      ? mobileLinkActiveClass
      : mobileLinkClass;

  const resourcesPathActive =
    pathname === "/resources" || pathname.startsWith("/resources/");

  return (
    <header
      ref={mobileMenuRef}
      className="sticky top-0 z-50 border-b border-nav-border bg-nav-bg backdrop-blur-md"
    >
      <div className="mx-auto flex w-full items-center justify-between gap-6 px-5 py-5 sm:px-8 md:py-6">
        <Link href="/" className="text-[24px] font-semibold text-white">
          {labels.brand}
        </Link>

        <nav className="hidden items-center gap-6 lg:gap-8 md:flex">
          {showLandingNav ? (
            <Link href="/" className={linkClass("/")}>
              {labels.registry}
            </Link>
          ) : null}
          <Link href="/stallions" className={linkClass("/stallions")}>
            {labels.stallionDirectory}
          </Link>
          <Link href="/mares" className={linkClass("/mares")}>
            {labels.mareDirectory}
          </Link>
          <Link href="/blog" className={linkClass("/blog")}>
            {labels.blog}
          </Link>
          {showAbout ? (
            <Link href="/about" className={linkClass("/about")}>
              {labels.about}
            </Link>
          ) : null}
          {showPricing ? (
            <Link href="/pricing" className={linkClass("/pricing")}>
              {labels.pricing}
            </Link>
          ) : null}

          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              variant="unstyled"
              size="none"
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              onClick={() => setResourcesOpen((v) => !v)}
              className={`inline-flex items-center gap-1 ${
                resourcesPathActive ? navLinkActiveClass : navLinkClass
              }`}
            >
              {labels.resources}
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  resourcesOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
            {resourcesOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
                <Link
                  href="/resources"
                  className="block px-4 py-2.5 text-[14px] text-zinc-200 hover:bg-zinc-900"
                >
                  {labels.commercialDirectory}
                </Link>
                <Link
                  href="/resources/associations"
                  className="block px-4 py-2.5 text-[14px] text-zinc-200 hover:bg-zinc-900"
                >
                  {labels.associationsRegistries}
                </Link>
              </div>
            ) : null}
          </div>

          <LanguageSelector id="language-selector-desktop" />

          <a href="/login" className={loginButtonClass}>
            {labels.login}
          </a>
        </nav>

        <div className="flex items-center md:hidden shrink-0">
          <Button
            type="button"
            variant="unstyled"
            size="none"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => {
              setMobileOpen((v) => !v);
              if (mobileOpen) setMobileResourcesOpen(false);
            }}
            className="inline-flex items-center justify-center rounded-md border border-white/20 p-2.5 text-white transition-colors hover:border-white/40"
          >
            <MenuIcon className="h-5 w-5 shrink-0" />
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id={mobileMenuId}
          className="border-t border-nav-border bg-black/95 px-5 py-3 md:hidden"
        >
          <nav className="mx-auto flex w-full flex-col" aria-label={t("menu")}>
            {showLandingNav ? (
              <Link href="/" className={mobileLink("/")}>
                {labels.registry}
              </Link>
            ) : null}
            <Link href="/stallions" className={mobileLink("/stallions")}>
              {labels.stallionDirectory}
            </Link>
            <Link href="/mares" className={mobileLink("/mares")}>
              {labels.mareDirectory}
            </Link>
            <Link href="/blog" className={mobileLink("/blog")}>
              {labels.blog}
            </Link>
            {showAbout ? (
              <Link href="/about" className={mobileLink("/about")}>
                {labels.about}
              </Link>
            ) : null}
            {showPricing ? (
              <Link href="/pricing" className={mobileLink("/pricing")}>
                {labels.pricing}
              </Link>
            ) : null}

            <div className="border-t border-white/10 pt-1">
              <Button
                type="button"
                variant="unstyled"
                size="none"
                aria-expanded={mobileResourcesOpen}
                onClick={() => setMobileResourcesOpen((v) => !v)}
                className={`inline-flex w-full items-center justify-between gap-2 ${
                  resourcesPathActive ? mobileLinkActiveClass : mobileLinkClass
                }`}
              >
                {labels.resources}
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    mobileResourcesOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
              {mobileResourcesOpen ? (
                <div className="mb-1 ml-3 flex flex-col border-l border-white/15 pl-3">
                  <Link href="/resources" className={mobileLink("/resources")}>
                    {labels.commercialDirectory}
                  </Link>
                  <Link
                    href="/resources/associations"
                    className={mobileLink("/resources/associations")}
                  >
                    {labels.associationsRegistries}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 pt-3 pb-1">
              <LanguageSelector
                id="language-selector-mobile"
                className="w-full"
              />
            </div>

            <div className="border-t border-white/10 pt-3 pb-1">
              <a href="/login" className={`${loginButtonClass} w-full`}>
                {labels.login}
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
