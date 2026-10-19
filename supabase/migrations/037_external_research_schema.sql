-- Sprint 10 — External Company Research.
-- Bounded, auditable research runs. Pipeline mutations stay on existing
-- sources / snapshots / claims / signals tables.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS last_researched_at timestamptz;

CREATE TABLE public.company_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_aliases_alias_check CHECK (length(trim(alias)) > 0),
  CONSTRAINT company_aliases_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id),
  CONSTRAINT company_aliases_workspace_alias_unique UNIQUE (workspace_id, alias)
);

CREATE TABLE public.external_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  requested_query text NOT NULL,
  normalized_query text NOT NULL,
  requested_country text,
  requested_industry text,
  time_horizon_months integer NOT NULL DEFAULT 24,
  resolved_company_id uuid,
  analysis_id uuid,
  research_run_id uuid,
  status text NOT NULL DEFAULT 'queued',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failure_reason text,
  failure_code text,
  source_count integer NOT NULL DEFAULT 0,
  accepted_source_count integer NOT NULL DEFAULT 0,
  rejected_source_count integer NOT NULL DEFAULT 0,
  unavailable_source_count integer NOT NULL DEFAULT 0,
  resolution_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_research_runs_query_check CHECK (length(trim(requested_query)) > 0),
  CONSTRAINT external_research_runs_horizon_check CHECK (time_horizon_months > 0 AND time_horizon_months <= 120),
  CONSTRAINT external_research_runs_status_check CHECK (status IN (
    'queued',
    'resolving_entity',
    'needs_user_resolution',
    'discovering_sources',
    'reviewing_sources',
    'ingesting_sources',
    'extracting_claims',
    'generating_signals',
    'generating_intelligence',
    'generating_opportunities',
    'generating_actions',
    'completed',
    'partial',
    'failed',
    'cancelled'
  )),
  CONSTRAINT external_research_runs_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT external_research_runs_company_workspace_fk
    FOREIGN KEY (resolved_company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id),
  CONSTRAINT external_research_runs_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id)
    REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT external_research_runs_run_workspace_fk
    FOREIGN KEY (research_run_id, workspace_id)
    REFERENCES public.research_runs (id, workspace_id)
);

CREATE TABLE public.external_source_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  research_run_id uuid NOT NULL,
  url text NOT NULL,
  normalized_url text NOT NULL,
  title text,
  publisher text NOT NULL,
  source_type text NOT NULL,
  source_tier integer NOT NULL,
  source_quality text NOT NULL,
  published_at date,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'discovered',
  rejection_reason text,
  canonical_url text,
  content_hash text,
  source_id uuid,
  snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_source_candidates_type_check CHECK (source_type IN (
    'official_page',
    'press_release',
    'annual_report',
    'sustainability_report',
    'earnings_release',
    'filing',
    'regulator',
    'news',
    'other'
  )),
  CONSTRAINT external_source_candidates_tier_check CHECK (source_tier BETWEEN 1 AND 4),
  CONSTRAINT external_source_candidates_quality_check CHECK (source_quality IN (
    'primary',
    'authoritative_secondary',
    'secondary',
    'weak'
  )),
  CONSTRAINT external_source_candidates_status_check CHECK (status IN (
    'discovered',
    'accepted',
    'rejected',
    'fetched',
    'failed',
    'unavailable'
  )),
  CONSTRAINT external_source_candidates_run_workspace_fk
    FOREIGN KEY (research_run_id, workspace_id)
    REFERENCES public.external_research_runs (id, workspace_id),
  CONSTRAINT external_source_candidates_source_workspace_fk
    FOREIGN KEY (source_id, workspace_id)
    REFERENCES public.sources (id, workspace_id),
  CONSTRAINT external_source_candidates_snapshot_workspace_fk
    FOREIGN KEY (snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

CREATE UNIQUE INDEX external_source_candidates_run_normalized_uidx
  ON public.external_source_candidates (research_run_id, normalized_url);

CREATE TABLE public.external_research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  research_run_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_research_events_run_workspace_fk
    FOREIGN KEY (research_run_id, workspace_id)
    REFERENCES public.external_research_runs (id, workspace_id)
);

CREATE INDEX external_research_runs_workspace_idx
  ON public.external_research_runs (workspace_id, created_at DESC);

CREATE INDEX external_research_runs_company_idx
  ON public.external_research_runs (resolved_company_id, created_at DESC);

CREATE INDEX external_source_candidates_run_idx
  ON public.external_source_candidates (research_run_id);

CREATE INDEX company_aliases_company_idx
  ON public.company_aliases (company_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.external_research_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
