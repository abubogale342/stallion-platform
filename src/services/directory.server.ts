import "server-only";
import { createServerClient } from "@/services/supabase.server";
import { DIRECTORY_LABELS, type DirectoryKind } from "@/types/directory";

export type { DirectoryKind };
export { DIRECTORY_KINDS, isDirectoryKind } from "@/types/directory";

type DirectoryConfig = {
  table: "resources_directory" | "associations_registries";
  /** Free-text focus column. Named differently on each table. */
  focusColumn: "focus" | "breed_focus";
  label: string;
  focusLabel: string;
  publicPath: string;
  singular: string;
};

export const DIRECTORY_CONFIG: Record<DirectoryKind, DirectoryConfig> = {
  commercial: {
    table: "resources_directory",
    focusColumn: "focus",
    ...DIRECTORY_LABELS.commercial,
  },
  associations: {
    table: "associations_registries",
    focusColumn: "breed_focus",
    ...DIRECTORY_LABELS.associations,
  },
};

export type DirectoryStatusFilter = "all" | "active" | "inactive";

export type DirectoryAdminRow = {
  id: string;
  name: string;
  country: string;
  focus: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  /** Raw storage path, as stored. The console resolves it for preview. */
  logoPath: string | null;
  updatedAt: string | null;
  /**
   * Stallion rows pointing at this entry. Both foreign keys are
   * ON DELETE SET NULL, so a delete silently unlinks them rather than failing —
   * the delete confirmation surfaces this count instead.
   */
  linkedStallions: number;
};

export type FetchDirectoryAdminPageResult = {
  rows: DirectoryAdminRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};

/**
 * Count stallion references to the given commercial-directory rows.
 *
 * Two tables can point at `resources_directory`: the legacy
 * `stallions.breeding_service_provider` column and the newer
 * `stallion_breeding_service_providers` link table. Both are counted.
 * Associations have no such references, so this is skipped for them.
 */
async function countLinkedStallions(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ids: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;

  const bump = (value: unknown) => {
    if (typeof value !== "string") return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  };

  const [legacy, linkTable] = await Promise.all([
    supabase
      .from("stallions")
      .select("breeding_service_provider")
      .in("breeding_service_provider", ids),
    supabase
      .from("stallion_breeding_service_providers")
      .select("breeding_service_provider")
      .in("breeding_service_provider", ids),
  ]);

  for (const result of [legacy, linkTable]) {
    if (result.error) continue;
    for (const row of (result.data ?? []) as Record<string, unknown>[]) {
      bump(row.breeding_service_provider);
    }
  }
  return counts;
}

/**
 * One page of directory rows for the admin console.
 *
 * Unlike the public fetchers in `directory.ts`, this returns inactive rows too —
 * deactivating is the primary way staff retire an entry, so those rows have to
 * stay reachable.
 */
export async function fetchDirectoryAdminPage(params: {
  kind: DirectoryKind;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DirectoryStatusFilter;
}): Promise<FetchDirectoryAdminPageResult> {
  const config = DIRECTORY_CONFIG[params.kind];
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerClient();

  // Selected with `*` rather than an aliased column list: the table name is
  // dynamic, and a template-literal select defeats the generated types. The
  // per-table focus column is normalised in the mapping below instead.
  let query = supabase.from(config.table).select("*", { count: "exact" });

  const search = params.search?.trim();
  if (search) {
    // Escape PostgREST pattern metacharacters so a name containing % or _
    // matches literally rather than acting as a wildcard.
    const escaped = search.replace(/[%_]/g, (ch) => `\\${ch}`);
    query = query.or(`name.ilike.%${escaped}%,country.ilike.%${escaped}%`);
  }

  if (params.status === "active") query = query.eq("is_active", true);
  if (params.status === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query
    .order("country")
    .order("name")
    .range(from, to);

  if (error) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
      error: error.message,
    };
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const ids = raw.map((row) => String(row.id));
  const linked =
    params.kind === "commercial"
      ? await countLinkedStallions(supabase, ids)
      : new Map<string, number>();

  const rows: DirectoryAdminRow[] = raw.map((row) => {
    const id = String(row.id);
    return {
      id,
      name: (row.name as string) ?? "",
      country: (row.country as string) ?? "",
      focus: (row[config.focusColumn] as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      isActive: Boolean(row.is_active),
      logoPath: (row.logo_path as string | null) ?? null,
      updatedAt: (row.updated_at as string | null) ?? null,
      linkedStallions: linked.get(id) ?? 0,
    };
  });

  const total = count ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    error: null,
  };
}
