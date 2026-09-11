import { createClient } from "@/services/supabase";
import type {
  FormColourTestRow,
  FormGeneticTestRow,
  FormHealthSummaries,
} from "@/types/stallion-form";

const GENETIC_TEST_SELECT =
  "id, test_type, gene_code, result, source, admin_notes";
const COLOUR_TEST_SELECT =
  "id, colour_test, gene_code, result, source, admin_notes";

export function createEmptyGeneticTestRow(id = ""): FormGeneticTestRow {
  return {
    id,
    test_type: "",
    gene_code: "",
    result: "",
    source: "",
    admin_notes: "",
  };
}

export function createEmptyColourTestRow(id = ""): FormColourTestRow {
  return {
    id,
    colour_test: "",
    gene_code: "",
    result: "",
    source: "",
    admin_notes: "",
  };
}

export function mapGeneticTestFormRow(row: Record<string, unknown>): FormGeneticTestRow {
  return {
    id: String(row.id ?? ""),
    test_type: typeof row.test_type === "string" ? row.test_type : "",
    gene_code: typeof row.gene_code === "string" ? row.gene_code : "",
    result: typeof row.result === "string" ? row.result : "",
    source: typeof row.source === "string" ? row.source : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
  };
}

export function mapColourTestFormRow(row: Record<string, unknown>): FormColourTestRow {
  return {
    id: String(row.id ?? ""),
    colour_test: typeof row.colour_test === "string" ? row.colour_test : "",
    gene_code: typeof row.gene_code === "string" ? row.gene_code : "",
    result: typeof row.result === "string" ? row.result : "",
    source: typeof row.source === "string" ? row.source : "",
    admin_notes: typeof row.admin_notes === "string" ? row.admin_notes : "",
  };
}

function geneticTestToInsert(
  stallionId: string,
  fields: FormGeneticTestRow
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    test_type: fields.test_type.trim() || null,
    gene_code: fields.gene_code.trim() || null,
    result: fields.result.trim() || null,
    source: fields.source.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

function geneticTestToUpdate(
  fields: FormGeneticTestRow
): Record<string, unknown> {
  return {
    test_type: fields.test_type.trim() || null,
    gene_code: fields.gene_code.trim() || null,
    result: fields.result.trim() || null,
    source: fields.source.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

function colourTestToInsert(
  stallionId: string,
  fields: FormColourTestRow
): Record<string, unknown> {
  return {
    stallion_id: stallionId,
    colour_test: fields.colour_test.trim() || null,
    gene_code: fields.gene_code.trim() || null,
    result: fields.result.trim() || null,
    source: fields.source.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

function colourTestToUpdate(
  fields: FormColourTestRow
): Record<string, unknown> {
  return {
    colour_test: fields.colour_test.trim() || null,
    gene_code: fields.gene_code.trim() || null,
    result: fields.result.trim() || null,
    source: fields.source.trim() || null,
    admin_notes: fields.admin_notes.trim() || null,
  };
}

export function healthSummariesHasData(
  summaries: FormHealthSummaries
): boolean {
  return (
    summaries.genetic_disease_testing_results.trim() !== "" ||
    summaries.genetic_testing_results.trim() !== "" ||
    summaries.colour_testing_results.trim() !== "" ||
    summaries.genetic_test_results_summary.trim() !== ""
  );
}

export async function updateHealthSummaries(
  stallionId: string,
  summaries: FormHealthSummaries
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallions")
    .update({
      genetic_disease_testing_results:
        summaries.genetic_disease_testing_results.trim() || null,
      genetic_testing_results: summaries.genetic_testing_results.trim() || null,
      colour_testing_results: summaries.colour_testing_results.trim() || null,
      genetic_test_results_summary:
        summaries.genetic_test_results_summary.trim() || null,
    } as never)
    .eq("id", stallionId);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Failed to update health summaries.",
    };
  }
  return { ok: true };
}

export async function createGeneticTest(
  stallionId: string,
  fields: FormGeneticTestRow
): Promise<
  { ok: true; record: FormGeneticTestRow } | { ok: false; error: string }
> {
  if (!fields.test_type.trim()) {
    return { ok: false, error: "Test type is required." };
  }
  if (!fields.result.trim()) {
    return { ok: false, error: "Result is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_genetic_tests")
    .insert(geneticTestToInsert(stallionId, fields) as never)
    .select(GENETIC_TEST_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create genetic test.",
    };
  }

  return { ok: true, record: mapGeneticTestFormRow(data as Record<string, unknown>) };
}

export async function updateGeneticTest(
  id: string,
  fields: FormGeneticTestRow
): Promise<
  { ok: true; record: FormGeneticTestRow } | { ok: false; error: string }
> {
  if (!fields.test_type.trim()) {
    return { ok: false, error: "Test type is required." };
  }
  if (!fields.result.trim()) {
    return { ok: false, error: "Result is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_genetic_tests")
    .update(geneticTestToUpdate(fields) as never)
    .eq("id", id)
    .select(GENETIC_TEST_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update genetic test.",
    };
  }

  return { ok: true, record: mapGeneticTestFormRow(data as Record<string, unknown>) };
}

export async function deleteGeneticTest(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_genetic_tests")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function createColourTest(
  stallionId: string,
  fields: FormColourTestRow
): Promise<
  { ok: true; record: FormColourTestRow } | { ok: false; error: string }
> {
  if (!fields.colour_test.trim()) {
    return { ok: false, error: "Test name is required." };
  }
  if (!fields.result.trim()) {
    return { ok: false, error: "Result is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_colour_tests")
    .insert(colourTestToInsert(stallionId, fields) as never)
    .select(COLOUR_TEST_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create colour test.",
    };
  }

  return { ok: true, record: mapColourTestFormRow(data as Record<string, unknown>) };
}

export async function updateColourTest(
  id: string,
  fields: FormColourTestRow
): Promise<
  { ok: true; record: FormColourTestRow } | { ok: false; error: string }
> {
  if (!fields.colour_test.trim()) {
    return { ok: false, error: "Test name is required." };
  }
  if (!fields.result.trim()) {
    return { ok: false, error: "Result is required." };
  }

  const { data, error } = await createClient()
    .from("stallion_colour_tests")
    .update(colourTestToUpdate(fields) as never)
    .eq("id", id)
    .select(COLOUR_TEST_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to update colour test.",
    };
  }

  return { ok: true, record: mapColourTestFormRow(data as Record<string, unknown>) };
}

export async function deleteColourTest(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallion_colour_tests")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
