import "server-only";
import {
  mapBreedingProviderFormRow,
} from "@/services/breeding";
import {
  mapColourTestFormRow,
  mapGeneticTestFormRow,
} from "@/services/health";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardBreakdownRow, AdminDashboardCountryDisciplineRow, AdminDashboardStats } from "@/types/admin-dashboard";
import type { AdminStallionListRow, AdminStallionPublishStatus, AdminStallionsStatusFilter, AdminStallionsTypeFilter } from "@/types/admin-stallions";
import type { DisciplineFamily } from "@/types/discipline";
import type {
  FormBreedingProviderRow,
  FormColourTestRow,
  FormFoalCropRow,
  FormGalleryItem,
  FormGeneticTestRow,
  FormMareEtDetails,
  FormPerformanceRow,
  FormProgenyRow,
  FormRacingRow,
  FormRacingSummary,
  FormStudFeeRow,
  StallionFormValues,
} from "@/types/stallion-form";
import type { BreedingServiceProvider, DirectoryAncestorMatch, HorseType, Owner, SemenAvailability, Stallion, StallionBreed } from "@/types/stallion";
import type { BloodlineCondition } from "@/utils/bloodline-search";
import { coatColourFilterVariants } from "@/utils/coat-colour-i18n";
import { isUuidString, isBreedType, isSemenAvailabilityOptionType } from "@/utils/common";
import { requireServerAuth } from "@/services/auth.server";
import {
  createEmptyStallionFormState,
  deriveYearOfBirth,
  mapBreedingServiceProvider,
  mapDisciplineFamilyNames,
  mapImages,
  mapOwner,
  parseCountryAvailability,
  parseSemenAvailabilityValues,
  formatStudFeeCurrencyLabel,
  toStallion,
} from "@/utils/stallion";
import {
  mapGenerationOnePedigreeParents,
  type PedigreeParentNames,
} from "@/utils/pedigree";
import { buildPedigreeChartFromStallionRows } from "@/utils/pedigree-chart";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabase.server";
import {
  BREED_TO_DB_MAP,
  BREEDING_SERVICE_PROVIDER_SELECT,
  MARE_WITH_RELATIONS_SELECT,
  STALLION_OWNER_LINK_SELECT,
  STALLION_PEDIGREE_SELECT,
  STALLION_WITH_RELATIONS_SELECT,
  getStallionImageSignedUrl,
} from "@/services/stallion";
import { attachSignedStallionMediaUrls } from "@/services/stallion-image-sign.server";
import { resolvePublishedImageUrl } from "@/services/stallion-image-public.server";
import { fetchPublishedStallionProfileTranslationWithClient, applyPublishedProfileTranslation, applyLocaleProfileIdentityFallbacks } from "@/services/stallion-translations";
import { routing } from "@/i18n/routing";

async function getServerClient() {
  return createServerClient();
}

// --- enrichment.ts ---

