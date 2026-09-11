import { createClient } from "@/services/supabase";
import { STALLION_OWNER_LINK_SELECT } from "@/services/stallion";
import type { OwnerRecordOption, OwnerRecordFields } from "@/types/owner";
import type { FormOwnerLink } from "@/types/stallion-form";
import {
  mapOwnerRecordToFormLink,
  mapStallionOwnerLinkRow,
  ownerFieldsToDbPayload,
} from "@/utils/owner";

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

const OWNER_SELECT =
  "id, owner_name, country, email, phone, farm_ranch, farm_ranch_website, address_line_1, address_line_2, suburb, state_region, postal_code, full_address, facebook, instagram";

function mapOwnerRow(row: Record<string, unknown>): OwnerRecordOption {
  return {
    id: typeof row.id === "string" ? row.id : "",
    owner_name: typeof row.owner_name === "string" ? row.owner_name : "",
    country: typeof row.country === "string" ? row.country : null,
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    farm_ranch: typeof row.farm_ranch === "string" ? row.farm_ranch : null,
    farm_ranch_website:
      typeof row.farm_ranch_website === "string" ? row.farm_ranch_website : null,
    address_line_1:
      typeof row.address_line_1 === "string" ? row.address_line_1 : null,
    address_line_2:
      typeof row.address_line_2 === "string" ? row.address_line_2 : null,
    suburb: typeof row.suburb === "string" ? row.suburb : null,
    state_region: typeof row.state_region === "string" ? row.state_region : null,
    postal_code: typeof row.postal_code === "string" ? row.postal_code : null,
    full_address: typeof row.full_address === "string" ? row.full_address : null,
    facebook: typeof row.facebook === "string" ? row.facebook : null,
    instagram: typeof row.instagram === "string" ? row.instagram : null,
  };
}

function dedupeById(records: OwnerRecordOption[]): OwnerRecordOption[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (!record.id || seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
}
export async function searchOwners(params: {
  query: string;
}): Promise<
  { ok: true; results: OwnerRecordOption[] } | { ok: false; error: string }
> {
  const q = params.query.trim();
  if (!q) {
    return { ok: true, results: [] };
  }

  const client = createClient();
  const pattern = `%${escapeIlikePattern(q)}%`;
  const baseRows = new Map<string, OwnerRecordOption>();

  const searches = await Promise.all([
    client.from("owners").select(OWNER_SELECT).ilike("owner_name", pattern).limit(20),
    client.from("owners").select(OWNER_SELECT).ilike("farm_ranch", pattern).limit(20),
    client.from("owners").select(OWNER_SELECT).ilike("email", pattern).limit(20),
  ]);

  for (const { data, error } of searches) {
    if (error) {
      return { ok: false, error: error.message };
    }
    for (const row of data ?? []) {
      const mapped = mapOwnerRow(row as Record<string, unknown>);
      if (mapped.id) baseRows.set(mapped.id, mapped);
    }
  }

  return { ok: true, results: dedupeById([...baseRows.values()]).slice(0, 20) };
}

export async function fetchOwnerById(
  ownerId: string
): Promise<
  { ok: true; record: OwnerRecordOption } | { ok: false; error: string }
> {
  const id = ownerId.trim();
  if (!id) {
    return { ok: false, error: "Owner id is required." };
  }

  const { data, error } = await createClient()
    .from("owners")
    .select(OWNER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Owner record not found." };
  }

  return { ok: true, record: mapOwnerRow(data as Record<string, unknown>) };
}

export async function fetchStallionOwnerFormLinks(
  stallionId: string
): Promise<
  { ok: true; links: FormOwnerLink[] } | { ok: false; error: string }
> {
  const id = stallionId.trim();
  if (!id) {
    return { ok: true, links: [] };
  }

  const { data, error } = await createClient()
    .from("stallion_owners")
    .select(STALLION_OWNER_LINK_SELECT)
    .eq("stallion_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const links = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    (row, index) => mapStallionOwnerLinkRow(row, `owner-${index}`)
  );

  return { ok: true, links };
}

export async function createOwnerRecord(
  fields: OwnerRecordFields
): Promise<
  { ok: true; record: OwnerRecordOption } | { ok: false; error: string }
> {
  const ownerName = fields.owner_name.trim();
  if (!ownerName) {
    return { ok: false, error: "Owner name is required." };
  }

  const { data, error } = await createClient()
    .from("owners")
    .insert(ownerFieldsToDbPayload(fields))
    .select(OWNER_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create owner record.",
    };
  }

  return { ok: true, record: mapOwnerRow(data as Record<string, unknown>) };
}

export async function updateOwnerRecord(
  ownerId: string,
  fields: OwnerRecordFields
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = ownerId.trim();
  const ownerName = fields.owner_name.trim();
  if (!id) {
    return { ok: false, error: "Owner id is required." };
  }
  if (!ownerName) {
    return { ok: false, error: "Owner name is required." };
  }

  const { error } = await createClient()
    .from("owners")
    .update(ownerFieldsToDbPayload(fields))
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function linkOwnerToStallion(
  stallionId: string,
  ownerId: string,
  opts: {
    sort_order: number;
    is_primary: boolean;
    public_display_name_only: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = stallionId.trim();
  const oid = ownerId.trim();
  if (!sid || !oid) {
    return { ok: false, error: "Stallion and owner ids are required." };
  }

  const { error } = await createClient().from("stallion_owners").insert({
    stallion_id: sid,
    owner_id: oid,
    role: "Owner",
    sort_order: opts.sort_order,
    is_primary: opts.is_primary,
    public_display_name_only: opts.public_display_name_only,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This owner is already linked to the stallion.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateStallionOwnerLink(
  stallionId: string,
  ownerId: string,
  opts: {
    public_display_name_only: boolean;
    sort_order?: number;
    is_primary?: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = stallionId.trim();
  const oid = ownerId.trim();
  if (!sid || !oid) {
    return { ok: false, error: "Stallion and owner ids are required." };
  }

  const patch: Record<string, unknown> = {
    public_display_name_only: opts.public_display_name_only,
    updated_at: new Date().toISOString(),
  };
  if (opts.sort_order != null) patch.sort_order = opts.sort_order;
  if (opts.is_primary != null) patch.is_primary = opts.is_primary;

  const { error } = await createClient()
    .from("stallion_owners")
    .update(patch)
    .eq("stallion_id", sid)
    .eq("owner_id", oid);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function unlinkOwnerFromStallion(
  stallionId: string,
  ownerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = stallionId.trim();
  const oid = ownerId.trim();
  if (!sid || !oid) {
    return { ok: false, error: "Stallion and owner ids are required." };
  }

  const { error } = await createClient()
    .from("stallion_owners")
    .delete()
    .eq("stallion_id", sid)
    .eq("owner_id", oid);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function ownerRecordToFormLink(
  record: OwnerRecordOption,
  opts: {
    tempId: string;
    public_display_name_only?: boolean;
  }
): FormOwnerLink {
  return mapOwnerRecordToFormLink(record, opts);
}
