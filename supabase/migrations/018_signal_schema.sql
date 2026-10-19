-- SIGNAL v0.5 Sprint 5 — Signal Engine.
-- Structured interpretation of claims/evidence. Model proposes; pipeline validates.

ALTER TABLE public.model_runs DROP CONSTRAINT model_runs_task_type_check;
ALTER TABLE public.model_runs ADD CONSTRAINT model_runs_task_type_check CHECK (task_type IN (
  'claim_extraction',
  'claim_grounding_validation',
  'claim_semantic_validation',
  'claim_escalation',
  'knowledge_extraction',
  'knowledge_validation',
  'signal_extraction',
  'signal_validation'
));

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships m
      WHERE m.workspace_id = p_workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- signal_candidates
-- ---------------------------------------------------------------------------
CREATE TABLE public.signal_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid,
  proposed_signal_type text NOT NULL,
  proposed_signal_nature text NOT NULL,
  proposed_title text NOT NULL,
  proposed_summary text NOT NULL,
  proposed_importance text NOT NULL,
  proposed_assertion_mode text NOT NULL DEFAULT 'unspecified',
  proposed_confidence_tier text,
  proposed_event_date date,
  proposed_effective_period_start date,
  proposed_effective_period_end date,
  proposed_geography text,
  proposed_metric_name text,
  proposed_numeric_value numeric,
  proposed_unit text,
  proposed_currency_code text,
  proposed_core_event text NOT NULL,
  proposed_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_parent_signal_id uuid,
  candidate_fingerprint text NOT NULL,
  extraction_model_run_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_signal_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_candidates_type_check CHECK (proposed_signal_type IN (
    'capex_investment', 'expansion', 'new_facility', 'plant_closure', 'acquisition',
    'divestment', 'merger', 'leadership_change', 'restructuring', 'cost_reduction_program',
    'workforce_change', 'supply_chain_change', 'capacity_increase', 'capacity_reduction',
    'production_ramp_up', 'maintenance_shutdown', 'digital_transformation', 'automation_program',
    'sustainability_program', 'decarbonization', 'operational_issue', 'quality_issue',
    'financial_pressure', 'regulatory_change', 'partnership', 'new_market_entry',
    'strategic_plan', 'performance_improvement', 'performance_decline', 'other'
  )),
  CONSTRAINT signal_candidates_nature_check CHECK (proposed_signal_nature IN ('event', 'state')),
  CONSTRAINT signal_candidates_importance_check CHECK (proposed_importance IN ('low', 'medium', 'high')),
  CONSTRAINT signal_candidates_assertion_mode_check CHECK (proposed_assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  )),
  CONSTRAINT signal_candidates_confidence_check CHECK (
    proposed_confidence_tier IS NULL OR proposed_confidence_tier IN ('direct', 'supported', 'mixed')
  ),
  CONSTRAINT signal_candidates_title_check CHECK (length(trim(proposed_title)) > 0),
  CONSTRAINT signal_candidates_summary_check CHECK (length(trim(proposed_summary)) > 0),
  CONSTRAINT signal_candidates_core_event_check CHECK (length(trim(proposed_core_event)) > 0),
  CONSTRAINT signal_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT signal_candidates_fingerprint_unique
    UNIQUE (workspace_id, company_id, candidate_fingerprint),
  CONSTRAINT signal_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT signal_candidates_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id),
  CONSTRAINT signal_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id)
    REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT signal_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT signal_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT signal_candidates_origin_run_workspace_fk
    FOREIGN KEY (extraction_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX signal_candidates_workspace_idx ON public.signal_candidates (workspace_id);
CREATE INDEX signal_candidates_company_idx ON public.signal_candidates (company_id);
CREATE INDEX signal_candidates_status_idx ON public.signal_candidates (status);

CREATE TABLE public.signal_candidate_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_candidate_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_candidate_claims_relationship_check CHECK (relationship_type IN (
    'primary_evidence', 'supporting_evidence', 'contextual_evidence'
  )),
  CONSTRAINT signal_candidate_claims_unique UNIQUE (signal_candidate_id, claim_id, relationship_type),
  CONSTRAINT signal_candidate_claims_candidate_workspace_fk
    FOREIGN KEY (signal_candidate_id, workspace_id)
    REFERENCES public.signal_candidates (id, workspace_id),
  CONSTRAINT signal_candidate_claims_claim_workspace_fk
    FOREIGN KEY (claim_id, workspace_id)
    REFERENCES public.claims (id, workspace_id)
);

CREATE TABLE public.signal_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_candidate_id uuid NOT NULL,
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
  CONSTRAINT signal_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT signal_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT signal_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT signal_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT signal_candidate_validations_unique
    UNIQUE (signal_candidate_id, validation_round, validator_code),
  CONSTRAINT signal_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (signal_candidate_id, workspace_id)
    REFERENCES public.signal_candidates (id, workspace_id),
  CONSTRAINT signal_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- signals
