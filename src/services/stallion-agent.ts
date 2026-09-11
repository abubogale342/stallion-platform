import { createClient } from "@/services/supabase";
import {
  AGENT_DRAFT_FIELDS,
  createEmptyAgentDrafts,
  createEmptyAgentRunState,
  parseConflictFlags,
  parseMissingInformationFlags,
  type AgentRunState,
  type FormAgentDrafts,
} from "@/types/stallion-agent";

/**
 * Columns making up the agent review surface.
 *
 * Note the naming split: the database column is `stallions.needs_review`, but
 * everywhere in application code it is `agentNeedsReview` /
 * `agent_needs_review`. There is a second, unrelated `needs_review` on
 * `stallion_pedigrees` — a per-ancestor-row flag from the pedigree prefill
 * work, cleared by a different action — and a bare `needsReview` in this
 * codebase is ambiguous enough to get the wrong one wired to the wrong button.
 */
const AGENT_STATE_SELECT = [
  ...AGENT_DRAFT_FIELDS.map((descriptor) => descriptor.field),
  "missing_information_flags",
  "conflict_flags",
  "generation_status",
  "generation_notes",
  "ai_confidence",
  "last_generated_at",
  "generation_started_at",
  "needs_review",
].join(", ");

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function mapAgentDrafts(row: Record<string, unknown>): FormAgentDrafts {
  return AGENT_DRAFT_FIELDS.reduce((acc, descriptor) => {
    acc[descriptor.field] = asText(row[descriptor.field]);
    return acc;
  }, createEmptyAgentDrafts());
}

export function mapAgentRunState(row: Record<string, unknown>): AgentRunState {
  return {
    generation_status: asText(row.generation_status) || "idle",
    generation_notes: asText(row.generation_notes),
    ai_confidence:
      typeof row.ai_confidence === "number" && !Number.isNaN(row.ai_confidence)
        ? row.ai_confidence
        : null,
    last_generated_at:
      typeof row.last_generated_at === "string" ? row.last_generated_at : null,
    generation_started_at:
      typeof row.generation_started_at === "string"
        ? row.generation_started_at
        : null,
    agent_needs_review: row.needs_review === true,
    missing_information_flags: parseMissingInformationFlags(
      row.missing_information_flags
    ),
    conflict_flags: parseConflictFlags(row.conflict_flags),
  };
}

export type StallionAgentState = {
  drafts: FormAgentDrafts;
  runState: AgentRunState;
};

export function createEmptyAgentState(): StallionAgentState {
  return { drafts: createEmptyAgentDrafts(), runState: createEmptyAgentRunState() };
}

export async function loadStallionAgentState(
  stallionId: string
): Promise<
  { ok: true; state: StallionAgentState } | { ok: false; error: string }
> {
  const { data, error } = await createClient()
    .from("stallions")
    .select(AGENT_STATE_SELECT)
    .eq("id", stallionId)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to load agent output.",
    };
  }

  const row = data as unknown as Record<string, unknown>;
  return {
    ok: true,
    state: { drafts: mapAgentDrafts(row), runState: mapAgentRunState(row) },
  };
}

/**
 * Persists edited draft copy.
 *
 * These columns are deliberately not routed through
 * `update_stallion_from_form`: that RPC is the write path for the canonical
 * profile, and the drafts are review scratch space that an admin saves on its
 * own rhythm. Following the `updateHealthSummaries` pattern keeps a draft edit
 * from dragging the whole profile through a revalidation it did not ask for.
 *
 * Saving drafts does not touch `needs_review`. Editing the copy is not the same
 * act as signing off on it — that is what "Mark as reviewed" is for.
 */
export async function updateAgentDrafts(
  stallionId: string,
  drafts: FormAgentDrafts
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = AGENT_DRAFT_FIELDS.reduce<Record<string, string | null>>(
    (acc, descriptor) => {
      acc[descriptor.field] = drafts[descriptor.field].trim() || null;
      return acc;
    },
    {}
  );

  const { error } = await createClient()
    .from("stallions")
    .update(payload as never)
    .eq("id", stallionId);

  if (error) {
    return { ok: false, error: error.message ?? "Failed to save drafts." };
  }
  return { ok: true };
}

/**
 * "Mark as reviewed" — clears the review flag and nothing else.
 *
 * It deliberately leaves `generation_status` alone. The status records what the
 * last run did, and a human reading the output does not change that history;
 * conflating the two would erase the fact that a run completed with warnings as
 * soon as somebody looked at it.
 */
export async function markAgentReviewed(
  stallionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await createClient()
    .from("stallions")
    .update({ needs_review: false } as never)
    .eq("id", stallionId);

  if (error) {
    return { ok: false, error: error.message ?? "Failed to mark as reviewed." };
  }
  return { ok: true };
}
