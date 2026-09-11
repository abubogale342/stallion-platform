/**
 * Milestone 17 — the AI agent's output on `stallions`.
 *
 * The agent lives in a separate repository (`lsr-ai-agent`) and is deployed
 * independently. Everything here describes what it *writes*, not what it should
 * write: where the brief and the agent disagree, the agent wins, because the
 * agent is the thing actually populating the column.
 */

/**
 * Values the agent writes to `stallions.generation_status`.
 *
 * `idle` is ours — the column default, meaning the agent has never run for this
 * stallion. The other four come from `generation.service.ts`: `processing` at
 * run start, then one of `completed` / `completed_with_warnings` / `failed`.
 *
 * The brief names these idle/generating/complete/failed. That vocabulary is
 * close but wrong, and it has no word at all for `completed_with_warnings`,
 * which is the *common* outcome — the agent picks it whenever there are any
 * warnings, missing-information flags, or conflicts. We store the agent's raw
 * value and translate to the brief's intent at render time.
 */
export const AGENT_GENERATION_STATUSES = [
  "idle",
  "processing",
  "completed",
  "completed_with_warnings",
  "failed",
] as const;

export type AgentGenerationStatus = (typeof AGENT_GENERATION_STATUSES)[number];

/**
 * The column is deliberately unconstrained in the database: the status
 * vocabulary is owned by a separately deployed repo, so a CHECK constraint here
 * would turn "the agent added a status value" into a failed write that loses a
 * whole generation run. That means an unrecognised string can legitimately
 * arrive, and the UI must not assume the union is closed.
 */
export function isKnownGenerationStatus(
  value: string
): value is AgentGenerationStatus {
  return (AGENT_GENERATION_STATUSES as readonly string[]).includes(value);
}

export type AgentStatusTone = "neutral" | "busy" | "success" | "warning" | "danger";

export type AgentStatusPresentation = {
  label: string;
  tone: AgentStatusTone;
  /** False only while a run is genuinely in flight; drives the spinner and disables Generate. */
  terminal: boolean;
};

/**
 * An unrecognised status is shown verbatim and treated as terminal. Treating it
 * as in-flight instead would leave the Generate button permanently disabled
 * with no way for an admin to recover.
 */
export function presentGenerationStatus(
  status: string | null | undefined
): AgentStatusPresentation {
  const value = (status ?? "idle").trim() || "idle";

  switch (value) {
    case "idle":
      return { label: "Not generated", tone: "neutral", terminal: true };
    case "processing":
      return { label: "Generating…", tone: "busy", terminal: false };
    case "completed":
      return { label: "Complete", tone: "success", terminal: true };
    case "completed_with_warnings":
      return { label: "Complete — needs attention", tone: "warning", terminal: true };
    case "failed":
      return { label: "Failed", tone: "danger", terminal: true };
    default:
      return { label: value, tone: "neutral", terminal: true };
  }
}

/**
 * A run that claims to be in flight but started long enough ago that the
 * process is almost certainly gone.
 *
 * The agent writes `processing` at the start of a run but only stamps
 * `last_generated_at` on a terminal outcome, so a run killed mid-flight — the
 * agent's Vercel function has a 60s `maxDuration` — leaves the row pinned at
 * `processing` with no timestamp to age it against. Our own trigger route
 * records `generation_started_at` for exactly this reason.
 */
export const STALLED_GENERATION_AFTER_MS = 15 * 60 * 1000;

export function isGenerationStalled(
  status: string | null | undefined,
  startedAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  if ((status ?? "") !== "processing") return false;
  // No recorded start means we cannot prove it is still running. Treat it as
  // stalled so the admin keeps a way to retry.
  if (!startedAt) return true;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return true;
  return now - started > STALLED_GENERATION_AFTER_MS;
}

/* -------------------------------------------------------------------------- */
/* Flags                                                                      */
/* -------------------------------------------------------------------------- */

export type AgentFlagSeverity = "low" | "medium" | "high";

/** Mirrors `missingInfoFlagSchema` in the agent repo. */
export type MissingInformationFlag = {
  field: string;
  severity: AgentFlagSeverity;
  message: string;
};

/** One competing value behind a conflict, with the source it came from. */
export type ConflictFlagValue = {
  value: string;
  source_type: string;
  source_name: string | null;
  snippet_id: string | null;
};

/** Mirrors `conflictFlagSchema` in the agent repo. */
export type ConflictFlag = {
  field: string;
  severity: AgentFlagSeverity;
  description: string;
  values: ConflictFlagValue[];
  recommended_review_action: string;
};

const SEVERITY_RANK: Record<AgentFlagSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asSeverity(value: unknown): AgentFlagSeverity {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : // An unknown severity is treated as the most serious rather than the
      // least: under-reporting a flag hides work from the reviewer, which is
      // the failure mode this whole section exists to prevent.
      "high";
}

/**
 * These columns are jsonb written by a separately deployed process, so the
 * shape is a convention rather than a guarantee — an older run, a partial
 * write, or a schema change on the agent side can all land something
 * unexpected. Anything unparseable is dropped rather than thrown, so one
 * malformed flag cannot blank the whole review panel.
 */
