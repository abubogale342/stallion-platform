import { createClient } from "@/services/supabase";
import { STALLION_PEDIGREE_ADMIN_SELECT } from "@/services/stallion";
import type {
  FormPedigreeRegistrationRow,
  FormPedigreeRow,
} from "@/types/stallion-form";
import type {
  PedigreeRecordOption,
  PedigreeRegistrationOption,
} from "@/types/pedigree";
import type { PedigreeType } from "@/utils/common";
import {
  ensureSinglePrimaryRegistration,
  mapStallionPedigreeRowsToFormRows,
  registrationRowHasContent,
} from "@/utils/pedigree";

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

type PedigreeBaseRow = {
  id: string;
  name: string;
  type: string;
  birth_year: number | null;
  height: string | null;
};

async function fetchRegistrationsByPedigreeIds(
  pedigreeIds: string[]
): Promise<Map<string, PedigreeRegistrationOption[]>> {
  const map = new Map<string, PedigreeRegistrationOption[]>();
  if (pedigreeIds.length === 0) return map;

  const client = createClient();
  const { data, error } = await client
    .from("pedigree_registrations")
    .select(
      "id, pedigree_id, association_name, country, registration_number, is_primary, sort_order"
    )
    .in("pedigree_id", pedigreeIds)
    .order("sort_order", { ascending: true });

  if (error || !data) return map;

  for (const row of data) {
    const list = map.get(row.pedigree_id) ?? [];
    list.push({
      id: row.id,
      association_name: row.association_name,
      country: row.country,
      registration_number: row.registration_number,
      is_primary: row.is_primary,
      sort_order: row.sort_order,
    });
    map.set(row.pedigree_id, list);
  }

  return map;
}

function mapPedigreeBase(
  row: PedigreeBaseRow,
  registrations: PedigreeRegistrationOption[]
): PedigreeRecordOption {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PedigreeType,
    birth_year: row.birth_year,
    height: row.height,
    registrations,
  };
}

async function attachRegistrations(
  rows: PedigreeBaseRow[]
): Promise<PedigreeRecordOption[]> {
  const ids = rows.map((r) => r.id);
  const regMap = await fetchRegistrationsByPedigreeIds(ids);
  return rows.map((row) =>
    mapPedigreeBase(row, regMap.get(row.id) ?? [])
  );
}