export async function fetchDisciplineCoverageForStallions(
  stallionIds: string[],
  client: SupabaseClient = supabase
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const ids = Array.from(new Set(stallionIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return result;

  const { data: links, error: linksError } = await client
    .from("stallion_disciplines")
    .select("stallion_id, family_id")
    .in("stallion_id", ids);

  if (linksError) {
    console.error(
      "fetchDisciplineCoverageForStallions links error:",
      linksError.message
    );
    return result;
  }

  const familyIds = new Set<string>();
  const familyIdsByStallion = new Map<string, string[]>();

  for (const row of (links ?? []) as Record<string, unknown>[]) {
    const stallionId =
      typeof row.stallion_id === "string" ? row.stallion_id.trim() : "";
    const familyId = typeof row.family_id === "string" ? row.family_id.trim() : "";
    if (!stallionId || !familyId) continue;

    familyIds.add(familyId);
    const existing = familyIdsByStallion.get(stallionId) ?? [];
    if (!existing.includes(familyId)) existing.push(familyId);
    familyIdsByStallion.set(stallionId, existing);
  }

  if (familyIds.size === 0) return result;

  const { data: families, error: familiesError } = await client
    .from("discipline_families")
    .select("id, name, display_order")
    .in("id", Array.from(familyIds));

  if (familiesError) {
    console.error(
      "fetchDisciplineCoverageForStallions families error:",
      familiesError.message
    );
    return result;
  }

  const familyRows = (families ?? []) as Record<string, unknown>[];
  const familyRowsById = new Map(
    familyRows
      .map((row) => {
        const id = typeof row.id === "string" ? row.id.trim() : "";
        return id ? ([id, row] as const) : null;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] =>
        Boolean(entry)
      )
  );

  for (const [stallionId, linkedFamilyIds] of familyIdsByStallion) {
    const labels = mapDisciplineFamilyNames(
      linkedFamilyIds
        .map((familyId) => familyRowsById.get(familyId))
        .filter((row): row is Record<string, unknown> => Boolean(row))
    );

    if (labels?.length) result.set(stallionId, labels);
  }

  return result;
}

export async function fetchDisciplineCoverageForStallion(
  stallionId: string,
  client: SupabaseClient = supabase
): Promise<string[] | undefined> {
  const coverage = await fetchDisciplineCoverageForStallions([stallionId], client);
  return coverage.get(stallionId);
}

export async function fetchPerformanceRowsByStallionId(
  stallionId: string,
  client: SupabaseClient = supabase
): Promise<Record<string, unknown>[] | null> {
  const { data, error } = await client
    .from("stallion_performance_records")
    .select(
      "id, stallion_id, achievement, year, month, discipline, class, level, association, event, reference, comments, judges, earnings, currency, created_at, performance_summary, score, starts, firsts, seconds, thirds, highest_rating"
    )
    .eq("stallion_id", stallionId)
    .order("year", { ascending: false });

  if (error) {
    console.error("fetchPerformanceRowsByStallionId error:", error.message);
    return null;
  }

  return (data ?? []) as Record<string, unknown>[];
}

/** All `stallion_pedigrees` rows for the given stallions (all generations). */
export async function fetchStallionPedigreeRowsForStallions(
  stallionIds: string[],
  client: SupabaseClient = supabase
): Promise<Map<string, Record<string, unknown>[]>> {
  const result = new Map<string, Record<string, unknown>[]>();
  const ids = Array.from(new Set(stallionIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) return result;

  const { data, error } = await client
    .from("stallion_pedigrees")
    .select(STALLION_PEDIGREE_SELECT)
    .in("stallion_id", ids)
    .order("generation", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchStallionPedigreeRowsForStallions error:", error.message);
    return result;
  }

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const stallionId =
      typeof row.stallion_id === "string" ? row.stallion_id.trim() : "";
    if (!stallionId) continue;
    const list = result.get(stallionId) ?? [];
    list.push(row);
    result.set(stallionId, list);
  }

  return result;
}

/** Gen-1 sire/dam names from `stallion_pedigrees` for directory list rows. */
export async function fetchPedigreeParentsForStallions(
  stallionIds: string[],
  client: SupabaseClient = supabase
): Promise<Map<string, PedigreeParentNames>> {
  const rowsByStallion = await fetchStallionPedigreeRowsForStallions(
    stallionIds,
    client
  );
  const result = new Map<string, PedigreeParentNames>();

  for (const [stallionId, rows] of rowsByStallion) {
    const parents = mapGenerationOnePedigreeParents(rows);
    if (parents.sire || parents.dam) {
      result.set(stallionId, parents);
    }
  }

  return result;
}

export function withPedigreeParents(
  stallion: Stallion,
  parents: PedigreeParentNames | null | undefined
): Stallion {
  if (parents == null) return stallion;

  const sireName = parents.sire?.trim();
  const damName = parents.dam?.trim();
  if (!sireName && !damName) return stallion;

  return {
    ...stallion,
    pedigree: {
      ...stallion.pedigree,
      sire: {
        ...stallion.pedigree.sire,
        name: sireName ?? stallion.pedigree.sire.name,
      },
      dam: {
        ...stallion.pedigree.dam,
        name: damName ?? stallion.pedigree.dam.name,
      },
    },
  };
}

export function legacyBreedingServiceProvidersFromStallionRow(
  row: Record<string, unknown>
): BreedingServiceProvider[] {
  const provider = mapBreedingServiceProvider({
    name: row.breeding_service_provider_name,
    website: row.breeding_service_provider_website,
    country: row.breeding_service_provider_country,
    email: row.breeding_service_provider_email,
    phone: row.breeding_service_provider_phone,
  });
  return provider ? [provider] : [];
}

export async function fetchOwnersForStallion(
  stallionId: string,
  client: SupabaseClient = supabase
): Promise<Owner[] | undefined> {
  const { data, error } = await client
    .from("stallion_owners")
    .select(STALLION_OWNER_LINK_SELECT)
    .eq("stallion_id", stallionId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("fetchOwnersForStallion error:", error.message);
    return undefined;
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map((link) => {
      const nested = link.owners as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | null
        | undefined;
      const ownerRow = Array.isArray(nested) ? nested[0] : nested;
      if (!ownerRow || typeof ownerRow !== "object") return null;

      return mapOwner({
        ...ownerRow,
        owner_id: link.owner_id,
        public_display_name_only: link.public_display_name_only,
      });
    })
    .filter((owner): owner is Owner => owner != null);
}

export async function fetchBreedingServiceProvidersForStallion(
  stallionId: string,
  client: SupabaseClient = supabase
): Promise<BreedingServiceProvider[] | undefined> {
  const { data, error } = await client
    .from("stallion_breeding_service_providers")
    .select(BREEDING_SERVICE_PROVIDER_SELECT)
    .eq("stallion_id", stallionId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchBreedingServiceProvidersForStallion error:", error.message);
    return undefined;
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => mapBreedingServiceProvider(row))
    .filter((provider): provider is BreedingServiceProvider => provider != null);
}

export async function enrichStallionRow(
  row: Record<string, unknown>,
  client: SupabaseClient = supabase
): Promise<Stallion | null> {
  const performanceRows = await fetchPerformanceRowsByStallionId(String(row.id), client);
  const enriched = {
    ...row,
    stallion_performance_records:
      performanceRows ??
      (row.stallion_performance_records as Record<string, unknown>[] | undefined),
  };
  const stallion = toStallion(enriched);
  if (!stallion) return null;

  const stallionId = String(row.id);
  const [disciplineFocus, breedingServiceProviders, pedigreeRowsMap, ownersFromDb] =
    await Promise.all([
      fetchDisciplineCoverageForStallion(stallionId, client),
      fetchBreedingServiceProvidersForStallion(stallionId, client),
      fetchStallionPedigreeRowsForStallions([stallionId], client),
      fetchOwnersForStallion(stallionId, client),
    ]);

  const pedigreeRows = pedigreeRowsMap.get(stallionId) ?? [];
  const pedigreeParentNames = mapGenerationOnePedigreeParents(pedigreeRows);
  const pedigree_chart = buildPedigreeChartFromStallionRows(pedigreeRows);

  const owners =
    ownersFromDb && ownersFromDb.length > 0 ? ownersFromDb : stallion.owners ?? [];

  let resolvedBreedingServiceProviders = breedingServiceProviders ?? [];
  if (resolvedBreedingServiceProviders.length === 0) {
    resolvedBreedingServiceProviders = legacyBreedingServiceProvidersFromStallionRow(row);
  }

  const pedigreeParents =
    pedigreeParentNames.sire || pedigreeParentNames.dam
      ? pedigreeParentNames
      : undefined;
  const discipline_focus = disciplineFocus;

  const withRelations = withPedigreeParents(
    {
      ...stallion,
      pedigree_chart,
      owners,
      discipline_focus,
      breeding_service_providers: resolvedBreedingServiceProviders,
    },
    pedigreeParents
  );

  // Published rows' photos live in the public bucket (copied there on
  // publish/edit — see stallion-image-public.server.ts) and can be
  // referenced directly with no signing round trip. Branch on the row's
  // actual publish_status, not the caller's publishedOnly filter — admin
  // edit/preview can still load a published stallion.
  if (row.publish_status === "published" && withRelations.media) {
    const media = withRelations.media;
    const primary_image_url = await resolvePublishedImageUrl(
      media.primary_image_url
    );
    const gallery = media.gallery
      ? await Promise.all(
          media.gallery.map(async (item) => ({
            ...item,
            filename: (await resolvePublishedImageUrl(item.filename)) ?? item.filename,
          }))
        )
      : media.gallery;

    return {
      ...withRelations,
      media: { ...media, primary_image_url, gallery },
    };
  }

  return attachSignedStallionMediaUrls(withRelations);
}

// --- queries.ts ---

export type FetchStallionsPageParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  country?: string;
  breed?: StallionBreed | "All";
  availability?: SemenAvailability | "All";
  color?: string;
  geneticProfile?: string;
  discipline?: string;
  /** Ancestor conditions, ANDed together: a horse must satisfy every one. */
  bloodlines?: BloodlineCondition[];
  /** Defaults to "stallion" so every existing caller keeps mares out of stallion results. */
  horseType?: HorseType;
  /** Mare directory: filter on mare_et_details.et_status. */
  etStatus?: string;
  /** Mare directory: filter on mare_et_details.embryo_availability (Fresh/Frozen/Both). */
  embryoAvailability?: string;
};

export type FetchStallionsPageResult = {
  rows: Stallion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function requestSignedStallionImageUrl(params: {
  filename: string;
  bucket?: string;
  expiresIn?: number;
}): Promise<string | null> {
  return getStallionImageSignedUrl(params);
}

async function buildDirectoryStallionRows(
  data: Record<string, unknown>[],
  client: SupabaseClient
): Promise<Stallion[]> {
  const rows = data.map((row) =>
    toStallion(row, {
      owners: ((row.stallion_owners as Record<string, unknown>[] | undefined) ?? []).map(
        (link) => {
          const nested = link.owners as
            | Record<string, unknown>
            | Record<string, unknown>[]
            | undefined;
          const ownerRow = Array.isArray(nested) ? (nested[0] ?? {}) : (nested ?? {});
          return {
            ...ownerRow,
            owner_id: link.owner_id,
            public_display_name_only: link.public_display_name_only,
          };
        }
      ),
      performance_records:
        (row.stallion_performance_records as Record<string, unknown>[] | undefined) ?? [],
      notable_progeny:
        (row.stallion_progeny as Record<string, unknown>[] | undefined) ?? [],
      images: (row.stallion_images as Record<string, unknown>[] | undefined) ?? [],
      foal_crops: (row.stallion_foal_crops as Record<string, unknown>[] | undefined) ?? [],
      racing_records:
        (row.stallion_racing_results as Record<string, unknown>[] | undefined) ?? [],
      genetic_tests:
        (row.stallion_genetic_tests as Record<string, unknown>[] | undefined) ?? [],
      colour_tests:
        (row.stallion_colour_tests as Record<string, unknown>[] | undefined) ?? [],
    })
  );
  const stallionIds = rows.map((row) => row.id);
  const [disciplineByStallion, pedigreeParentsByStallion] = await Promise.all([
    fetchDisciplineCoverageForStallions(stallionIds, client),
    fetchPedigreeParentsForStallions(stallionIds, client),
  ]);
  const withParentsAndDisciplines = rows.map((row) => {
    let next = row;
    const disciplineFocus = disciplineByStallion.get(row.id);
    if (disciplineFocus) next = { ...next, discipline_focus: disciplineFocus };
    const parents = pedigreeParentsByStallion.get(row.id);
    if (parents) next = withPedigreeParents(next, parents);
    return next;
  });
  // Directory rows are always published (query below filters
  // publish_status = 'published'). Photos on the managed `stallions/...`
  // path convention are already mirrored to the public bucket — no signing
  // round trip needed. Anything still on a legacy path (pre-migration
  // filenames) falls back to a signed URL, same as before this bucket work.
  return Promise.all(
    withParentsAndDisciplines.map(async (row) => {
      if (!row.media?.primary_image_url) return row;
      const primary_image_url = await resolvePublishedImageUrl(
        row.media.primary_image_url
      );
      return { ...row, media: { ...row.media, primary_image_url } };
    })
  );
}

export async function fetchStallionsPageWithClient(
  client: SupabaseClient,
  params: FetchStallionsPageParams
): Promise<FetchStallionsPageResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const horseType = params.horseType ?? "stallion";

  let query = client
    .from("stallions")
    .select(
      horseType === "mare"
        ? MARE_WITH_RELATIONS_SELECT
        : STALLION_WITH_RELATIONS_SELECT,
      { count: "exact" }
    )
    .eq("horse_type", horseType)
    // Explicit publish filter, not just RLS: an admin's session cookie makes
    // these public queries run as `authenticated`, which can read drafts.
    .eq("publish_status", "published")
    .order("stallion_name");

  if (horseType === "mare") {
    const etStatus = params.etStatus?.trim();
    const embryoAvailability = params.embryoAvailability?.trim();
    if (
      (etStatus && etStatus !== "All") ||
      (embryoAvailability && embryoAvailability !== "All")
    ) {
      let etQuery = client.from("mare_et_details").select("stallion_id");
      if (etStatus && etStatus !== "All") {
        etQuery = etQuery.ilike("et_status", etStatus);
      }
      if (embryoAvailability && embryoAvailability !== "All") {
        // "Both" satisfies either specific filter.
        etQuery =
          embryoAvailability === "Both"
            ? etQuery.ilike("embryo_availability", "Both")
            : etQuery.or(
                `embryo_availability.ilike.${embryoAvailability},embryo_availability.ilike.Both`
              );
      }
      const { data: etRows } = await etQuery;
      const matchingIds = ((etRows ?? []) as { stallion_id: string }[])
        .map((r) => r.stallion_id)
        .filter(Boolean);
      if (matchingIds.length === 0) {
        return { rows: [], total: 0, page, pageSize, totalPages: 1 };
      }
      query = query.in("id", matchingIds);
    }
  }

  const keyword = params.keyword?.trim();
  if (keyword) {
    query = query.ilike("stallion_name", `%${keyword}%`);
  }

  if (params.country && params.country !== "All") {
    query = query.eq("country_of_residence", params.country);
  }

  if (params.breed && params.breed !== "All") {
    query = query.eq("breed", BREED_TO_DB_MAP[params.breed]);
  }

  if (params.availability && params.availability !== "All") {
    if (params.availability === "Method not disclosed") {
      query = query.contains("semen_availability", ["Method not disclosed"]);
    } else if (params.availability === "Fresh") {
      query = query
        .contains("semen_availability", ["Fresh"])
        .not("semen_availability", "cs", "{Chilled}")
        .not("semen_availability", "cs", "{Frozen}");
    } else if (params.availability === "Live Cover") {
      query = query.contains("semen_availability", ["Live Cover"]);
    } else if (params.availability === "ICSI") {
      query = query.contains("semen_availability", ["ICSI"]);
    } else if (params.availability === "Cooled") {
      query = query.contains("semen_availability", ["Cooled"]);
    } else if (params.availability === "Chilled") {
      query = query.contains("semen_availability", ["Chilled"]);
    } else if (params.availability === "Frozen") {
      query = query.contains("semen_availability", ["Frozen"]);
    } else if (params.availability === "Combination") {
      query = query.contains("semen_availability", ["Chilled", "Frozen"]);
    } else {
      return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    }
  }

  if (params.discipline && params.discipline !== "All") {
    const { data: familyRows } = await client
      .from("discipline_families")
      .select("id")
      .ilike("name", params.discipline)
      .limit(1);
    const familyId = (familyRows as { id: string }[] | null)?.[0]?.id;
    if (!familyId) {
      return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    }
    const { data: linkRows } = await client
      .from("stallion_disciplines")
      .select("stallion_id")
      .eq("family_id", familyId);
    const matchingIds = ((linkRows ?? []) as { stallion_id: string }[])
      .map((r) => r.stallion_id)
      .filter(Boolean);
    if (matchingIds.length === 0) {
      return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    }
    query = query.in("id", matchingIds);
  }

  if (params.color && params.color !== "All") {
    // Canonical colour filters also match legacy stored spellings
    // (e.g. "Sorrel/Chestnut" finds rows stored as "Chestnut" or "Chestnut / Sorrel").
    const variants = coatColourFilterVariants(params.color);
    query = query.or(
      variants.map((v) => `coat_colour.ilike."${v}"`).join(",")
    );
  }

  if (params.geneticProfile && params.geneticProfile !== "All") {
    const spaceIdx = params.geneticProfile.indexOf(" ");
    const testType = spaceIdx > -1 ? params.geneticProfile.slice(0, spaceIdx) : params.geneticProfile;
    const result = spaceIdx > -1 ? params.geneticProfile.slice(spaceIdx + 1) : "";
    const { data: testRows } = await client
      .from("stallion_genetic_tests")
      .select("stallion_id")
      .eq("test_type", testType)
      .eq("result", result);
    const matchingIds = ((testRows ?? []) as { stallion_id: string }[])
      .map((r) => r.stallion_id)
      .filter(Boolean);
    if (matchingIds.length === 0) {
      return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    }
    query = query.in("id", matchingIds);
  }

  // Horse Search conditions. Every include must hold and no exclude may hold,
  // so each condition is resolved on its own and combined here. Matched
  // ancestors are kept for the result card badge.
  const bloodlines = (params.bloodlines ?? []).filter((c) => c.name.trim());
  const matchesByStallionId = new Map<string, DirectoryAncestorMatch[]>();

  if (bloodlines.length > 0) {
    const responses = await Promise.all(
      bloodlines.map((condition) =>
        client.rpc("get_stallion_ancestor_matches", {
          p_ancestor_name: condition.name.trim(),
          // An empty selection means "any generation" to the RPC.
          p_generations: condition.generations.length ? condition.generations : null,
          // Always 'any': the side rules below need to see every side a horse
          // carries the ancestor on, which a server-side branch filter would
          // hide. "Both sides" is undecidable from a pre-filtered result.
          p_branch: "any",
        })
      )
    );

    let included: Set<string> | null = null;
    const excluded = new Set<string>();

    for (let i = 0; i < responses.length; i += 1) {
      const { data: rpcRows, error: rpcError } = responses[i];
      const condition = bloodlines[i];

      if (rpcError) {
        console.error("ancestor match error:", rpcError.message);
        return { rows: [], total: 0, page, pageSize, totalPages: 1 };
      }

      const matches = (rpcRows ?? []) as {
        stallion_id: string;
        ancestor_name: string;
        generation: number;
        branch: string;
      }[];

      // The RPC returns the shallowest qualifying match per (horse, side), so
      // the sides a horse carries the ancestor on are read off directly.
      const sidesByStallion = new Map<string, Set<string>>();
      for (const row of matches) {
        if (!row.stallion_id) continue;
        const branch = row.branch === "dam" ? "dam" : "sire";
        const sides = sidesByStallion.get(row.stallion_id) ?? new Set<string>();
        sides.add(branch);
        sidesByStallion.set(row.stallion_id, sides);
      }

      // No side ticked means either side will do. One ticked narrows to that
      // side. Both ticked is linebreeding: the ancestor must appear on the
      // sire side *and* the dam side, each satisfying the generation filter —
      // the same way the previous single-select Line composed with generations.
      const requiredSides = condition.sides;
      const qualifying = new Set<string>();
      for (const [stallionId, sides] of sidesByStallion) {
        const ok =
          requiredSides.length === 0 ||
          requiredSides.every((side) => sides.has(side));
        if (ok) qualifying.add(stallionId);
      }

      if (condition.match === "exclude") {
        for (const id of qualifying) excluded.add(id);
        continue;
      }

      // Badges describe why a horse is in the results, so only includes
      // contribute; an exclude has no match to show.
      for (const row of matches) {
        if (!qualifying.has(row.stallion_id)) continue;
        const list = matchesByStallionId.get(row.stallion_id) ?? [];
        list.push({
          ancestor_name: row.ancestor_name,
          generation: row.generation,
          branch: row.branch === "dam" ? "dam" : "sire",
        });
        matchesByStallionId.set(row.stallion_id, list);
      }

      if (included === null) {
        included = qualifying;
      } else {
        const kept = new Set<string>();
        for (const id of included) {
          if (qualifying.has(id)) kept.add(id);
        }
        included = kept;
      }
      if (included.size === 0) break;
    }

    if (included !== null) {
      // At least one include ran: narrow to it, minus anything excluded.
      const matchingIds = [...included].filter((id) => !excluded.has(id));
      if (matchingIds.length === 0) {
        return { rows: [], total: 0, page, pageSize, totalPages: 1 };
      }
      query = query.in("id", matchingIds);
    } else if (excluded.size > 0) {
      // Excludes only. The base set is the whole directory, so subtract rather
      // than narrow. Horses with no pedigree data carry none of the excluded
      // ancestors and are therefore kept, which is what "pedigrees contain
      // neither" means.
      query = query.not("id", "in", `(${[...excluded].join(",")})`);
    }
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("fetchStallionsPage error:", error.message);
    return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const rows = await buildDirectoryStallionRows(
    ((data ?? []) as unknown) as Record<string, unknown>[],
    client
  );
  const enrichedRows = rows.map((row) => {
    const matches = matchesByStallionId.get(row.id);
    return matches?.length ? { ...row, directory_ancestor_matches: matches } : row;
  });
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { rows: enrichedRows, total, page, pageSize, totalPages };
}

export async function fetchStallionsPage(
  params: FetchStallionsPageParams
): Promise<FetchStallionsPageResult> {
  return fetchStallionsPageWithClient(supabase, params);
}

export async function fetchStallionsPageServer(
  params: FetchStallionsPageParams
): Promise<FetchStallionsPageResult> {
  const client = await getServerClient();
  return fetchStallionsPageWithClient(client, params);
}

/**
 * Load a stallion by URL segment: UUID → lookup by primary key only; otherwise by slug.
 * Joins still use `id` (UUID) on related tables.
 */
export async function fetchStallionByProfileSegmentWithClient(
  client: SupabaseClient,
  segment: string,
  locale: string = routing.defaultLocale,
  horseType: HorseType | "any" = "stallion",
  /**
   * Public pages must exclude drafts explicitly: an admin's session cookie makes
   * this query run as `authenticated`, which can read drafts through RLS.
   * Admin loaders pass false.
   */
  publishedOnly = true
): Promise<Stallion | null> {
  const key = segment.trim();
  if (!key) return null;

  const select =
    horseType === "mare"
      ? MARE_WITH_RELATIONS_SELECT
      : STALLION_WITH_RELATIONS_SELECT;

  const applyFilters = <T extends { eq: (col: string, val: string) => T }>(
    q: T
  ): T => {
    let next = q;
    if (horseType !== "any") next = next.eq("horse_type", horseType);
    if (publishedOnly) next = next.eq("publish_status", "published");
    return next;
  };

  let row: Record<string, unknown> | null = null;

  if (isUuidString(key)) {
    const query = applyFilters(
      client.from("stallions").select(select).eq("id", key)
    );
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    row = (data as unknown) as Record<string, unknown>;
  } else {
    const slugKey = key.toLowerCase();
    const query = applyFilters(
      client.from("stallions").select(select).eq("slug", slugKey)
    );
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    row = (data as unknown) as Record<string, unknown>;
  }

  const stallion = await enrichStallionRow(row, client);
  if (!stallion) return null;

  if (locale === routing.defaultLocale) {
    return stallion;
  }

  const stallionId = String(row.id ?? "");
  if (!stallionId) return stallion;

  const translation = await fetchPublishedStallionProfileTranslationWithClient(
    client,
    stallionId,
    locale
  );

  if (!translation) {
    return applyLocaleProfileIdentityFallbacks(stallion, locale);
  }

  return applyPublishedProfileTranslation(stallion, translation, locale);
}

export async function fetchStallionByProfileSegment(
  segment: string,
  locale: string = routing.defaultLocale,
  horseType: HorseType | "any" = "stallion"
): Promise<Stallion | null> {
  return fetchStallionByProfileSegmentWithClient(
    supabase,
    segment,
    locale,
    horseType
  );
}

/** @deprecated Prefer fetchStallionByProfileSegment */
export async function fetchStallionById(id: string): Promise<Stallion | null> {
  return fetchStallionByProfileSegment(id);
}

export async function fetchStallionBySlug(slug: string): Promise<Stallion | null> {
  return fetchStallionByProfileSegment(slug);
}

// --- dashboard-stats.ts ---

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseBreakdownRows(value: unknown): AdminDashboardBreakdownRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "Unknown";
      return { label, count: toNumber(r.count) };
    })
    .filter((row): row is AdminDashboardBreakdownRow => row !== null);
}

