-- Milestone 17: record when a generation run was triggered.
--
-- The agent writes `generation_status = 'processing'` at the start of a run but
-- only stamps `last_generated_at` on a terminal outcome (completed,
-- completed_with_warnings, failed). That is fine while runs finish, and useless
-- when one does not: the agent is deployed as a Vercel function with
-- `maxDuration: 60`, so a long run is killed by the platform without ever
-- reaching its own error handler. The row is then pinned at 'processing'
-- forever, the admin's Generate button spins forever, and there is no timestamp
-- anywhere to prove the run is dead.
--
-- This column is written by *our* trigger route, not by the agent, at the
-- moment the request is dispatched. It gives the admin UI something to age the
-- 'processing' state against so it can offer a retry (see
-- `isGenerationStalled` in src/types/stallion-agent.ts).
--
-- Deliberately separate from `last_generated_at` rather than reusing it: that
-- column means "when the agent last finished", and overloading it with "when we
-- last started" would break the agent's own writes, which set it unconditionally
-- on completion.
--
-- Safe to rerun.

ALTER TABLE public.stallions
  ADD COLUMN IF NOT EXISTS generation_started_at timestamptz;

COMMENT ON COLUMN public.stallions.generation_started_at IS
  'Set by the admin trigger route when a generation run is dispatched. Used to detect runs stranded in processing; the agent never writes this.';
