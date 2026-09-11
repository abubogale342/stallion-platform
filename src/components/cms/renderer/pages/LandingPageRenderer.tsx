import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import AccentLink from "@/ui/AccentLink";
import { cn } from "@/utils/common";
import { resolveLocalized } from "@/utils/cms-i18n";
import type { CmsBlock, CmsContentLocale } from "@/types/cms";

type LandingHeroBlock = Extract<CmsBlock, { type: "landing_hero" }>;

function LandingHeroSection({
  block,
  locale,
  heroAriaLabel,
}: {
  block: LandingHeroBlock;
  locale: CmsContentLocale;
  heroAriaLabel: string;
}) {
  const src = block.imageSrc?.trim() || "/splash_page.png";

  return (
    <section
      className="relative isolate left-1/2 -mt-8 w-screen max-w-[100vw] -translate-x-1/2"
      aria-label={heroAriaLabel}
    >
      <div className="relative min-h-[min(32rem,85vh)] overflow-hidden sm:min-h-[min(36rem,88vh)] md:min-h-[min(40rem,90vh)]">
        <div
          className="absolute inset-0 -z-20 bg-zinc-900 bg-cover bg-no-repeat [background-position:70%_center] sm:[background-position:right_center]"
          style={{ backgroundImage: `url('${src}')` }}
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/88 via-black/50 to-black/15 sm:from-black/85 sm:via-black/40 sm:to-transparent"
          aria-hidden
        />

        <div className="relative flex w-full flex-col px-5 pb-14 pt-20 text-left sm:px-8 sm:pb-20 sm:pt-24 md:pb-24 md:pt-28 lg:pt-32">
          <div className="max-w-xl space-y-5 sm:max-w-2xl sm:space-y-6 lg:space-y-7">
            <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.22em] text-[#c09a64] sm:text-xs sm:tracking-[0.24em]">
              {resolveLocalized(block.overline, locale)}
            </p>

            <h1 className="text-[1.65rem] font-bold leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl">
              <span className="text-white">
                {resolveLocalized(block.titleBeforeAccent, locale)}
              </span>{" "}
              <span className="text-[#c09a64]">
                {resolveLocalized(block.titleAccent, locale)}
              </span>
            </h1>

            <p className="text-base font-medium text-white/95 sm:text-lg md:text-xl">
              {resolveLocalized(block.subtitle, locale)}
            </p>

            <p className="max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-base md:text-[17px] md:leading-[1.6]">
              {resolveLocalized(block.description, locale)}
            </p>

            {block.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {block.tags.map((tag, i) => (
                  <span
                    key={`${resolveLocalized(tag, locale)}-${i}`}
                    className="rounded-md border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm sm:text-[11px] sm:tracking-[0.16em]"
                  >
                    {resolveLocalized(tag, locale)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2 sm:pt-3">
              <Link
                href={block.cta.href}
                className="inline-flex rounded-md bg-[#cac09b] px-7 py-3 text-[18px] font-semibold uppercase tracking-wide text-black transition-opacity hover:opacity-90 sm:px-8"
              >
                {resolveLocalized(block.cta.label, locale)}
              </Link>
              {block.secondaryCta?.href &&
              resolveLocalized(block.secondaryCta.label, locale).trim() ? (
                <Link
                  href={block.secondaryCta.href}
                  className="inline-flex rounded-md bg-[#cac09b] px-7 py-3 text-[18px] font-semibold uppercase tracking-wide text-black transition-opacity hover:opacity-90 sm:px-8"
                >
                  {resolveLocalized(block.secondaryCta.label, locale)}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black px-5 py-14 sm:px-8 sm:py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="space-y-5">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              {resolveLocalized(block.referenceLeftTitle, locale)}
            </h2>
            <p className="max-w-xl text-[18px] leading-relaxed text-white/60">
              {resolveLocalized(block.referenceLeftText, locale)}
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              {resolveLocalized(block.referenceRightTitle, locale)}
            </h2>
            <p className="max-w-xl text-[18px] leading-relaxed text-white/60">
              {resolveLocalized(block.referenceRightText, locale)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingSecondarySection({
  block,
  locale,
}: {
  block: LandingHeroBlock;
  locale: CmsContentLocale;
}) {
  const stats = block.stats.slice(0, 4);

  return (
    <section className="relative isolate left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
      <div className="mx-auto w-full px-5 sm:px-8">
        <div className="border-t border-zinc-800/70 bg-black">
          <div className="grid gap-12 px-4 pt-20 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pt-24">
            <div className="space-y-7">
              <h2 className="max-w-xl text-[40px] font-semibold leading-tight tracking-tight text-white md:text-[52px]">
                {resolveLocalized(block.industryTitle, locale)}
              </h2>
              <p className="max-w-2xl text-[18px] leading-relaxed text-white/60">
                {resolveLocalized(block.industryText, locale)}
              </p>
              <div className="flex max-w-2xl flex-wrap gap-3">
                {block.regions.map((region, i) => (
                  <span
                    key={`${resolveLocalized(region, locale)}-${i}`}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-[22px] leading-none text-white"
                  >
                    {resolveLocalized(region, locale)}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 border border-zinc-800 bg-zinc-950/40">
                <div className="space-y-2 border-b border-r border-zinc-800 p-6">
                  <p className="text-6xl font-semibold leading-none text-[#c09a64]">
                    {resolveLocalized(stats[0]?.value, locale)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-white">
                    {resolveLocalized(stats[0]?.label, locale)}
                  </p>
                </div>
                <div className="space-y-2 border-b border-zinc-800 p-6">
                  <p className="text-6xl font-semibold leading-none text-[#c09a64]">
                    {resolveLocalized(stats[1]?.value, locale)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-white">
                    {resolveLocalized(stats[1]?.label, locale)}
                  </p>
                </div>
                <div className="space-y-2 border-r border-zinc-800 p-6">
                  <p className="text-6xl font-semibold leading-none text-[#c09a64]">
                    {resolveLocalized(stats[2]?.value, locale)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-white">
                    {resolveLocalized(stats[2]?.label, locale)}
                  </p>
                </div>
                <div className="space-y-2 p-6">
                  <p className="text-6xl font-semibold leading-none text-[#c09a64]">
                    {resolveLocalized(stats[3]?.value, locale)}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-white">
                    {resolveLocalized(stats[3]?.label, locale)}
                  </p>
                </div>
              </div>

              <AccentLink
                href={block.learnMore.href}
                variant="subtle"
                suffix={
                  <span aria-hidden className="text-xl leading-none">
                    →
                  </span>
                }
              >
                {resolveLocalized(block.learnMore.label, locale)}
              </AccentLink>
            </div>
          </div>
          <div className="flex flex-col gap-5 px-4 pt-24 pb-20 sm:flex-row sm:items-center sm:justify-between md:px-4 md:pt-28 md:pb-24">
            <div className="space-y-2">
              <p className="text-[34px] font-semibold leading-tight text-white">
                {resolveLocalized(block.readyTitle, locale)}
              </p>
              <p className="text-[18px] text-white/60">
                {resolveLocalized(block.readySubtitle, locale)}
              </p>
            </div>
            <Link
              href={block.readyCta.href}
              className="inline-flex w-fit rounded-md bg-white px-7 py-3 text-[15px] font-semibold uppercase tracking-wide text-black transition-opacity hover:opacity-90"
            >
              {resolveLocalized(block.readyCta.label, locale)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function LandingPageRenderer({
  blocks,
  locale,
}: {
  blocks: CmsBlock[];
  locale: CmsContentLocale;
}) {
  const t = await getTranslations("cms");
  const gridIdx = blocks.findIndex((b) => b.type === "grid");
  const heroBlocks = gridIdx === -1 ? blocks : blocks.slice(0, gridIdx);
  const heroBlock =
    heroBlocks.find((b): b is LandingHeroBlock => b.type === "landing_hero") ??
    null;

  return (
    <div className="overflow-x-clip space-y-24">
      {heroBlock ? (
        <LandingHeroSection
          block={heroBlock}
          locale={locale}
          heroAriaLabel={t("heroAriaLabel")}
        />
      ) : null}
      {heroBlock ? (
        <LandingSecondarySection block={heroBlock} locale={locale} />
      ) : null}
    </div>
  );
}