-- ---------------------------------------------------------------------------
CREATE TABLE public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_nature text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  importance text NOT NULL,
  confidence_tier text NOT NULL,
  assertion_mode text NOT NULL DEFAULT 'unspecified',
  event_date date,
  effective_period_start date,
  effective_period_end date,
  geography text,
  metric_name text,
  numeric_value numeric,
  unit text,
  currency_code text,
  signal_fingerprint text NOT NULL,
  source_snapshot_id uuid,
  origin_signal_candidate_id uuid,
  origin_model_run_id uuid,
  parent_signal_id uuid,
  supersedes_signal_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signals_type_check CHECK (signal_type IN (
    'capex_investment', 'expansion', 'new_facility', 'plant_closure', 'acquisition',
    'divestment', 'merger', 'leadership_change', 'restructuring', 'cost_reduction_program',
    'workforce_change', 'supply_chain_change', 'capacity_increase', 'capacity_reduction',
    'production_ramp_up', 'maintenance_shutdown', 'digital_transformation', 'automation_program',
    'sustainability_program', 'decarbonization', 'operational_issue', 'quality_issue',
    'financial_pressure', 'regulatory_change', 'partnership', 'new_market_entry',
    'strategic_plan', 'performance_improvement', 'performance_decline', 'other'
  )),
  CONSTRAINT signals_nature_check CHECK (signal_nature IN ('event', 'state')),
  CONSTRAINT signals_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT signals_importance_check CHECK (importance IN ('low', 'medium', 'high')),
  CONSTRAINT signals_confidence_check CHECK (confidence_tier IN ('direct', 'supported', 'mixed')),
  CONSTRAINT signals_assertion_mode_check CHECK (assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  )),
  CONSTRAINT signals_title_check CHECK (length(trim(title)) > 0),
  CONSTRAINT signals_summary_check CHECK (length(trim(summary)) > 0),
  CONSTRAINT signals_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT signals_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id),
  CONSTRAINT signals_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT signals_origin_candidate_workspace_fk
    FOREIGN KEY (origin_signal_candidate_id, workspace_id)
    REFERENCES public.signal_candidates (id, workspace_id),
  CONSTRAINT signals_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT signals_parent_workspace_fk
    FOREIGN KEY (parent_signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id),
  CONSTRAINT signals_supersedes_workspace_fk
    FOREIGN KEY (supersedes_signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id)
);

CREATE UNIQUE INDEX signals_origin_candidate_uidx
  ON public.signals (origin_signal_candidate_id)
  WHERE origin_signal_candidate_id IS NOT NULL;

CREATE UNIQUE INDEX signals_active_fingerprint_uidx
  ON public.signals (workspace_id, company_id, signal_fingerprint)
  WHERE status = 'active';

CREATE INDEX signals_workspace_status_idx ON public.signals (workspace_id, status);
CREATE INDEX signals_company_idx ON public.signals (company_id);
CREATE INDEX signals_type_idx ON public.signals (signal_type);
CREATE INDEX signals_event_date_idx ON public.signals (event_date);

ALTER TABLE public.signal_candidates
  ADD CONSTRAINT signal_candidates_promoted_signal_fk
  FOREIGN KEY (promoted_signal_id, workspace_id)
  REFERENCES public.signals (id, workspace_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.signal_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_claims_relationship_check CHECK (relationship_type IN (
    'primary_evidence', 'supporting_evidence', 'contextual_evidence'
  )),
  CONSTRAINT signal_claims_unique UNIQUE (signal_id, claim_id, relationship_type),
  CONSTRAINT signal_claims_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id),
  CONSTRAINT signal_claims_claim_workspace_fk
    FOREIGN KEY (claim_id, workspace_id)
    REFERENCES public.claims (id, workspace_id)
);

CREATE TABLE public.signal_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_id uuid NOT NULL,
  company_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_companies_role_check CHECK (role IN (
    'primary', 'acquirer', 'target', 'partner', 'supplier', 'customer', 'affected'
  )),
  CONSTRAINT signal_companies_unique UNIQUE (signal_id, company_id),
  CONSTRAINT signal_companies_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id),
  CONSTRAINT signal_companies_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id)
);

CREATE UNIQUE INDEX signal_companies_one_primary_uidx
  ON public.signal_companies (signal_id)
  WHERE role = 'primary';

CREATE TABLE public.signal_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.knowledge_tags (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_tags_unique UNIQUE (signal_id, tag_id),
  CONSTRAINT signal_tags_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id)
    REFERENCES public.signals (id, workspace_id)
);