function parseCountryDisciplineRows(
  value: unknown
): AdminDashboardCountryDisciplineRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      return {
        country: typeof r.country === "string" ? r.country : "Unknown",
        discipline: typeof r.discipline === "string" ? r.discipline : "Unknown",
        count: toNumber(r.count),
      };
    })
    .filter((row): row is AdminDashboardCountryDisciplineRow => row !== null);
}

function parseGeneratedAt(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === "string" && inner.trim()) return inner;
  }
  return new Date().toISOString();
}

function parseAdminDashboardStats(payload: unknown): AdminDashboardStats {
  if (!payload || typeof payload !== "object") {
    throw new Error("admin_dashboard_stats returned invalid payload");
  }

  const p = payload as Record<string, unknown>;
  const totals = (p.totals ?? {}) as Record<string, unknown>;
  const byPublishStatus = (p.byPublishStatus ?? {}) as Record<string, unknown>;
  const review = (p.review ?? {}) as Record<string, unknown>;
  const photos = (p.photos ?? {}) as Record<string, unknown>;
  const geneticTesting = (p.geneticTesting ?? {}) as Record<string, unknown>;

  return {
    totals: { stallions: toNumber(totals.stallions) },
    byPublishStatus: {
      published: toNumber(byPublishStatus.published),
      draft: toNumber(byPublishStatus.draft),
    },
    review: { stallionResearches: toNumber(review.stallionResearches) },
    byCountry: parseBreakdownRows(p.byCountry),
    byDiscipline: parseBreakdownRows(p.byDiscipline),
    countryDiscipline: parseCountryDisciplineRows(p.countryDiscipline),
    photos: {
      withImage: toNumber(photos.withImage),
      withoutImage: toNumber(photos.withoutImage),
    },
    geneticTesting: {
      withResults: toNumber(geneticTesting.withResults),
      withoutResults: toNumber(geneticTesting.withoutResults),
    },
    generatedAt: parseGeneratedAt(p.generatedAt),
  };
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const auth = await requireServerAuth();
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  const { data, error } = await auth.supabase.rpc("admin_dashboard_stats");

  if (error) {
    throw new Error(error.message);
  }

  return parseAdminDashboardStats(data);
}

