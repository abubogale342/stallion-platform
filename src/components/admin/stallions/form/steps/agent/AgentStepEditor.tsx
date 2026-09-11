"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  createEmptyAgentState,
  loadStallionAgentState,
  markAgentReviewed,
  updateAgentDrafts,
} from "@/services/stallion-agent";
import type { StallionFormValues } from "@/types/stallion-form";
import {
  isGenerationStalled,
  presentGenerationStatus,
  type AgentDraftField,
  type FormAgentDrafts,
} from "@/types/stallion-agent";
import Button from "@/ui/Button";
import ErrorText from "@/ui/ErrorText";
import Spinner from "@/ui/Spinner";
import AgentDraftsSection from "./AgentDraftsSection";
import AgentFlagsSection from "./AgentFlagsSection";
import AgentRunStatePanel from "./AgentRunStatePanel";

/** How often to re-read the row while a run is in flight. */
const POLL_INTERVAL_MS = 5000;

/**
 * Milestone 17 review surface.
 *
 * Agent output is loaded and saved here directly rather than through
 * `StallionFormValues` and the `update_stallion_from_form` RPC. Two reasons:
 * the run state is polled server state, which react-hook-form is the wrong
 * place to keep; and the drafts are review scratch space, so folding them into
 * the profile's save path would drag the whole canonical record through a write
 * every time somebody tweaked a sentence of outreach copy.
 */
