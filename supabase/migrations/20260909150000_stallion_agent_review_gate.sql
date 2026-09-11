-- Milestone 17: force agent-generated profiles into the review queue.
--
-- The brief is explicit, twice over: the Generate action "sets needs_review to
-- true on completion", and "all agent-populated profiles remain in
-- draft/needs_review status until manually approved for publishing". Every
-- profile the agent touches is meant to be seen by a human before it can be
-- published.
--
-- The agent does not do that. generation.service.ts writes
--
--   needs_review: sanitizedGeneration.needs_review
--                 || warnings.length > 0
--                 || combinedConflicts.length > 0
--
-- so a run that completes cleanly writes `false`, and a cleanly generated
-- profile gets no review badge and slips straight past the gate. That is the
-- opposite of the requirement, and it fails silently: nothing is logged, the
-- row simply never appears in the review queue.
--
-- Why a trigger rather than fixing it in the admin's trigger route:
--
--   * The agent's write is the last write. Anything our route sets *before*
--     dispatching is overwritten by the agent when the run finishes.
--   * Setting it *after* the run means our route has to survive the whole run.
--     It cannot be relied on to: the agent is a Vercel function capped at 60s,
--     the run can outlive the HTTP request, and a generation triggered by any
--     other means (a CLI script, a backfill, a direct call) would bypass the
--     route entirely.
--
-- A trigger fires on the agent's own UPDATE regardless of who initiated it, so
-- the gate holds for every path into the table.
--
-- Safe to rerun.

CREATE OR REPLACE FUNCTION public.stallions_force_review_on_generation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only on a *transition* into a terminal generation state. Requiring the
  -- status to actually change is what keeps "Mark as reviewed" working: that
  -- action sets needs_review = false while leaving generation_status untouched,
  -- so this trigger does not fire and immediately undo it.
  IF NEW.generation_status IS DISTINCT FROM OLD.generation_status
     AND NEW.generation_status IN ('completed', 'completed_with_warnings', 'failed')
  THEN
    NEW.needs_review := true;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.stallions_force_review_on_generation() IS
  'Forces needs_review true whenever a generation run reaches a terminal state, including a clean completion the agent would otherwise mark as not needing review.';

DROP TRIGGER IF EXISTS stallions_force_review_on_generation ON public.stallions;
CREATE TRIGGER stallions_force_review_on_generation
BEFORE UPDATE OF generation_status ON public.stallions
FOR EACH ROW
EXECUTE FUNCTION public.stallions_force_review_on_generation();
