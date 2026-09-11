"use client";

import {
  formatAiConfidence,
  isGenerationStalled,
  presentGenerationStatus,
  type AgentRunState,
  type AgentStatusTone,
} from "@/types/stallion-agent";
import Badge from "@/ui/Badge";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import SectionCard from "../../SectionCard";

const TONE_VARIANT: Record<
  AgentStatusTone,
  "default" | "success" | "warning" | "danger" | "muted"
> = {
  neutral: "muted",
  busy: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

export default function AgentRunStatePanel({
  runState,
  generating,
  generateError,
  reviewing,
  reviewError,
  canGenerate,
  contactLost,
  onGenerate,
  onMarkReviewed,
}: {
  runState: AgentRunState;
  generating: boolean;
  generateError: string | null;
  reviewing: boolean;
  reviewError: string | null;
  /** False when no agent address is configured; the button stays visible but inert. */
  canGenerate: boolean;
  /** True when repeated refreshes have failed, so the displayed state is stale. */
  contactLost: boolean;
  onGenerate: () => void;
  onMarkReviewed: () => void;
}) {
  const status = presentGenerationStatus(runState.generation_status);
  const stalled = isGenerationStalled(
    runState.generation_status,
    runState.generation_started_at
  );

  // A run in flight blocks a second trigger, but a *stalled* one must not:
  // the process behind it is gone, and refusing to retry would leave the record
  // permanently unusable.
  // A run we can no longer confirm is not treated as in flight: leaving the
  // button disabled on the strength of state we know to be stale is the one
  // outcome with no way out of it.
  const inFlight = !status.terminal && !stalled && !contactLost;
  const confidence = formatAiConfidence(runState.ai_confidence);

  return (
    <SectionCard
      title="Generation"
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          {runState.agent_needs_review ? (
            <Badge variant="warning">Unreviewed agent output</Badge>
          ) : null}
          <Badge variant={TONE_VARIANT[status.tone]}>{status.label}</Badge>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Confidence">
          {confidence ? (
            <span>{confidence}</span>
          ) : (
            <span className="text-slate-500">Not scored</span>
          )}
        </Stat>
        <Stat label="Last generated">
          <span className="text-xs">{formatTimestamp(runState.last_generated_at)}</span>
        </Stat>
        <Stat label="Run started">
          <span className="text-xs">
            {formatTimestamp(runState.generation_started_at)}
          </span>
        </Stat>
      </div>

      {contactLost ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100/80">
          Lost contact with the server, so this may not reflect the current
          state. Reload to refresh; generating again is safe.
        </p>
      ) : null}

      {stalled ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100/80">
          This run has been marked in progress for longer than expected and has
          most likely stopped. Generating again is safe.
        </p>
      ) : null}

      {runState.generation_notes.trim() ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Run notes
          </p>
          {/*
            Diagnostic output from the run, not publishable copy. Preserved
            whitespace because the agent composes it as a line-per-item summary.
          */}
          <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 font-sans text-xs leading-relaxed text-slate-400">
            {runState.generation_notes}
          </pre>
        </div>
      ) : null}

      {/*
        Actions row. The pt-BR translation trigger is specified as future work
        and belongs here beside Generate — same scope (one stallion), same
        shape (dispatch, then poll a status column). Adding it should mean
        adding a button to this row and a route beside the generate one.
      */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4">
        <Button
          variant="primary"
          size="lg"
          loading={generating}
          disabled={!canGenerate || inFlight}
          onClick={onGenerate}
        >
          {inFlight ? "Generating…" : "Generate"}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          loading={reviewing}
          disabled={!runState.agent_needs_review}
          onClick={onMarkReviewed}
        >
          Mark as reviewed
        </Button>

        {!canGenerate ? (
          <p className="text-xs text-slate-500">
            Generation is not configured for this environment.
          </p>
        ) : null}
      </div>

      {generateError ? <ErrorText>{generateError}</ErrorText> : null}
      {reviewError ? <ErrorText>{reviewError}</ErrorText> : null}
    </SectionCard>
  );
}
