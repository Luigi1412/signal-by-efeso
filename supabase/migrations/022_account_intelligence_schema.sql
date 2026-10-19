-- SIGNAL v0.6 Sprint 6 — Account Intelligence.
-- Structured account narrative over active Signals. Model proposes; pipeline validates.

ALTER TABLE public.model_runs DROP CONSTRAINT model_runs_task_type_check;
ALTER TABLE public.model_runs ADD CONSTRAINT model_runs_task_type_check CHECK (task_type IN (
  'claim_extraction',
  'claim_grounding_validation',
  'claim_semantic_validation',
  'claim_escalation',
  'knowledge_extraction',
  'knowledge_validation',
  'signal_extraction',
  'signal_validation',
  'account_intelligence_generation',
  'account_intelligence_validation',
  'efeso_fit_generation',
  'efeso_fit_validation'
));

CREATE TABLE public.account_intelligence_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid,
  proposed_headline text NOT NULL,
  proposed_executive_summary text NOT NULL,
  proposed_strategic_direction text,
  proposed_pressure_summary text,
  proposed_investment_summary text,
  proposed_operating_context_summary text,
  proposed_risk_summary text,
  proposed_change_summary text,
  proposed_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_period_start date,
  proposed_period_end date,
  proposed_tensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_signal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidate_fingerprint text NOT NULL,
  extraction_model_run_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_account_intelligence_id uuid,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_intelligence_candidates_headline_check CHECK (length(trim(proposed_headline)) > 0),
  CONSTRAINT account_intelligence_candidates_summary_check CHECK (length(trim(proposed_executive_summary)) > 0),
  CONSTRAINT account_intelligence_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT account_intelligence_candidates_fingerprint_unique
    UNIQUE (workspace_id, company_id, candidate_fingerprint),
  CONSTRAINT account_intelligence_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT account_intelligence_candidates_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT account_intelligence_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id) REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT account_intelligence_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT account_intelligence_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT account_intelligence_candidates_origin_run_workspace_fk
    FOREIGN KEY (extraction_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX account_intelligence_candidates_company_idx
  ON public.account_intelligence_candidates (company_id, status);

CREATE TABLE public.account_intelligence_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  account_intelligence_candidate_id uuid NOT NULL,
  validation_round integer NOT NULL DEFAULT 1,
  validator_code text NOT NULL,
  validator_version text NOT NULL,
  validator_type text NOT NULL,
  result text NOT NULL,
  severity text NOT NULL,
  model_run_id uuid,
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_intelligence_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT account_intelligence_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT account_intelligence_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT account_intelligence_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT account_intelligence_candidate_validations_unique
    UNIQUE (account_intelligence_candidate_id, validation_round, validator_code),
  CONSTRAINT account_intelligence_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (account_intelligence_candidate_id, workspace_id)
    REFERENCES public.account_intelligence_candidates (id, workspace_id),
  CONSTRAINT account_intelligence_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE TABLE public.account_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz NOT NULL DEFAULT now(),
  period_start date,
  period_end date,
  headline text NOT NULL,
  executive_summary text NOT NULL,
  strategic_direction text,
  pressure_summary text,
  investment_summary text,
  operating_context_summary text,
  risk_summary text,
  change_summary text,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin_model_run_id uuid,
  origin_candidate_id uuid,
  version integer NOT NULL DEFAULT 1,
  supersedes_account_intelligence_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_intelligence_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT account_intelligence_headline_check CHECK (length(trim(headline)) > 0),
  CONSTRAINT account_intelligence_summary_check CHECK (length(trim(executive_summary)) > 0),
  CONSTRAINT account_intelligence_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT account_intelligence_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT account_intelligence_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT account_intelligence_origin_candidate_workspace_fk
    FOREIGN KEY (origin_candidate_id, workspace_id)
    REFERENCES public.account_intelligence_candidates (id, workspace_id),
  CONSTRAINT account_intelligence_supersedes_workspace_fk
    FOREIGN KEY (supersedes_account_intelligence_id, workspace_id)
    REFERENCES public.account_intelligence (id, workspace_id)
);

CREATE UNIQUE INDEX account_intelligence_one_active_uidx
  ON public.account_intelligence (workspace_id, company_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX account_intelligence_origin_candidate_uidx
  ON public.account_intelligence (origin_candidate_id)
  WHERE origin_candidate_id IS NOT NULL;

CREATE INDEX account_intelligence_company_status_idx
  ON public.account_intelligence (company_id, status);

ALTER TABLE public.account_intelligence_candidates
  ADD CONSTRAINT account_intelligence_candidates_promoted_fk
  FOREIGN KEY (promoted_account_intelligence_id, workspace_id)
  REFERENCES public.account_intelligence (id, workspace_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.account_intelligence
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.account_intelligence_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  account_intelligence_id uuid NOT NULL,
  signal_id uuid NOT NULL,
  relationship_type text NOT NULL,
  weight integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_intelligence_signals_relationship_check CHECK (relationship_type IN (
    'primary', 'supporting', 'contextual'
  )),
  CONSTRAINT account_intelligence_signals_weight_check CHECK (weight >= 0 AND weight <= 20),
  CONSTRAINT account_intelligence_signals_unique UNIQUE (account_intelligence_id, signal_id),
  CONSTRAINT account_intelligence_signals_ai_workspace_fk
    FOREIGN KEY (account_intelligence_id, workspace_id)
    REFERENCES public.account_intelligence (id, workspace_id),
  CONSTRAINT account_intelligence_signals_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id)
);

CREATE TABLE public.account_tensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  account_intelligence_id uuid NOT NULL,
  signal_a_id uuid NOT NULL,
  signal_b_id uuid NOT NULL,
  tension_type text NOT NULL,
  explanation text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_tensions_type_check CHECK (tension_type IN (
    'growth_vs_cost_pressure',
    'expansion_vs_restructuring',
    'capacity_vs_demand_pressure',
    'investment_vs_financial_constraint',
    'sustainability_vs_operational_constraint',
    'leadership_change_during_transformation',
    'other'
  )),
  CONSTRAINT account_tensions_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT account_tensions_not_self CHECK (signal_a_id <> signal_b_id),
  CONSTRAINT account_tensions_explanation_check CHECK (length(trim(explanation)) > 0),
  CONSTRAINT account_tensions_unique UNIQUE (account_intelligence_id, signal_a_id, signal_b_id, tension_type),
  CONSTRAINT account_tensions_ai_workspace_fk
    FOREIGN KEY (account_intelligence_id, workspace_id)
    REFERENCES public.account_intelligence (id, workspace_id),
  CONSTRAINT account_tensions_signal_a_workspace_fk
    FOREIGN KEY (signal_a_id, workspace_id) REFERENCES public.signals (id, workspace_id),
  CONSTRAINT account_tensions_signal_b_workspace_fk
    FOREIGN KEY (signal_b_id, workspace_id) REFERENCES public.signals (id, workspace_id)
);

CREATE TABLE public.account_intelligence_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  account_intelligence_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.knowledge_tags (id),
  signal_count integer NOT NULL,
  weighted_importance text NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_intelligence_themes_count_check CHECK (signal_count > 0),
  CONSTRAINT account_intelligence_themes_importance_check CHECK (weighted_importance IN ('low', 'medium', 'high')),
  CONSTRAINT account_intelligence_themes_unique UNIQUE (account_intelligence_id, tag_id),
  CONSTRAINT account_intelligence_themes_ai_workspace_fk
    FOREIGN KEY (account_intelligence_id, workspace_id)
    REFERENCES public.account_intelligence (id, workspace_id)
);