function dedupeById(records: PedigreeRecordOption[]): PedigreeRecordOption[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export async function searchPedigrees(params: {
  query: string;
  type?: PedigreeType;
}): Promise<
  { ok: true; results: PedigreeRecordOption[] } | { ok: false; error: string }
> {
  const q = params.query.trim();
  if (!q) {
    return { ok: true, results: [] };
  }

  const client = createClient();
  const pattern = `%${escapeIlikePattern(q)}%`;
  const baseRows = new Map<string, PedigreeBaseRow>();

  let nameQuery = client
    .from("pedigrees")
    .select("id, name, type, birth_year, height")
    .ilike("name", pattern)
    .limit(20);

  if (params.type) {
    nameQuery = nameQuery.eq("type", params.type);
  }

  const { data: nameMatches, error: nameError } = await nameQuery;
  if (nameError) {
    return { ok: false, error: nameError.message };
  }
  for (const row of nameMatches ?? []) {
    baseRows.set(row.id, row as PedigreeBaseRow);
  }

  const { data: regMatches, error: regError } = await client
    .from("pedigree_registrations")
    .select("pedigree_id")
    .ilike("registration_number", pattern)
    .limit(40);

  if (regError) {
    return { ok: false, error: regError.message };
  }

  const regPedigreeIds = [
    ...new Set((regMatches ?? []).map((r) => r.pedigree_id)),
  ].filter((id) => !baseRows.has(id));

  if (regPedigreeIds.length > 0) {
    let pedigreeQuery = client
      .from("pedigrees")
      .select("id, name, type, birth_year, height")
      .in("id", regPedigreeIds);

    if (params.type) {
      pedigreeQuery = pedigreeQuery.eq("type", params.type);
    }

    const { data: pedigreeMatches, error: pedigreeError } =
      await pedigreeQuery;
    if (pedigreeError) {
      return { ok: false, error: pedigreeError.message };
    }
    for (const row of pedigreeMatches ?? []) {
      baseRows.set(row.id, row as PedigreeBaseRow);
    }
  }

  const records = await attachRegistrations([...baseRows.values()]);
  return { ok: true, results: dedupeById(records).slice(0, 20) };
}

export type PublicAncestorSuggestion = {
  name: string;
  /** How many published horses carry this ancestor; drives the ordering. */
  horseCount: number;
  /** Shallowest generation the ancestor appears at, as a hint in the list. */
  minGeneration: number;
};

/**
 * Autocomplete for the directory bloodline search. Backed by an RPC so anon
 * visitors get distinct ancestor names from published horses only, without
 * paging through every pedigree row the RLS policy would allow.
 */
export async function searchPublicAncestorNames(params: {
  query: string;
  horseType?: "stallion" | "mare";
  limit?: number;
}): Promise<PublicAncestorSuggestion[]> {
  const q = params.query.trim();
  if (!q) return [];

  const { data, error } = await createClient().rpc(
    "search_public_ancestor_names",
    {
      p_query: q,
      p_horse_type: params.horseType ?? null,
      p_limit: params.limit ?? 8,
    }
  );

  if (error || !data) return [];

  return (
    data as {
      ancestor_name: string;
      horse_count: number;
      min_generation: number;
    }[]
  ).map((row) => ({
    name: row.ancestor_name,
    horseCount: row.horse_count,
    minGeneration: row.min_generation,
  }));
}

export async function fetchPedigreeWithRegistrations(
  pedigreeId: string
): Promise<
  { ok: true; record: PedigreeRecordOption } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("pedigrees")
    .select("id, name, type, birth_year, height")
    .eq("id", pedigreeId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Pedigree record not found." };
  }

  const [record] = await attachRegistrations([data as PedigreeBaseRow]);
  return { ok: true, record };
}

export async function createPedigreeRecord(params: {
  name: string;
  type: PedigreeType;
  birth_year?: number | null;
  height?: string | null;
  registrations?: FormPedigreeRegistrationRow[];
}): Promise<
  { ok: true; record: PedigreeRecordOption } | { ok: false; error: string }
> {
  const name = params.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  const client = createClient();
  const { data: pedigree, error: insertError } = await client
    .from("pedigrees")
    .insert({
      name,
      type: params.type,
      birth_year: params.birth_year ?? null,
      height: params.height?.trim() || null,
    })
    .select("id, name, type, birth_year, height")
    .single();

  if (insertError || !pedigree) {
    return { ok: false, error: insertError?.message ?? "Failed to create pedigree." };
  }

  const regs = params.registrations?.filter(registrationRowHasContent) ?? [];
  if (regs.length > 0) {
    const normalized = ensureSinglePrimaryRegistration(regs);
    const { error: regError } = await client.from("pedigree_registrations").insert(
      normalized.map((reg, index) => ({
        pedigree_id: pedigree.id,
        association_name: reg.association_name.trim() || "—",
        country: reg.country.trim().toUpperCase() || null,
        registration_number: reg.registration_number.trim() || null,
        is_primary: reg.is_primary,
        sort_order: index,
      }))
    );
    if (regError) {
      return { ok: false, error: regError.message };
    }
  }

  const fetched = await fetchPedigreeWithRegistrations(pedigree.id);
  if (!fetched.ok) {
    return fetched;
  }
  return { ok: true, record: fetched.record };
}