// --- discipline-families.ts ---

export async function fetchDisciplineFamilies(): Promise<DisciplineFamily[]> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("discipline_families")
    .select("id, name, display_order")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("fetchDisciplineFamilies error:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!id || !name) return null;
      const displayOrder =
        row.display_order == null ? null : Number(row.display_order);
      return {
        id,
        name,
        displayOrder: Number.isFinite(displayOrder) ? displayOrder : null,
      } satisfies DisciplineFamily;
    })
    .filter((row): row is DisciplineFamily => row !== null);
}

// --- stallions-list.ts ---

export type AdminStallionsListParams = {
  q?: string;
  status?: AdminStallionsStatusFilter;
  horseType?: AdminStallionsTypeFilter;
  page?: number;
  pageSize?: number;
};

export type AdminStallionsListResult = {
  rows: AdminStallionListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 10;

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function parsePublishStatus(value: unknown): AdminStallionPublishStatus | null {
  if (value === "published" || value === "draft") return value;
  return null;
}

function mapRow(row: Record<string, unknown>): AdminStallionListRow | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const stallionName =
    typeof row.stallion_name === "string" ? row.stallion_name.trim() : "";
  const publishStatus = parsePublishStatus(row.publish_status);

  if (!id || !stallionName || !publishStatus) return null;

  const slug =
    typeof row.slug === "string" && row.slug.trim() ? row.slug.trim() : null;
  const updatedAt =
    typeof row.updated_at === "string" ? row.updated_at : null;

  return {
    id,
    stallionName,
    slug,
    publishStatus,
    horseType: row.horse_type === "mare" ? "mare" : "stallion",
    updatedAt,
    agentNeedsReview: row.needs_review === true,
  };
}

