import { createClient } from "@/services/supabase";
import { BREEDING_SERVICE_PROVIDER_SELECT } from "@/services/stallion";
import type {
  FormBreedingProviderRow,
  FormStudFeeRow,
} from "@/types/stallion-form";
import {
  DEFAULT_STUD_FEE_CURRENCY,
  formatStudFeeCurrencyLabel,
} from "@/utils/stallion";

function parseOptionalNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function createEmptyStudFeeRow(tempId?: string): FormStudFeeRow {
  return {
    tempId: tempId ?? `stud-fee-${crypto.randomUUID()}`,
    value: "",
    currency: DEFAULT_STUD_FEE_CURRENCY,
  };
}

export function createEmptyBreedingProviderRow(
  id = ""
): FormBreedingProviderRow {
  return {
    id,
    name: "",
    contact_name: "",
    website: "",
    country: "",
    email: "",
    phone: "",
    admin_notes: "",
  };
}

function studFeesToDbJson(fees: FormStudFeeRow[]): Record<string, unknown>[] {
  return fees
    .map((fee) => ({
      value: parseOptionalNumeric(fee.value),
      currency:
        formatStudFeeCurrencyLabel(fee.currency) || DEFAULT_STUD_FEE_CURRENCY,
    }))
    .filter((fee) => fee.value != null);
}

export function mapBreedingProviderFormRow(
  row: Record<string, unknown>
): FormBreedingProviderRow {
  return {
    id: String(row.id ?? ""),
    name: typeof row.name === "string" ? row.name : "",
    contact_name: typeof row.contact_name === "string" ? row.contact_name : "",
    website: typeof row.website === "string" ? row.website : "",
    country: typeof row.country === "string" ? row.country : "",
    email: typeof row.email === "string" ? row.email : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
    phone: typeof row.phone === "string" ? row.phone : "",
  };
}

function providerToInsert(
  stallionId: string,
  fields: FormBreedingProviderRow,
  sortOrder: number
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    name: fields.name.trim() || null,
    contact_name: fields.contact_name.trim() || null,
    website: fields.website.trim() || null,
    country: fields.country.trim() || null,
    email: fields.email.trim() || null,
    phone: fields.phone.trim() || null,
    sort_order: sortOrder,
  };
}

function providerToUpdate(
  fields: FormBreedingProviderRow
): Record<string, unknown> {
  return {
    name: fields.name.trim() || null,
    contact_name: fields.contact_name.trim() || null,
    website: fields.website.trim() || null,
    country: fields.country.trim() || null,
    email: fields.email.trim() || null,
    phone: fields.phone.trim() || null,
  };
}

export async function saveStudFees(
  stallionId: string,
  fees: FormStudFeeRow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await createClient().rpc("update_stallion_stud_fees", {
    p_stallion_id: stallionId,
    p_stud_fees: studFeesToDbJson(fees),
  });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Failed to save stud fees.",
    };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (result && result.ok === false) {
    return {
      ok: false,
      error: result.error ?? "Failed to save stud fees.",
    };
  }

  return { ok: true };
}

export async function createBreedingServiceProvider(
  stallionId: string,
  fields: FormBreedingProviderRow,
  sortOrder: number
): Promise<
  { ok: true; record: FormBreedingProviderRow } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallion_breeding_service_providers")
    .insert(providerToInsert(stallionId, fields, sortOrder) as never)
    .select(BREEDING_SERVICE_PROVIDER_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create breeding service provider.",
    };
  }

  return {
    ok: true,
    record: mapBreedingProviderFormRow(data as Record<string, unknown>),
  };
}

export async function updateBreedingServiceProvider(
  id: string,
  fields: FormBreedingProviderRow
): Promise<
  { ok: true; record: FormBreedingProviderRow } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallion_breeding_service_providers")
    .update(providerToUpdate(fields) as never)
    .eq("id", id)
    .select(BREEDING_SERVICE_PROVIDER_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update breeding service provider.",
    };
  }

  return {
    ok: true,
    record: mapBreedingProviderFormRow(data as Record<string, unknown>),
  };
}

export async function deleteBreedingServiceProvider(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_breeding_service_providers")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