export async function updatePedigreeRecord(
  pedigreeId: string,
  params: {
    name: string;
    birth_year?: number | null;
    height?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = params.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  const { error } = await createClient()
    .from("pedigrees")
    .update({
      name,
      birth_year: params.birth_year ?? null,
      height: params.height?.trim() || null,
    })
    .eq("id", pedigreeId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function replacePedigreeRegistrations(
  pedigreeId: string,
  registrations: FormPedigreeRegistrationRow[]
): Promise<
  { ok: true; registrations: PedigreeRegistrationOption[] } | { ok: false; error: string }
> {
  const client = createClient();
  const withContent = registrations.filter(registrationRowHasContent);
  const normalized = ensureSinglePrimaryRegistration(withContent);

  const { error: deleteError } = await client
    .from("pedigree_registrations")
    .delete()
    .eq("pedigree_id", pedigreeId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (normalized.length === 0) {
    return { ok: true, registrations: [] };
  }

  const { data, error: insertError } = await client
    .from("pedigree_registrations")
    .insert(
      normalized.map((reg, index) => ({
        pedigree_id: pedigreeId,
        association_name: reg.association_name.trim() || "—",
        country: reg.country.trim().toUpperCase() || null,
        registration_number: reg.registration_number.trim() || null,
        is_primary: reg.is_primary,
        sort_order: index,
      }))
    )
    .select(
      "id, association_name, country, registration_number, is_primary, sort_order"
    );

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return {
    ok: true,
    registrations: (data ?? []) as PedigreeRegistrationOption[],
  };
}

export async function fetchStallionPedigreeFormRows(
  stallionId: string
): Promise<
  { ok: true; rows: FormPedigreeRow[] } | { ok: false; error: string }
> {
  const id = stallionId.trim();
  if (!id) {
    return { ok: true, rows: [] };
  }

  const { data, error } = await createClient()
    .from("stallion_pedigrees")
    .select(STALLION_PEDIGREE_ADMIN_SELECT)
    .eq("stallion_id", id)
    .order("generation", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    rows: mapStallionPedigreeRowsToFormRows(
      (data ?? []) as Record<string, unknown>[]
    ),
  };
}

export async function createStallionPedigreeLink(
  stallionId: string,
  params: {
    pedigree_id: string;
    generation: number;
    progeny_id?: string | null;
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const pedigreeId = params.pedigree_id.trim();
  if (!pedigreeId) {
    return { ok: false, error: "Pedigree record is required." };
  }
  if (!Number.isFinite(params.generation) || params.generation < 1) {
    return { ok: false, error: "Generation must be at least 1." };
  }

  const progenyId =
    params.generation === 1
      ? null
      : params.progeny_id?.trim() || null;

  if (params.generation > 1 && !progenyId) {
    return {
      ok: false,
      error: "A parent progeny row is required for ancestors beyond 1st generation.",
    };
  }

  const { data, error } = await createClient()
    .from("stallion_pedigrees")
    .insert({
      stallion_id: stallionId,
      pedigree_id: pedigreeId,
      generation: params.generation,
      progeny_id: progenyId,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      error: error?.message ?? "Failed to link pedigree ancestor.",
    };
  }

  return { ok: true, id: data.id };
}

export async function deleteStallionPedigreeLinks(
  ids: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  );
  if (uniqueIds.length === 0) return { ok: true };

  const { error } = await createClient()
    .from("stallion_pedigrees")
    .delete()
    .in("id", uniqueIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type PedigreePrefillAncestor = {
  generation: number;
  name: string;
};

export type PedigreePrefillSource = {
  source_anchor_id: string;
  source_stallion_id: string;
  source_stallion_name: string;
  ancestor_count: number;
  from_generation?: number;
  to_generation?: number;
  ancestors: PedigreePrefillAncestor[];
};

export type PedigreePrefillPreview = {
  ancestor_count: number;
  horse_name?: string;
  sources: PedigreePrefillSource[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function rpcErrorMessage(payload: Record<string, unknown> | null, fallback: string) {
  const error = payload?.error;
  return typeof error === "string" && error.trim() ? error.trim() : fallback;
}

function mapPrefillAncestor(value: unknown): PedigreePrefillAncestor | null {
  const row = asRecord(value);
  const generation =
    typeof row?.generation === "number" ? row.generation : Number.NaN;
  const name = typeof row?.name === "string" ? row.name.trim() : "";
  if (!Number.isFinite(generation) || generation < 1 || !name) return null;
  return { generation: Math.trunc(generation), name };
}

function mapPrefillSource(value: unknown): PedigreePrefillSource | null {
  const row = asRecord(value);
  const source_anchor_id =
    typeof row?.source_anchor_id === "string" ? row.source_anchor_id.trim() : "";
  const source_stallion_id =
    typeof row?.source_stallion_id === "string" ? row.source_stallion_id.trim() : "";
  if (!source_anchor_id || !source_stallion_id) return null;

  const ancestors = asList(row?.ancestors)
    .map(mapPrefillAncestor)
    .filter((item): item is PedigreePrefillAncestor => item != null);

  if (ancestors.length === 0) return null;

  return {
    source_anchor_id,
    source_stallion_id,
    source_stallion_name:
      typeof row?.source_stallion_name === "string" && row.source_stallion_name.trim()
        ? row.source_stallion_name.trim()
        : "Unknown stallion",
    ancestor_count:
      typeof row?.ancestor_count === "number" ? row.ancestor_count : ancestors.length,
    from_generation:
      typeof row?.from_generation === "number" ? row.from_generation : undefined,
    to_generation:
      typeof row?.to_generation === "number" ? row.to_generation : undefined,
    ancestors,
  };
}

export async function previewPedigreePrefill(params: {
  pedigreeId: string;
  excludeStallionId: string;
  anchorGeneration: number;
}): Promise<
  | { ok: true; preview: PedigreePrefillPreview }
  | { ok: false; error: string }
> {
  const pedigreeId = params.pedigreeId.trim();
  const excludeStallionId = params.excludeStallionId.trim();
  if (!pedigreeId || !excludeStallionId) {
    return { ok: false, error: "Pedigree and stallion ids are required." };
  }

  const { data, error } = await createClient().rpc("pedigree_prefill_preview", {
    p_pedigree_id: pedigreeId,
    p_exclude_stallion_id: excludeStallionId,
    p_anchor_generation: params.anchorGeneration,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = asRecord(data);
  if (payload?.ok === false) {
    return {
      ok: false,
      error: rpcErrorMessage(payload, "Failed to look up pedigree ancestors."),
    };
  }

  const sources = asList(payload?.sources)
    .map(mapPrefillSource)
    .filter((item): item is PedigreePrefillSource => item != null);

  return {
    ok: true,
    preview: {
      ancestor_count:
        typeof payload?.ancestor_count === "number"
          ? payload.ancestor_count
          : sources[0]?.ancestor_count ?? 0,
      horse_name:
        typeof payload?.horse_name === "string" ? payload.horse_name : undefined,
      sources,
    },
  };
}

export async function prefillStallionPedigreeAncestors(
  stallionId: string,
  anchorLinkId: string,
  sourceAnchorId?: string
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const id = stallionId.trim();
  const linkId = anchorLinkId.trim();
  const sourceId = sourceAnchorId?.trim() ?? "";
  if (!id || !linkId) {
    return { ok: false, error: "Stallion and pedigree slot ids are required." };
  }

  const { data, error } = await createClient().rpc(
    "prefill_stallion_pedigree_ancestors",
    {
      p_stallion_id: id,
      p_anchor_link_id: linkId,
      p_source_anchor_id: sourceId || undefined,
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = asRecord(data);
  if (payload?.ok === false) {
    return {
      ok: false,
      error: rpcErrorMessage(payload, "Failed to prefill pedigree ancestors."),
    };
  }

  return {
    ok: true,
    inserted: typeof payload?.inserted === "number" ? payload.inserted : 0,
  };
}

export function collectStallionPedigreeDescendantIds(
  rows: { id?: string; tempId: string; progeny_ref: string }[],
  rootTempId: string
): string[] {
  const toRemove = new Set<string>();

  function collect(tempId: string) {
    if (toRemove.has(tempId)) return;
    toRemove.add(tempId);
    for (const row of rows) {
      if (row.progeny_ref === tempId) {
        collect(row.tempId);
      }
    }
  }

  collect(rootTempId);

  return rows
    .filter((row) => toRemove.has(row.tempId))
    .map((row) => row.id?.trim() || row.tempId.trim())
    .filter(Boolean);
}
