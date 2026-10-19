-- Research worker lock columns for browser-independent ticks (Signal v1.0).
ALTER TABLE public.external_research_runs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS worker_lock_until timestamptz,
  ADD COLUMN IF NOT EXISTS worker_heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS external_research_runs_worker_eligible_idx
  ON public.external_research_runs (status, worker_lock_until)
  WHERE status IN (
    'queued',
    'resolving_entity',
    'discovering_sources',
    'reviewing_sources',
    'ingesting_sources',
    'extracting_claims',
    'generating_signals',
    'generating_intelligence',
    'generating_opportunities',
    'generating_actions'
  );