export async function fetchAdminStallionsList(
  params: AdminStallionsListParams = {}
): Promise<AdminStallionsListResult> {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";

  const auth = await requireServerAuth();
  if (!auth.ok) {
    throw new Error(auth.error);
  }

  const empty: AdminStallionsListResult = {
    rows: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  };

  const supabase = auth.supabase;

  // `needs_review` is Milestone 17 schema. It is selected separately from the
  // rest so that a database which has not had the migration applied yet still
  // renders the listing: without this, deploying the code ahead of the
  // migration turns every admin's stallion list into a 42703 error page. The
  // fallback drops only the agent review badge.
  const BASE_COLUMNS = "id, stallion_name, slug, publish_status, horse_type, updated_at";
  const AGENT_COLUMN = "needs_review";

  // Assignment scoping is resolved once and reused, so the fallback retry below
  // does not repeat the horse_assignments round trip.
  let assignedIds: string[] | null = null;
  if (auth.role !== "owner") {
    const { data: assignedRows } = await supabase
      .from("horse_assignments")
      .select("stallion_id")
      .eq("user_id", auth.user.id);
    assignedIds = (assignedRows ?? [])
      .map((row) => {
        const id = (row as { stallion_id?: string }).stallion_id;
        return typeof id === "string" ? id : "";
      })
      .filter(Boolean);

    if (auth.role === "admin" && assignedIds.length === 0) return empty;
  }

  const horseType = params.horseType ?? "all";

  const buildQuery = (columns: string) => {
    let next = supabase
      .from("stallions")
      .select(columns, { count: "exact" })
      .order("stallion_name", { ascending: true })
      .order("id", { ascending: true });

    if (assignedIds !== null) {
      if (auth.role === "admin") {
        next = next.in("id", assignedIds);
      } else if (assignedIds.length === 0) {
        next = next.eq("publish_status", "draft");
      } else {
        next = next.or(
          `publish_status.eq.draft,id.in.(${assignedIds.join(",")})`
        );
      }
    }

    if (q) {
      next = next.ilike("stallion_name", `%${escapeIlikePattern(q)}%`);
    }

    if (status === "published") {
      next = next.eq("publish_status", "published");
    } else if (status === "draft") {
      next = next.eq("publish_status", "draft");
    }

    if (horseType === "stallion" || horseType === "mare") {
      next = next.eq("horse_type", horseType);
    }

    return next.range(from, to);
  };

  let { data, count, error } = await buildQuery(
    `${BASE_COLUMNS}, ${AGENT_COLUMN}`
  );

  // 42703 is "column does not exist" — the migration has not been applied to
  // this database yet. Retry without the agent column so the listing still
  // renders; the only thing lost is the review badge.
  if (error && (error as { code?: string }).code === "42703") {
    ({ data, count, error } = await buildQuery(BASE_COLUMNS));
  }

  if (error) {
    throw new Error(error.message);
  }

  // The select column list is built at runtime, so supabase-js cannot infer a
  // row type for it and falls back to its error-shaped generic.
  const rows = ((data ?? []) as unknown as Record<string, unknown>[])
    .map(mapRow)
    .filter((row): row is AdminStallionListRow => row !== null);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// --- fetch-stallion-for-edit.ts ---

export type FetchStallionForAdminEditResult =
  | {
      ok: true;
      stallion: Stallion;
      publishStatus: AdminStallionPublishStatus;
      updatedAt: string | null;
    }
  | { ok: false; reason: "invalid_id" | "not_found" | "not_authenticated" };

/** Load a stallion by UUID for the admin edit wizard (server-side, authenticated). */
export async function fetchStallionForAdminEdit(
  id: string
): Promise<FetchStallionForAdminEditResult> {
  const key = id.trim();
  if (!key || !isUuidString(key)) {
    return { ok: false, reason: "invalid_id" };
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data: row, error } = await supabase
    .from("stallions")
    .select("id, publish_status, updated_at")
    .eq("id", key)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "not_found" };
  }

  const publishStatus = parsePublishStatus(row.publish_status);
  if (!publishStatus) {
    return { ok: false, reason: "not_found" };
  }

  const stallion = await fetchStallionByProfileSegmentWithClient(
    supabase,
    key,
    routing.defaultLocale,
    "any",
    false // admin media view must load drafts too
  );
  if (!stallion) {
    return { ok: false, reason: "not_found" };
  }

  const updatedAt =
    typeof row.updated_at === "string" ? row.updated_at : null;

  return { ok: true, stallion, publishStatus, updatedAt };
}

