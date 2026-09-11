"use client";

import debounce from "lodash.debounce";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DirectoryFilterSelect from "@/components/stallion/DirectoryFilterSelect";
import { useRouter } from "@/i18n/navigation";
import type { DirectoryFilterOptions } from "@/services/directory";

const SEARCH_DEBOUNCE_MS = 300;

const inputClass =
  "h-[40px] w-full rounded-[4px] border border-line bg-transparent pl-[38px] pr-[15px] text-[14px] text-white outline-none transition-colors placeholder:text-grey focus:border-gold/60";

type DirectoryFiltersProps = {
  /** Page the filters navigate to, e.g. "/resources/associations". */
  basePath: string;
  /** Messages namespace holding heading/resetAll/…/allBreeds. */
  namespace: string;
  /**
   * URL parameter backing the third dropdown. The two directories filter
   * different columns — `breed_focus` on associations, `focus` on the
   * commercial directory — so the param name travels with the caller.
   */
  facetParam: string;
  options: DirectoryFilterOptions;
};

/**
 * Filter panel shared by both public resource directories.
 *
 * Design (Figma 411:2458 associations, 411:2018 commercial) puts these three
 * fields in a full-width horizontal card, unlike the stallion directory's 327px
 * left sidebar. Filters live in the URL so the server component can read them
 * and the page stays shareable.
 *
 * The two dropdowns render straight from the URL and navigate on change, so
 * they need no local state. Only the text input is mirrored locally, to stay
 * responsive while its navigation is debounced.
 */
export default function DirectoryFilters({
  basePath,
  namespace,
  facetParam,
  options,
}: DirectoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations(namespace);
  const searchId = useId();

  const urlSearch = searchParams.get("q") ?? "";
  const country = searchParams.get("country") ?? "All";
  const facet = searchParams.get(facetParam) ?? "All";

  const [search, setSearch] = useState(urlSearch);

  // Adjust the input when the URL changes underneath us (back/forward, or the
  // Reset button). Comparing against the last-seen URL value during render is
  // React's documented alternative to syncing with an effect.
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const buildHref = useMemo(
    () =>
      (nextSearch: string, nextCountry: string, nextFacet: string): string => {
        const params = new URLSearchParams();
        const trimmed = nextSearch.trim();
        if (trimmed) params.set("q", trimmed);
        if (nextCountry !== "All") params.set("country", nextCountry);
        if (nextFacet !== "All") params.set(facetParam, nextFacet);
        // Any filter change invalidates the current page offset, so `page` is
        // deliberately dropped rather than carried over.
        const qs = params.toString();
        return qs ? `${basePath}?${qs}` : basePath;
      },
    [basePath, facetParam]
  );

  const debouncedPush = useMemo(
    () =>
      debounce((next: string, nextCountry: string, nextFacet: string) => {
        router.replace(buildHref(next, nextCountry, nextFacet));
      }, SEARCH_DEBOUNCE_MS),
    [router, buildHref]
  );

  useEffect(() => () => debouncedPush.cancel(), [debouncedPush]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    debouncedPush(value, country, facet);
  };

  // Dropdowns navigate immediately; there is no typing to wait for.
  const onCountryChange = (value: string) => {
    debouncedPush.cancel();
    router.replace(buildHref(search, value, facet));
  };

  const onFacetChange = (value: string) => {
    debouncedPush.cancel();
    router.replace(buildHref(search, country, value));
  };

  const onReset = () => {
    debouncedPush.cancel();
    setSearch("");
    router.replace(basePath);
  };

  const hasActiveFilters =
    search.trim() !== "" || country !== "All" || facet !== "All";

  return (
    <section className="rounded-lg bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[12px] font-semibold uppercase leading-none tracking-[2px] text-gold">
          {t("heading")}
        </h2>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] font-medium leading-none text-gold transition-opacity hover:opacity-80"
          >
            {t("resetAll")}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor={searchId} className="text-[16px] leading-7 text-white">
            {t("searchLabel")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey"
              aria-hidden
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>

        <DirectoryFilterSelect
          label={t("countryLabel")}
          value={country}
          onChange={onCountryChange}
          allLabel={t("allCountries")}
          options={[
            { value: "All", label: t("allCountries") },
            ...options.countries.map((value) => ({ value, label: value })),
          ]}
        />

        <DirectoryFilterSelect
          label={t("breedLabel")}
          value={facet}
          onChange={onFacetChange}
          allLabel={t("allBreeds")}
          options={[
            { value: "All", label: t("allBreeds") },
            ...options.facets.map((value) => ({ value, label: value })),
          ]}
        />
      </div>
    </section>
  );
}
