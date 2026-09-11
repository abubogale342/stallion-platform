import { supabase } from "@/services/supabase";
import { directoryLogoPublicUrl } from "@/utils/directory";

export type CommercialDirectoryEntry = {
  id: string;
  country: string;
  name: string;
  focus?: string;
  /** Resolved public URL, or null when no logo has been uploaded yet. */
  logoUrl: string | null;
  website?: string;
  notes?: string;
  isActive: boolean;
};

export type AssociationRegistryEntry = {
  id: string;
  country: string;
  name: string;
  breedFocus?: string;
  /** Resolved public URL, or null when no logo has been uploaded yet. */
  logoUrl: string | null;
  website?: string;
  notes?: string;
  isActive: boolean;
};

export type FetchDirectoryPageResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Distinct values backing a directory's Country and Breed dropdowns.
 *
 * `facets` is the third dropdown's option list. It reads a different column per
 * directory — `breed_focus` for associations, `focus` for the commercial
 * directory — so the shape stays column-agnostic.
 */
export type DirectoryFilterOptions = {
  countries: string[];
  facets: string[];
};

/** Filter values for a public directory. "All" clears one. */
export type DirectoryFilters = {
  search?: string;
  country?: string;
  facet?: string;
};

/**
 * De-duplicate and sort a column's values for a filter dropdown.
 *
 * PostgREST has no DISTINCT, so callers read the column across active rows and
 * collapse it here. That is fine at these tables' size (reference directories,
 * tens of rows); if either grows into the thousands this should become a view
 * or an RPC.
 */
function collectDistinct(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v)),
  ].sort((a, b) => a.localeCompare(b));
}

/**
 * Apply a directory's search filter to a query.
 *
 * Escapes PostgREST's pattern metacharacters so a name containing % or _
 * matches literally rather than acting as a wildcard.
 */
function applySearch<T>(query: T, search: string | undefined): T {
  const trimmed = search?.trim();
  if (!trimmed) return query;
  const escaped = trimmed.replace(/[%_]/g, (ch) => `\\${ch}`);
  return (query as { ilike: (c: string, p: string) => T }).ilike(
    "name",
    `%${escaped}%`
  );
}

/** Distinct Country / Focus options for the commercial directory filter panel. */
export async function fetchResourcesFilterOptions(): Promise<DirectoryFilterOptions> {
  const { data, error } = await supabase
    .from("resources_directory")
    .select("country, focus")
    .eq("is_active", true);

  if (error) {
    console.error("fetchResourcesFilterOptions error:", error.message);
    return { countries: [], facets: [] };
  }

  const rows = (data ?? []) as { country: string | null; focus: string | null }[];
  return {
    countries: collectDistinct(rows.map((r) => r.country)),
    facets: collectDistinct(rows.map((r) => r.focus)),
  };
}

export async function fetchResourcesDirectoryPage(params?: {
  page?: number;
  pageSize?: number;
  filters?: DirectoryFilters;
}): Promise<FetchDirectoryPageResult<CommercialDirectoryEntry>> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("resources_directory")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  query = applySearch(query, params?.filters?.search);

  const country = params?.filters?.country?.trim();
  if (country && country !== "All") {
    query = query.eq("country", country);
  }

  const facet = params?.filters?.facet?.trim();
  if (facet && facet !== "All") {
    query = query.eq("focus", facet);
  }

  const { data, count, error } = await query
    .order("country")
    .order("name")
    .range(from, to);

  if (error) {
    console.error("fetchResourcesDirectoryPage error:", error.message);
    return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    country: (row.country as string) ?? "",
    name: (row.name as string) ?? "",
    focus: row.focus as string | undefined,
    logoUrl: directoryLogoPublicUrl(row.logo_path as string | null),
    website: row.website as string | undefined,
    notes: row.notes as string | undefined,
    isActive: Boolean(row.is_active),
  }));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { rows, total, page, pageSize, totalPages };
}

/** Distinct Country / Breed options for the associations filter panel. */
export async function fetchAssociationFilterOptions(): Promise<DirectoryFilterOptions> {
  const { data, error } = await supabase
    .from("associations_registries")
    .select("country, breed_focus")
    .eq("is_active", true);

  if (error) {
    console.error("fetchAssociationFilterOptions error:", error.message);
    return { countries: [], facets: [] };
  }

  const rows = (data ?? []) as {
    country: string | null;
    breed_focus: string | null;
  }[];
  return {
    countries: collectDistinct(rows.map((r) => r.country)),
    facets: collectDistinct(rows.map((r) => r.breed_focus)),
  };
}

export async function fetchAssociationsRegistriesPage(params?: {
  page?: number;
  pageSize?: number;
  filters?: DirectoryFilters;
}): Promise<FetchDirectoryPageResult<AssociationRegistryEntry>> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("associations_registries")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  query = applySearch(query, params?.filters?.search);

  const country = params?.filters?.country?.trim();
  if (country && country !== "All") {
    query = query.eq("country", country);
  }

  const facet = params?.filters?.facet?.trim();
  if (facet && facet !== "All") {
    query = query.eq("breed_focus", facet);
  }

  const { data, count, error } = await query
    .order("country")
    .order("name")
    .range(from, to);

  if (error) {
    console.error("fetchAssociationsRegistriesPage error:", error.message);
    return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    country: (row.country as string) ?? "",
    name: (row.name as string) ?? "",
    breedFocus: row.breed_focus as string | undefined,
    logoUrl: directoryLogoPublicUrl(row.logo_path as string | null),
    website: row.website as string | undefined,
    notes: row.notes as string | undefined,
    isActive: Boolean(row.is_active),
  }));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { rows, total, page, pageSize, totalPages };
}
