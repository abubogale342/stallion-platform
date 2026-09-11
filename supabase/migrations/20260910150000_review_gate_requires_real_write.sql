-- Milestone 17: the review gate must only fire on a run that actually wrote.
--
-- The original trigger forced needs_review true on any transition into a
-- terminal generation_status. That was right for the case it was written for —
-- the agent finishing a run and clearing its own flag on a clean result — but
-- it also fires on a status write that carries no output at all.
--
-- The case that exposed it: the admin trigger route claims a run by setting
-- 'processing' before dispatch, and has to put the status back afterwards or
-- the row strands. When the agent ran in dry-run mode it produced nothing, yet
-- restoring the status tripped this trigger and marked the profile as carrying
-- unreviewed agent output. A reviewer would open it to find empty drafts, no
-- flags and no confidence score — the record asserting something about itself
-- that was not true.
--
-- Requiring last_generated_at to move as well separates the two. Every real
-- terminal write sets it: the agent stamps it on completion and on failure, and
-- so does the admin route when it records a dispatch failure. A status restore
-- deliberately leaves it alone, and so no longer claims a review is owed.
--
-- Safe to rerun.

CREATE OR REPLACE FUNCTION public.stallions_force_review_on_generation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.generation_status IS DISTINCT FROM OLD.generation_status
     AND NEW.generation_status IN ('completed', 'completed_with_warnings', 'failed')
     -- A terminal status without a fresh timestamp is bookkeeping, not output.
     AND NEW.last_generated_at IS DISTINCT FROM OLD.last_generated_at
  THEN
    NEW.needs_review := true;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.stallions_force_review_on_generation() IS
  'Forces needs_review true when a generation run reaches a terminal state AND stamps a new last_generated_at, so a status restore that wrote no output cannot claim a review is owed.';