export default function AgentStepEditor() {
  const { watch } = useFormContext<StallionFormValues>();
  const stallionId = watch("id");

  const [state, setState] = useState(createEmptyAgentState);
  const [drafts, setDrafts] = useState<FormAgentDrafts>(state.drafts);
  const [dirty, setDirty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  /** Set when the agent ran in dry-run mode, which produces no writes at all. */
  const [dryRunNotice, setDryRunNotice] = useState(false);

  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [canGenerate, setCanGenerate] = useState(false);

  /**
   * Consecutive failed refreshes.
   *
   * Polling is the only thing that moves the panel out of "Generating…", so a
   * poll that keeps failing — the dev server restarted, the network dropped,
   * the session expired — would otherwise leave the button reading
   * "Generating…" forever beside an error message contradicting it, with no
   * way to retry. After a few failures we stop trusting the in-flight state.
   */
  const [pollFailures, setPollFailures] = useState(0);

  // Guards the poll against overwriting text the admin is part-way through
  // editing: a refresh replaces the saved run state either way, but only
  // rebases the textareas when there is nothing unsaved to lose.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const refresh = useCallback(async () => {
    if (!stallionId) {
      setLoading(false);
      return;
    }
    const result = await loadStallionAgentState(stallionId);
    if (!result.ok) {
      setLoadError(result.error);
      setPollFailures((count) => count + 1);
      setLoading(false);
      return;
    }
    setLoadError(null);
    setPollFailures(0);
    setState(result.state);
    if (!dirtyRef.current) {
      setDrafts(result.state.drafts);
    }
    setLoading(false);
  }, [stallionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!stallionId) return;
    let cancelled = false;
    fetch(`/api/stallions/${encodeURIComponent(stallionId)}/generate`)
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((payload: { configured?: boolean }) => {
        if (!cancelled) setCanGenerate(Boolean(payload?.configured));
      })
      .catch(() => {
        if (!cancelled) setCanGenerate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stallionId]);

  // Poll only while a run is genuinely in flight. A stalled run is excluded:
  // its status will never change on its own, so polling it would just be an
  // open-ended request loop against the database.
  const status = presentGenerationStatus(state.runState.generation_status);
  const stalled = isGenerationStalled(
    state.runState.generation_status,
    state.runState.generation_started_at
  );
  // Three consecutive failures is roughly fifteen seconds of silence at the
  // poll interval — long enough to not trip on one dropped request, short
  // enough that nobody sits watching a spinner that will never resolve.
  const contactLost = pollFailures >= 3;
  const inFlight = !status.terminal && !stalled && !contactLost;

  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  const handleDraftChange = (field: AgentDraftField, next: string) => {
    setDrafts((current) => ({ ...current, [field]: next }));
    setDirty(true);
  };

  const handleSaveDrafts = async () => {
    if (!stallionId) {
      setSaveError("Stallion id is missing.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await updateAgentDrafts(stallionId, drafts);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setDirty(false);
    setState((current) => ({ ...current, drafts }));
  };

  const handleDiscard = () => {
    setDrafts(state.drafts);
    setDirty(false);
    setSaveError(null);
  };

  const handleGenerate = async () => {
    if (!stallionId) return;
    setGenerating(true);
    setGenerateError(null);
    setDryRunNotice(false);
    try {
      const response = await fetch(
        `/api/stallions/${encodeURIComponent(stallionId)}/generate`,
        { method: "POST" }
      );
      const payload = await response.json().catch(() => null);

      // 202 means the run outlived the request and is still going. That is not
      // an error: the poll below picks up the agent's terminal write.
      if (!response.ok && response.status !== 202) {
        setGenerateError(
          (payload as { error?: string } | null)?.error ??
            "Failed to start generation."
        );
      } else if ((payload as { dryRun?: boolean } | null)?.dryRun === true) {
        // The run really happened; it just wrote nothing. Without saying so,
        // an unchanged panel is indistinguishable from a failure.
        setDryRunNotice(true);
      }
    } catch {
      setGenerateError("Failed to start generation.");
    } finally {
      setGenerating(false);
      await refresh();
    }
  };

  const handleMarkReviewed = async () => {
    if (!stallionId) return;
    setReviewing(true);
    setReviewError(null);
    const result = await markAgentReviewed(stallionId);
    setReviewing(false);
    if (!result.ok) {
      setReviewError(result.error);
      return;
    }
    await refresh();
  };

  if (!stallionId) {
    return (
      <p className="text-sm text-slate-500">
        Save this stallion first — the agent needs an existing record to write to.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner size="sm" />
        Loading agent output…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError ? <ErrorText>{loadError}</ErrorText> : null}

      <AgentRunStatePanel
        contactLost={contactLost}
        runState={state.runState}
        generating={generating}
        generateError={generateError}
        reviewing={reviewing}
        reviewError={reviewError}
        canGenerate={canGenerate}
        onGenerate={handleGenerate}
        onMarkReviewed={handleMarkReviewed}
      />

      {dryRunNotice ? (
        <p className="rounded-lg border border-sky-500/25 bg-sky-950/20 p-3 text-xs leading-relaxed text-sky-100/80">
          The agent ran in dry-run mode: it processed the evidence but wrote
          nothing, so the drafts and flags below are unchanged. Set
          DRY_RUN_DEFAULT to false on the agent to save real output.
        </p>
      ) : null}

      <AgentFlagsSection
        missingFlags={state.runState.missing_information_flags}
        conflictFlags={state.runState.conflict_flags}
      />

      <AgentDraftsSection
        group="overview"
        drafts={drafts}
        onChange={handleDraftChange}
      />

      <AgentDraftsSection
        group="outreach"
        drafts={drafts}
        onChange={handleDraftChange}
      />

      {/*
        Drafts save on their own action rather than with the wizard's Save.
        They are not part of the canonical profile write path, and an admin
        editing outreach copy should not have to publish a profile to keep it.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          disabled={!dirty}
          onClick={handleSaveDrafts}
        >
          Save drafts
        </Button>
        <Button
          variant="ghost"
          size="lg"
          disabled={!dirty || saving}
          onClick={handleDiscard}
        >
          Discard changes
        </Button>
        {dirty ? (
          <span className="text-xs text-amber-300/80">Unsaved draft edits</span>
        ) : null}
      </div>

      {saveError ? <ErrorText>{saveError}</ErrorText> : null}
    </div>
  );
}
