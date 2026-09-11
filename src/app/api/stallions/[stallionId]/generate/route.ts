import { NextResponse } from "next/server";
import { requireServerAuth, stallionPermissionFlags } from "@/services/auth.server";
import { isGenerationStalled } from "@/types/stallion-agent";

/**
 * Triggers a generation run for one stallion.
 *
 * This is a thin proxy in front of the agent service, which lives in a separate
 * repository and is deployed separately. The proxy exists so the browser never
 * holds the agent's address or credentials, and so an admin session is required
 * to spend money on a run.
 *
 * `AGENT_BASE_URL` being unset is a supported state, not a misconfiguration:
 * the admin UI is built and useful without a reachable agent — every draft and
 * canonical field is still reviewable and editable — and the Generate button
 * simply stays disabled until an address is supplied.
 */

/** How long to wait on the agent before handing the run back to the poller. */
const DISPATCH_TIMEOUT_MS = 55_000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ stallionId: string }> }
) {
  const { stallionId: rawId } = await params;
  const stallionId = rawId?.trim() ?? "";
  if (!stallionId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await requireServerAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.code === "NOT_AUTHENTICATED" ? 401 : 403 }
    );
  }

  const flags = await stallionPermissionFlags(auth.supabase, stallionId);
  if (!flags.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agentBaseUrl = process.env.AGENT_BASE_URL?.trim();
  if (!agentBaseUrl) {
    return NextResponse.json(
      {
        error:
          "Generation is not configured. Set AGENT_BASE_URL to the agent service address.",
      },
      { status: 501 }
    );
  }

  const { data: current, error: readError } = await auth.supabase
    .from("stallions")
    .select("generation_status, generation_started_at, needs_review")
    .eq("id", stallionId)
    .single();

  if (readError || !current) {
    return NextResponse.json(
      { error: readError?.message ?? "Stallion not found." },
      { status: 404 }
    );
  }

  const row = current as unknown as Record<string, unknown>;
  const status = typeof row.generation_status === "string" ? row.generation_status : "idle";
  const startedAt =
    typeof row.generation_started_at === "string" ? row.generation_started_at : null;
  // Kept so a run that writes nothing can be undone exactly, rather than
  // leaving the record asserting an outcome that never happened.
  const priorStatus = status;
  const priorNeedsReview = row.needs_review === true;

  // Refuse to start a second run on top of a live one — concurrent runs would
  // race each other's writes into the same columns. A run old enough to be
  // stalled is fair game, because the process behind it is almost certainly
  // gone and the admin would otherwise have no way to recover the record.
  if (status === "processing" && !isGenerationStalled(status, startedAt)) {
    return NextResponse.json(
      { error: "A generation run is already in progress for this stallion." },
      { status: 409 }
    );
  }

  // Claim the run before dispatching, so a second click lands on the 409 above
  // rather than starting a parallel run. `processing` is not a terminal status,
  // so this write does not trip the review-gate trigger.
  const startedIso = new Date().toISOString();
  const { error: claimError } = await auth.supabase
    .from("stallions")
    .update({
      generation_status: "processing",
      generation_started_at: startedIso,
    } as never)
    .eq("id", stallionId);

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // The agent verifies this against the project's JWKS before doing any work.
  // Forwarding the caller's own token rather than a shared secret means the
  // agent knows *who* asked, which is what a future authorisation check there
  // will need; it also avoids introducing a credential to distribute and rotate.
  const {
    data: { session },
  } = await auth.supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    // requireServerAuth passed, so there is a user; a missing access token
    // means the session cannot be forwarded and the agent would reject us.
    // Fail here rather than dispatching a request that cannot succeed.
    await auth.supabase
      .from("stallions")
      .update({ generation_status: priorStatus } as never)
      .eq("id", stallionId);
    return NextResponse.json(
      { error: "Could not read the current session to authorise the agent." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${agentBaseUrl.replace(/\/$/, "")}/api/stallions/${encodeURIComponent(stallionId)}/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ includeDrafts: true }),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      // The agent reported a definite failure, so record one. This write *does*
      // trip the review-gate trigger, which is intended: the brief wants a
      // failed run surfaced for attention rather than left silent.
      await auth.supabase
        .from("stallions")
        .update({
          generation_status: "failed",
          last_generated_at: new Date().toISOString(),
        } as never)
        .eq("id", stallionId);

      return NextResponse.json(
        {
          error:
            (payload as { error?: string } | null)?.error ??
            "The agent rejected the generation request.",
        },
        { status: 502 }
      );
    }

    // On a real run the agent has already written the terminal status, the
    // drafts, the flags and the canonical rows itself, and the row has moved
    // off `processing` on its own.
    //
    // A dry run has not: it executes the whole pipeline and deliberately writes
    // nothing, so the `processing` claimed above would sit there until the
    // stall detection aged it out fifteen minutes later, with the button
    // reading "Generating…" the entire time and the admin reasonably
    // concluding the feature is broken.
    //
    // So reconcile from what the agent *reported*: if the row is still at
    // `processing` once the agent has answered, no terminal write is coming and
    // it is this route's job to record the outcome. This also covers any future
    // case where the agent responds successfully but cannot write.
    const reported = payload as { status?: string; dry_run?: boolean } | null;
    const reportedStatus =
      typeof reported?.status === "string" ? reported.status : "completed";
    const wasDryRun = reported?.dry_run === true;

    const { data: after } = await auth.supabase
      .from("stallions")
      .select("generation_status")
      .eq("id", stallionId)
      .single();

    const stillProcessing =
      (after as { generation_status?: string } | null)?.generation_status ===
      "processing";

    if (stillProcessing) {
      if (wasDryRun) {
        // A dry run executes the pipeline and deliberately writes nothing, so
        // there is no outcome to record — only the claim to undo. Recording the
        // reported status here would mark the profile as carrying agent output
        // it does not have, and send a reviewer to empty drafts.
        //
        // `last_generated_at` is deliberately not touched: it means "when the
        // agent last produced output", which a dry run did not, and leaving it
        // alone is also what stops the review-gate trigger from firing.
        await auth.supabase
          .from("stallions")
          .update({
            generation_status: priorStatus,
            needs_review: priorNeedsReview,
          } as never)
          .eq("id", stallionId);
      } else {
        // A real run that answered without writing a terminal status of its
        // own; record what it reported so the row does not strand.
        await auth.supabase
          .from("stallions")
          .update({
            generation_status: reportedStatus,
            last_generated_at: new Date().toISOString(),
          } as never)
          .eq("id", stallionId);
      }
    }

    return NextResponse.json({
      status: wasDryRun ? priorStatus : reportedStatus,
      // Surfaced so the admin can tell "nothing changed because it was a dry
      // run" from "nothing changed because the agent found nothing".
      dryRun: wasDryRun,
      result: payload,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    if (timedOut) {
      // The run may well still be alive on the agent's side — the request
      // outlived our patience, not necessarily the work. Leaving the row at
      // `processing` lets the agent's own terminal write land normally, and the
      // admin UI polls for it. If the run really is dead, the stall detection
      // re-enables the button once `generation_started_at` ages out.
      return NextResponse.json(
        {
          status: "processing",
          message:
            "The run is taking longer than the request allows and is still in progress.",
        },
        { status: 202 }
      );
    }

    // Anything else — DNS failure, connection refused, TLS error — means the
    // run never started, so the claimed `processing` state would strand.
    await auth.supabase
      .from("stallions")
      .update({
        generation_status: "failed",
        last_generated_at: new Date().toISOString(),
      } as never)
      .eq("id", stallionId);

    return NextResponse.json(
      { error: "Could not reach the agent service." },
      { status: 502 }
    );
  }
}

/**
 * Reports whether generation is available in this environment.
 *
 * The admin UI needs to know this to decide whether the Generate button is
 * actionable, and `AGENT_BASE_URL` is deliberately server-only — publishing it
 * as a `NEXT_PUBLIC_` variable would put the agent's address, which has no
 * authentication in front of it, into every page's JavaScript bundle. Returning
 * a boolean keeps the address on the server.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stallionId: string }> }
) {
  const { stallionId: rawId } = await params;
  if (!rawId?.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await requireServerAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.code === "NOT_AUTHENTICATED" ? 401 : 403 }
    );
  }

  return NextResponse.json({
    configured: Boolean(process.env.AGENT_BASE_URL?.trim()),
  });
}