export function parseMissingInformationFlags(
  value: unknown
): MissingInformationFlag[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
      const field = asText(record.field);
      const message = asText(record.message);
      if (!field && !message) return null;
      return {
        field,
        severity: asSeverity(record.severity),
        message,
      } satisfies MissingInformationFlag;
    })
    .filter((flag): flag is MissingInformationFlag => flag !== null)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function parseConflictFlags(value: unknown): ConflictFlag[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
      const field = asText(record.field);
      const description = asText(record.description);
      if (!field && !description) return null;

      const values = Array.isArray(record.values)
        ? record.values
            .map((candidate) => {
              const valueRecord = asRecord(candidate);
              if (!valueRecord) return null;
              const text = asText(valueRecord.value);
              if (!text) return null;
              return {
                value: text,
                source_type: asText(valueRecord.source_type),
                source_name:
                  typeof valueRecord.source_name === "string"
                    ? valueRecord.source_name
                    : null,
                snippet_id:
                  typeof valueRecord.snippet_id === "string"
                    ? valueRecord.snippet_id
                    : null,
              } satisfies ConflictFlagValue;
            })
            .filter((item): item is ConflictFlagValue => item !== null)
        : [];

      return {
        field,
        severity: asSeverity(record.severity),
        description,
        values,
        recommended_review_action: asText(record.recommended_review_action),
      } satisfies ConflictFlag;
    })
    .filter((flag): flag is ConflictFlag => flag !== null)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/**
 * `ai_confidence` is stored as a 0-1 fraction (the agent's schema declares
 * `z.number().min(0).max(1)`), and the brief asks for a percentage.
 */
export function formatAiConfidence(value: number | null | undefined): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const clamped = Math.min(Math.max(value, 0), 1);
  return `${Math.round(clamped * 100)}%`;
}

/* -------------------------------------------------------------------------- */
/* Draft fields                                                               */
/* -------------------------------------------------------------------------- */

/** The ten free-text columns the agent writes for human review. */
export type AgentDraftField =
  | "stallion_overview_draft"
  | "performance_overview_draft"
  | "owner_email_draft"
  | "owner_email_follow_up_draft"
  | "facebook_message_draft"
  | "facebook_follow_up_message_draft"
  | "instagram_message_draft"
  | "instagram_follow_up_message_draft"
  | "whatsapp_message_draft"
  | "whatsapp_follow_up_message_draft";

export type AgentDraftGroup = "overview" | "outreach";

export type AgentDraftDescriptor = {
  field: AgentDraftField;
  label: string;
  group: AgentDraftGroup;
  /**
   * Outreach copy is sent by hand through an external channel, so it needs a
   * copy-to-clipboard control. The overview drafts are staging text for the
   * canonical `summary` / `performance_summary` columns and are edited in
   * place, so they do not.
   */
  copyable: boolean;
  hint?: string;
};

/**
 * Declared as data rather than as markup so that every consumer — the review
 * panel, the save payload, and the pt-BR translation trigger once that layer
 * exists — iterates the same list. Adding a draft field should mean adding a
 * row here, not editing a component.
 */
export const AGENT_DRAFT_FIELDS: readonly AgentDraftDescriptor[] = [
  {
    field: "stallion_overview_draft",
    label: "Stallion overview",
    group: "overview",
    copyable: false,
    hint: "Staging copy for the public summary. Never published directly.",
  },
  {
    field: "performance_overview_draft",
    label: "Performance overview",
    group: "overview",
    copyable: false,
    hint: "Counterpart to the canonical performance summary.",
  },
  {
    field: "owner_email_draft",
    label: "Owner email",
    group: "outreach",
    copyable: true,
  },
  {
    field: "owner_email_follow_up_draft",
    label: "Owner email — follow-up",
    group: "outreach",
    copyable: true,
  },
  {
    field: "facebook_message_draft",
    label: "Facebook message",
    group: "outreach",
    copyable: true,
  },
  {
    field: "facebook_follow_up_message_draft",
    label: "Facebook — follow-up",
    group: "outreach",
    copyable: true,
  },
  {
    field: "instagram_message_draft",
    label: "Instagram message",
    group: "outreach",
    copyable: true,
  },
  {
    field: "instagram_follow_up_message_draft",
    label: "Instagram — follow-up",
    group: "outreach",
    copyable: true,
  },
  {
    field: "whatsapp_message_draft",
    label: "WhatsApp message",
    group: "outreach",
    copyable: true,
  },
  {
    field: "whatsapp_follow_up_message_draft",
    label: "WhatsApp — follow-up",
    group: "outreach",
    copyable: true,
  },
] as const;

/** Form-side shape: every draft is a string, empty rather than null. */
export type FormAgentDrafts = Record<AgentDraftField, string>;

export function createEmptyAgentDrafts(): FormAgentDrafts {
  return AGENT_DRAFT_FIELDS.reduce((acc, descriptor) => {
    acc[descriptor.field] = "";
    return acc;
  }, {} as FormAgentDrafts);
}

/**
 * Read-only run state. Nothing here is editable by an admin: it is written by
 * the agent and by our own trigger route, and the panel renders it as evidence
 * of what the last run did.
 */
export type AgentRunState = {
  generation_status: string;
  generation_notes: string;
  ai_confidence: number | null;
  last_generated_at: string | null;
  generation_started_at: string | null;
  agent_needs_review: boolean;
  missing_information_flags: MissingInformationFlag[];
  conflict_flags: ConflictFlag[];
};

export function createEmptyAgentRunState(): AgentRunState {
  return {
    generation_status: "idle",
    generation_notes: "",
    ai_confidence: null,
    last_generated_at: null,
    generation_started_at: null,
    agent_needs_review: false,
    missing_information_flags: [],
    conflict_flags: [],
  };
}