// --- fetch-stallion-form-defaults.ts ---

function formStr(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function mapPerformanceRow(row: Record<string, unknown>): FormPerformanceRow {
  return {
    id: formStr(row.id),
    year: row.year != null ? formStr(row.year) : "",
    month: typeof row.month === "string" ? row.month : "",
    association: typeof row.association === "string" ? row.association : "",
    event: typeof row.event === "string" ? row.event : "",
    class: typeof row.class === "string" ? row.class : "",
    discipline: typeof row.discipline === "string" ? row.discipline : "",
    achievement: typeof row.achievement === "string" ? row.achievement : "",
    level: typeof row.level === "string" ? row.level : "",
    score: row.score != null ? formStr(row.score) : "",
    earnings: row.earnings != null ? formStr(row.earnings) : "",
    currency: typeof row.currency === "string" ? row.currency : "",
    starts: row.starts != null ? formStr(row.starts) : "",
    firsts: row.firsts != null ? formStr(row.firsts) : "",
    seconds: row.seconds != null ? formStr(row.seconds) : "",
    thirds: row.thirds != null ? formStr(row.thirds) : "",
    highest_rating: row.highest_rating != null ? formStr(row.highest_rating) : "",
    performance_summary:
      typeof row.performance_summary === "string" ? row.performance_summary : "",
    judges: typeof row.judges === "string" ? row.judges : "",
    comments: typeof row.comments === "string" ? row.comments : "",
    reference: typeof row.reference === "string" ? row.reference : "",
  };
}

function mapRacingRow(row: Record<string, unknown>): FormRacingRow {
  const raceDate =
    typeof row.race_date === "string" ? row.race_date.slice(0, 10) : "";
  return {
    id: formStr(row.id),
    race_name: typeof row.race_name === "string" ? row.race_name : "",
    race_date: raceDate,
    year: row.year != null ? formStr(row.year) : "",
    track: typeof row.track === "string" ? row.track : "",
    distance: typeof row.distance === "string" ? row.distance : "",
    finish_position:
      row.finish_position != null ? formStr(row.finish_position) : "",
    speed_index: row.speed_index != null ? formStr(row.speed_index) : "",
    earnings: row.earnings != null ? formStr(row.earnings) : "",
    currency: typeof row.currency === "string" ? row.currency : "",
    race_number: row.race_number != null ? formStr(row.race_number) : "",
    result_note: typeof row.result_note === "string" ? row.result_note : "",
    chart_url: typeof row.chart_url === "string" ? row.chart_url : "",
    video_url: typeof row.video_url === "string" ? row.video_url : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
  };
}

function mapProgenyRow(row: Record<string, unknown>): FormProgenyRow {
  return {
    id: formStr(row.id),
    progeny_name: typeof row.progeny_name === "string" ? row.progeny_name : "",
    year: row.year != null ? formStr(row.year) : "",
    association: typeof row.association === "string" ? row.association : "",
    event: typeof row.event === "string" ? row.event : "",
    discipline: typeof row.discipline === "string" ? row.discipline : "",
    achievement: typeof row.achievement === "string" ? row.achievement : "",
    total_earnings:
      row.total_earnings != null ? formStr(row.total_earnings) : "",
  };
}

function mapFoalCropRow(row: Record<string, unknown>): FormFoalCropRow {
  return {
    id: formStr(row.id),
    foal_crop_year:
      row.foal_crop_year != null ? formStr(row.foal_crop_year) : "",
    number_of_foals:
      row.number_of_foals != null ? formStr(row.number_of_foals) : "",
  };
}

function mapRacingSummaryRow(
  row: Record<string, unknown> | null | undefined
): FormRacingSummary {
  const base = createEmptyStallionFormState().racing_summary;
  if (!row) return base;
  return {
    career_starts:
      row.career_starts != null ? formStr(row.career_starts) : "",
    career_firsts:
      row.career_firsts != null ? formStr(row.career_firsts) : "",
    career_seconds:
      row.career_seconds != null ? formStr(row.career_seconds) : "",
    career_thirds:
      row.career_thirds != null ? formStr(row.career_thirds) : "",
    career_earnings:
      row.career_earnings != null ? formStr(row.career_earnings) : "",
    career_earnings_currency:
      typeof row.career_earnings_currency === "string"
        ? row.career_earnings_currency
        : base.career_earnings_currency,
    highest_rating:
      row.highest_rating != null ? formStr(row.highest_rating) : "",
    source: typeof row.source === "string" ? row.source : "",
    earnings_per_start:
      row.earnings_per_start != null ? formStr(row.earnings_per_start) : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
  };
}

export type FetchStallionFormDefaultsResult =
  | { ok: true; defaultValues: StallionFormValues; publishStatus: AdminStallionPublishStatus }
  | { ok: false; reason: "invalid_id" | "not_found" | "not_authenticated" };

export async function fetchStallionFormDefaultsForEdit(
  id: string
): Promise<FetchStallionFormDefaultsResult> {
  const key = id.trim();
  if (!key || !isUuidString(key)) {
    return { ok: false, reason: "invalid_id" };
  }

  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data: stallionRow, error: stallionError } = await client
    .from("stallions")
    .select("*")
    .eq("id", key)
    .maybeSingle();

  if (stallionError || !stallionRow) {
    return { ok: false, reason: "not_found" };
  }

  const publishStatus = parsePublishStatus(stallionRow.publish_status);
  if (!publishStatus) {
    return { ok: false, reason: "not_found" };
  }

  const source = stallionRow as Record<string, unknown>;

  const [
    disciplinesRes,
    performanceRes,
    racingRes,
    racingSummaryRes,
    progenyRes,
    foalCropsRes,
    providersRes,
    geneticRes,
    colourRes,
    imagesRes,
    etDetailsRes,
  ] = await Promise.all([
    client.from("stallion_disciplines").select("family_id").eq("stallion_id", key),
    client
      .from("stallion_performance_records")
      .select(
        // `score` was absent here as well as in the create/update path, so it
        // never loaded into the edit form even though the column existed.
        "id, achievement, year, month, discipline, class, level, association, event, " +
          "score, earnings, currency, starts, firsts, seconds, thirds, highest_rating, " +
          "performance_summary, judges, comments, reference"
      )
      .eq("stallion_id", key)
      .order("year", { ascending: false }),
    client
      .from("stallion_racing_results")
      .select(
        "id, race_name, race_date, year, track, race_number, distance, finish_position, " +
          "speed_index, earnings, currency, result_note, chart_url, video_url, admin_notes"
      )
      .eq("stallion_id", key)
      .order("year", { ascending: false }),
    client
      .from("stallion_racing_summary")
      .select("*")
      .eq("stallion_id", key)
      .maybeSingle(),
    client
      .from("stallion_progeny")
      // association/event exist on the table and in FormProgenyRow but were
      // never selected, so they always loaded blank.
      .select(
        "id, progeny_name, year, discipline, achievement, total_earnings, association, event"
      )
      .eq("stallion_id", key)
      .order("year", { ascending: false }),
    client
      .from("stallion_foal_crops")
      .select("id, foal_crop_year, number_of_foals")
      .eq("stallion_id", key)
      .order("foal_crop_year", { ascending: false }),
    client
      .from("stallion_breeding_service_providers")
      .select(BREEDING_SERVICE_PROVIDER_SELECT)
      .eq("stallion_id", key)
      .order("sort_order", { ascending: true }),
    client
      .from("stallion_genetic_tests")
      .select("id, test_type, gene_code, result, source, admin_notes")
      .eq("stallion_id", key),
    client
      .from("stallion_colour_tests")
      .select("id, colour_test, gene_code, result, source, admin_notes")
      .eq("stallion_id", key),
    client
      .from("stallion_images")
      .select("filename, kind, position")
      .eq("stallion_id", key)
      .order("position", { ascending: true }),
    client
      .from("mare_et_details")
      .select("*")
      .eq("stallion_id", key)
      .maybeSingle(),
  ]);

  const family_ids = (disciplinesRes.data ?? [])
    .map((row) =>
      typeof row.family_id === "string" ? row.family_id.trim() : ""
    )
    .filter(Boolean);

  const semenRaw = parseSemenAvailabilityValues(source.semen_availability);
  const semen_availability = semenRaw.filter(isSemenAvailabilityOptionType);

  const stud_fees: FormStudFeeRow[] = Array.isArray(source.stud_fees)
    ? source.stud_fees.map((fee, index) => {
        const obj =
          fee && typeof fee === "object"
            ? (fee as Record<string, unknown>)
            : {};
        return {
          tempId: `stud-fee-${index}`,
          value: obj.value != null ? formStr(obj.value) : "",
          currency:
            typeof obj.currency === "string"
              ? formatStudFeeCurrencyLabel(obj.currency)
              : "",
        };
      })
    : [];

  const breeding_service_providers: FormBreedingProviderRow[] = (
    providersRes.data ?? []
  ).map((row) => {
    const r = row as Record<string, unknown>;
    return mapBreedingProviderFormRow(r);
  });

  const genetic_tests: FormGeneticTestRow[] = (geneticRes.data ?? []).map(
    (row) => mapGeneticTestFormRow(row as Record<string, unknown>)
  );

  const colour_tests: FormColourTestRow[] = (colourRes.data ?? []).map(
    (row) => mapColourTestFormRow(row as Record<string, unknown>)
  );

  const imageMedia = mapImages((imagesRes.data ?? []) as Record<string, unknown>[]);
  const gallery: FormGalleryItem[] = (imageMedia.gallery ?? []).map(
    (item, index) => ({
      tempId: `gallery-${index}`,
      url: item.filename,
    })
  );

  const breedRaw = typeof source.breed === "string" ? source.breed : "";
  const breedingGuaranteesRaw =
    typeof source.breeding_guarantees === "string"
      ? source.breeding_guarantees
      : "";
  const breeding_guarantees =
    breedingGuaranteesRaw === "LFG" ||
    breedingGuaranteesRaw === "Colour" ||
    breedingGuaranteesRaw === "None"
      ? breedingGuaranteesRaw
      : ("" as const);

  const etRow = (etDetailsRes.data ?? null) as Record<string, unknown> | null;
  const et_details: FormMareEtDetails = {
    et_status: formStr(etRow?.et_status),
    clinic_name: formStr(etRow?.clinic_name),
    clinic_location: formStr(etRow?.clinic_location),
    flush_history: formStr(etRow?.flush_history),
    embryo_fee: etRow?.embryo_fee != null ? formStr(etRow.embryo_fee) : "",
    embryo_fee_currency: formStr(etRow?.embryo_fee_currency),
    embryo_availability: formStr(etRow?.embryo_availability),
    last_verified_at: formStr(etRow?.last_verified_at),
    international_availability: etRow?.international_availability === true,
    admin_notes: formStr(etRow?.admin_notes),
  };

  const defaultValues: StallionFormValues = {
    ...createEmptyStallionFormState(),
    id: key,
    publish_status: publishStatus,
    horse_type: source.horse_type === "mare" ? "mare" : "stallion",
    et_details,
    stallion_name: formStr(source.stallion_name),
    stallion_status:
      typeof source.stallion_status === "string" ? source.stallion_status : "",
    breed: isBreedType(breedRaw) ? breedRaw : "",
    country_of_residence:
      typeof source.country_of_residence === "string"
        ? source.country_of_residence
        : "",
    year_of_birth: (() => {
      const year = deriveYearOfBirth(source.date_of_birth);
      return year != null ? String(year) : "";
    })(),
    coat_colour:
      typeof source.coat_colour === "string" ? source.coat_colour : "",
    coat_pattern:
      typeof source.coat_pattern === "string" ? source.coat_pattern : "",
    country_of_registration:
      typeof source.country_of_registration === "string"
        ? source.country_of_registration
        : "",
    height: typeof source.height === "string" ? source.height : "",
    summary: typeof source.summary === "string" ? source.summary : "",
    family_ids,
    registration_number:
      typeof source.registration_number === "string"
        ? source.registration_number
        : "",
    registry: typeof source.registry === "string" ? source.registry : "",
    official_registry_link:
      typeof source.official_registry_link === "string"
        ? source.official_registry_link
        : "",
    total_reported_earnings:
      source.total_reported_earnings != null
        ? formStr(source.total_reported_earnings)
        : "",
    total_reported_earnings_currency:
      typeof source.total_reported_earnings_currency === "string"
        ? source.total_reported_earnings_currency
        : createEmptyStallionFormState().total_reported_earnings_currency,
    performance_summary:
      typeof source.performance_summary === "string"
        ? source.performance_summary
        : "",
    performance_records: (
      (performanceRes.data ?? []) as unknown as Record<string, unknown>[]
    ).map((row) => mapPerformanceRow(row)),
    racing_records: (
      (racingRes.data ?? []) as unknown as Record<string, unknown>[]
    ).map((row) => mapRacingRow(row)),
    racing_summary: mapRacingSummaryRow(
      racingSummaryRes.data as unknown as Record<string, unknown> | null
    ),
    notable_progeny: (
      (progenyRes.data ?? []) as unknown as Record<string, unknown>[]
    ).map((row) => mapProgenyRow(row)),
    foal_crops: (
      (foalCropsRes.data ?? []) as unknown as Record<string, unknown>[]
    ).map((row) => mapFoalCropRow(row)),
    total_registered_progeny:
      source.total_registered_progeny != null
        ? formStr(source.total_registered_progeny)
        : "",
    progeny_started_in_competition:
      source.progeny_started_in_competition != null
        ? formStr(source.progeny_started_in_competition)
        : "",
    performance_earners:
      source.performance_earners != null
        ? formStr(source.performance_earners)
        : "",
    total_reported_offspring_earnings:
      source.total_reported_offspring_earnings != null
        ? formStr(source.total_reported_offspring_earnings)
        : "",
    total_reported_offspring_earnings_currency:
      typeof source.total_reported_offspring_earnings_currency === "string"
        ? source.total_reported_offspring_earnings_currency
        : createEmptyStallionFormState()
            .total_reported_offspring_earnings_currency,
    semen_availability,
    live_cover_available: Boolean(source.live_cover_available),
    country_availability:
      parseCountryAvailability(source.country_availability) ?? [],
    stud_fees,
    breeding_guarantees,
    breeding_manager:
      typeof source.breeding_manager === "string" ? source.breeding_manager : "",
    breeding_manager_organization:
      typeof source.breeding_manager_organization === "string"
        ? source.breeding_manager_organization
        : "",
    breeding_manager_email:
      typeof source.breeding_manager_email === "string"
        ? source.breeding_manager_email
        : "",
    breeding_manager_phone:
      typeof source.breeding_manager_phone === "string"
        ? source.breeding_manager_phone
        : "",
    breeding_notes:
      typeof source.breeding_notes === "string" ? source.breeding_notes : "",
    breeding_service_providers,
    genetic_disease_testing_results:
      typeof source.genetic_disease_testing_results === "string"
        ? source.genetic_disease_testing_results
        : "",
    genetic_testing_results:
      typeof source.genetic_testing_results === "string"
        ? source.genetic_testing_results
        : "",
    colour_testing_results:
      typeof source.colour_testing_results === "string"
        ? source.colour_testing_results
        : "",
    genetic_test_results_summary:
      typeof source.genetic_test_results_summary === "string"
        ? source.genetic_test_results_summary
        : "",
    genetic_tests,
    colour_tests,
    primary_image_url: imageMedia.primary_image_url ?? "",
    gallery,
    video_url: typeof source.video_url === "string" ? source.video_url : "",
    owner_links: [],
  };

  return { ok: true, defaultValues, publishStatus };
}
