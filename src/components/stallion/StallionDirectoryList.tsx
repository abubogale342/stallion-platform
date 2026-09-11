import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Stallion } from "@/types/stallion";
import HighlightMatch from "@/components/stallion/HighlightMatch";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";
import CountryFlag from "@/ui/CountryFlag";
import { pedigreeGenerationLabel } from "@/utils/pedigree";
import { resolveStallionCountry } from "@/utils/stallion";

export default async function StallionDirectoryList({
  stallions,
  searchKeyword = "",
  bloodlineNames = [],
  hrefBase = "/stallions",
}: {
  stallions: Stallion[];
  searchKeyword?: string;
  /** Ancestor names searched for, used to highlight the matched ancestor. */
  bloodlineNames?: string[];
  /** Profile link base: "/stallions" (default) or "/mares". */
  hrefBase?: "/stallions" | "/mares";
}) {
  const t = await getTranslations("stallions.table");
  const tMatch = await getTranslations("stallions.directoryMatch");
  const tCommon = await getTranslations("common");
  const query = searchKeyword.trim();
  const ancestorQueries = bloodlineNames
    .map((name) => name.trim())
    .filter(Boolean);

  /** The condition that produced this match, so the right part lights up. */
  const ancestorQueryFor = (ancestorName: string) =>
    ancestorQueries.find((needle) =>
      ancestorName.toLowerCase().includes(needle.toLowerCase())
    ) ?? "";

  if (!stallions.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {stallions.map((s) => {
        const breed =
          (s.breed_label ?? (s as unknown as { breed?: string }).breed) ||
          tCommon("empty");
        const discipline = s.discipline_focus?.length
          ? s.discipline_focus.join(", ")
          : s.discipline_coverage_description?.trim() || tCommon("empty");
        const sire = s.pedigree?.sire?.name || tCommon("empty");
        const dam = s.pedigree?.dam?.name || tCommon("empty");
        const country =
          (s as unknown as { country_of_residence?: string })
            .country_of_residence ?? "";
        const countryCode = resolveStallionCountry(country)?.code;
        // One badge per bloodline condition the horse satisfied.
        const ancestorMatches = (s.directory_ancestor_matches ?? []).filter(
          (match, index, all) =>
            all.findIndex(
              (other) =>
                other.ancestor_name === match.ancestor_name &&
                other.generation === match.generation &&
                other.branch === match.branch
            ) === index
        );

        return (
          <Link key={s.id} href={`${hrefBase}/${s.slug}`} className="block group">
            <article className="flex flex-col gap-4 overflow-hidden rounded-lg border border-line bg-surface p-5 transition-colors group-hover:border-gold/40 lg:flex-row lg:items-start lg:gap-7">
              <div className="relative h-31.25 w-37.5 shrink-0 overflow-hidden rounded-sm">
                <Image
                  src={s?.media?.primary_image_url || STALLION_IMAGE_PLACEHOLDER_SRC}
                  alt={s.stallion_name ?? ""}
                  fill
                  sizes="(min-width: 1024px) 150px, 20vw"
                  className="object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-[20px] font-semibold leading-7 tracking-[0.4px] text-white lg:text-[22px] lg:leading-9 lg:tracking-[0.44px]">
                    {query ? (
                      <HighlightMatch text={s.stallion_name ?? ""} query={query} />
                    ) : (
                      s.stallion_name
                    )}
                  </p>
                  {country && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[16px] leading-none text-gold font-poppins">
                        {country}
                      </span>
                      {countryCode && (
                        <CountryFlag
                          code={countryCode}
                          className="size-3.5 shrink-0 rounded-[1px] object-cover"
                        />
                      )}
                    </div>
                  )}
                </div>

                {ancestorMatches.length ? (
                  <div className="flex flex-col gap-1">
                    {ancestorMatches.map((match) => (
                      <p
                        key={`${match.ancestor_name}-${match.generation}-${match.branch}`}
                        className="rounded-sm border border-[#c09a64]/30 bg-[#c09a64]/10 px-3 py-2 text-[13px] leading-[1.45] text-[#e8d4a8]"
                      >
                        <span className="font-medium text-[#c09a64]">
                          {tMatch("matchedAncestor")}:{" "}
                        </span>
                        <HighlightMatch
                          text={match.ancestor_name}
                          query={ancestorQueryFor(match.ancestor_name)}
                        />
                        <span className="text-[#aaa]">
                          {" · "}
                          {pedigreeGenerationLabel(match.generation)}
                          {" · "}
                          {match.branch === "dam"
                            ? tMatch("damLine")
                            : tMatch("sireLine")}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null}

                <hr className="border-t border-line" />

                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-1 lg:w-42">
                    <p className="text-[16px] leading-7 text-grey-2">
                      {t("breed")}
                    </p>
                    <p className="text-[14px] leading-[1.4] text-white">
                      {breed}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 lg:w-41.75">
                    <p className="text-[16px] leading-7 text-grey-2">
                      {t("disciplines")}
                    </p>
                    <p className="text-[14px] leading-[1.4] text-white">
                      {discipline}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[16px] leading-7 text-grey-2">
                      {t("pedigree")}
                    </p>
                    <p className="text-[14px] leading-[1.4] text-white">
                      {query ? (
                        <>
                          <HighlightMatch text={sire} query={query} />
                          {" "}
                          {t("pedigreeSeparator")}
                          {" "}
                          <HighlightMatch text={dam} query={query} />
                        </>
                      ) : (
                        <>
                          {sire} {t("pedigreeSeparator")} {dam}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
