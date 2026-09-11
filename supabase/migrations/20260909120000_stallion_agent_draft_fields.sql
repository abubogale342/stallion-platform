-- Milestone 17 groundwork: the columns the AI agent writes its output into.
--
-- These seventeen columns have lived in the agent repo as
-- `docs/suggested-phase1-output-fields.sql`, headed "Suggested only. Do not run
-- without client/developer approval." They have never been applied to any
-- database owned by this repo, which is why every Milestone 17 deliverable
-- (Generate button, draft review panel, flag display, directory badge) has had
-- nothing to read. This lands them as versioned schema in the repo that owns
-- the schema.
--
-- The agent tolerates their absence rather than failing: it probes
-- `information_schema` and filters its payload down to columns that actually
-- exist (`filterToExistingColumns` in generation.service.ts), then reports the
-- rest as "Skipped missing stallions output columns". So until now a live
-- generation run has been silently discarding all seventeen values.
--
-- No RLS work is needed. These are new columns on `public.stallions`, whose
-- existing row policies already govern them; the agent itself connects with the
-- service role key and bypasses RLS regardless.
--
-- Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. Draft prose and outreach copy
-- ---------------------------------------------------------------------------
-- Every one is review-only output. Nothing here is published: the admin reads
-- these, edits them, and copies the outreach drafts out to the channel by hand.
-- They are deliberately separate from the canonical `summary` and
-- `performance_summary` columns so that a generation run can never overwrite
-- copy a human has already approved.

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS stallion_overview_draft text,
  ADD COLUMN IF NOT EXISTS performance_overview_draft text,
  ADD COLUMN IF NOT EXISTS owner_email_draft text,
  ADD COLUMN IF NOT EXISTS owner_email_follow_up_draft text,
  ADD COLUMN IF NOT EXISTS facebook_message_draft text,
  ADD COLUMN IF NOT EXISTS facebook_follow_up_message_draft text,
  ADD COLUMN IF NOT EXISTS instagram_message_draft text,
  ADD COLUMN IF NOT EXISTS instagram_follow_up_message_draft text,
  ADD COLUMN IF NOT EXISTS whatsapp_message_draft text,
  ADD COLUMN IF NOT EXISTS whatsapp_follow_up_message_draft text;

COMMENT ON COLUMN public.stallions.stallion_overview_draft IS
  'AI-generated overview, review-only. Never rendered publicly; an admin copies approved text into summary.';
COMMENT ON COLUMN public.stallions.performance_overview_draft IS
  'AI-generated performance prose, review-only. Counterpart to the canonical performance_summary.';

-- ---------------------------------------------------------------------------
-- 2. Flags
-- ---------------------------------------------------------------------------
-- The agent writes arrays of objects, each carrying at least a `field` key
-- (see buildDeterministicGenerationNotes). Defaulting to an empty array rather
-- than NULL means the admin UI can map over these without a null guard on every
-- render, and an existing row reads as "nothing flagged" rather than "unknown".

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS missing_information_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conflict_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.stallions.missing_information_flags IS
  'Array of {field, ...} objects naming information the agent could not source. Displayed as a highlighted list in the admin.';
COMMENT ON COLUMN public.stallions.conflict_flags IS
  'Array of {field, ...} objects naming contradictions between sources. Displayed as a highlighted list in the admin.';

-- ---------------------------------------------------------------------------
-- 3. Run state
-- ---------------------------------------------------------------------------
-- Deliberately no CHECK constraint on generation_status. The vocabulary is
-- owned by a separate repository and deployed independently, so a constraint
-- here turns "the agent added a status value" into a failed write in the middle
-- of a generation run, losing the whole payload. The comment documents the
-- vocabulary instead; the admin UI should treat an unrecognised value as a
-- terminal state rather than assuming the enum is closed.
--
-- NOTE: the values the agent actually writes are processing / completed /
-- completed_with_warnings / failed. The Milestone 17 brief specifies
-- idle / generating / complete / failed. These do not match. 'idle' is used as
-- the default here because no other value can describe a stallion that has
-- never been through the agent, but the remaining three-way disagreement needs
-- Kirrilly's call before the button's status labels are built.

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS last_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_notes text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric;

COMMENT ON COLUMN public.stallions.generation_status IS
  'Agent run state. Written by lsr-ai-agent as processing/completed/completed_with_warnings/failed; idle means never generated. Not constrained: the vocabulary is owned by a separately deployed repo.';
COMMENT ON COLUMN public.stallions.last_generated_at IS
  'Set on every terminal outcome, success or failure. NULL means the agent has never run for this stallion.';
COMMENT ON COLUMN public.stallions.generation_notes IS
  'Deterministic run summary: flags raised, evidence notes, warnings. Diagnostic, not publishable copy.';

-- ai_confidence is a 0-1 fraction, not a percentage: the agent's schema declares
-- z.number().min(0).max(1) and it writes the *lower* of the model's self-report
-- and the evidence confidence. The constraint is worth having because, unlike
-- the status vocabulary, the range is fixed by the scale itself. The admin
-- renders it as a percentage.
ALTER TABLE public.stallions
  DROP CONSTRAINT IF EXISTS stallions_ai_confidence_range;
ALTER TABLE public.stallions
  ADD CONSTRAINT stallions_ai_confidence_range
  CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1));

COMMENT ON COLUMN public.stallions.ai_confidence IS
  'Confidence in the generated output as a 0-1 fraction, not a percentage. Rendered as a percentage in the admin.';

-- ---------------------------------------------------------------------------
-- 4. Review gate
-- ---------------------------------------------------------------------------
-- Defaulted false, not true. Every stallion currently in the table was entered
-- by a human and has never been near the agent, so backfilling true would light
-- up the entire directory with a review badge on day one and make the signal
-- worthless. The agent sets it true when it writes; "Mark as reviewed" sets it
-- back to false.

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stallions.needs_review IS
  'True when agent output is awaiting human review. Set by the agent on completion, cleared by Mark as reviewed.';

-- Partial index: the admin listing filters to "needs review" and that set stays
-- small relative to the table, so indexing only the true rows keeps it cheap.
CREATE INDEX IF NOT EXISTS stallions_needs_review_idx
  ON public.stallions (needs_review)
  WHERE needs_review;
