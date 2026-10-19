-- SIGNAL v0.7 Sprint 7 — Opportunity Intelligence.
-- Structured commercial hypothesis over Signals + Account Intelligence + EFESO Fit.
-- Model proposes; pipeline validates; never treat inferred opportunity as observed fact.

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
  'efeso_fit_validation',
  'opportunity_generation',
  'opportunity_validation'
));

CREATE TABLE public.opportunity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid,
  proposed_title text NOT NULL,
  proposed_summary text NOT NULL,
  proposed_opportunity_type text NOT NULL,
  proposed_maturity text NOT NULL,
  proposed_relevance_level text NOT NULL,
  proposed_urgency_level text NOT NULL,
  proposed_confidence_tier text NOT NULL,
  proposed_assertion_mode text NOT NULL,
  proposed_rationale text NOT NULL,
  proposed_geography text,
  proposed_account_intelligence_id uuid,
  proposed_primary_efeso_fit_id uuid,
  proposed_parent_opportunity_id uuid,
  proposed_signal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_fit_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_knowledge_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_rationale_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidate_fingerprint text NOT NULL,
  generation_model_run_id uuid,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_opportunity_id uuid,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_candidates_title_check CHECK (length(trim(proposed_title)) > 0),
  CONSTRAINT opportunity_candidates_summary_check CHECK (length(trim(proposed_summary)) > 0),
  CONSTRAINT opportunity_candidates_rationale_check CHECK (length(trim(proposed_rationale)) > 0),
  CONSTRAINT opportunity_candidates_type_check CHECK (proposed_opportunity_type IN (
    'operational_excellence', 'asset_productivity', 'maintenance', 'ramp_up', 'capacity_optimization',
    'supply_chain', 'procurement', 'working_capital', 'cost_reduction', 'restructuring_support',
    'performance_management', 'digital_transformation', 'automation', 'sustainability', 'decarbonization',
    'organization_transformation', 'strategy_execution', 'quality', 'productivity',
    'transformation_management', 'other'
  )),
  CONSTRAINT opportunity_candidates_maturity_check CHECK (proposed_maturity IN ('emerging', 'developing', 'established')),
  CONSTRAINT opportunity_candidates_relevance_check CHECK (proposed_relevance_level IN ('low', 'medium', 'high')),
  CONSTRAINT opportunity_candidates_urgency_check CHECK (proposed_urgency_level IN ('low', 'medium', 'high')),
  CONSTRAINT opportunity_candidates_confidence_check CHECK (proposed_confidence_tier IN ('direct', 'supported', 'inferred')),
  CONSTRAINT opportunity_candidates_assertion_check CHECK (proposed_assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  )),
  CONSTRAINT opportunity_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT opportunity_candidates_fingerprint_unique
    UNIQUE (workspace_id, company_id, candidate_fingerprint),
  CONSTRAINT opportunity_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT opportunity_candidates_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT opportunity_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id) REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT opportunity_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT opportunity_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT opportunity_candidates_origin_run_workspace_fk
    FOREIGN KEY (generation_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX opportunity_candidates_company_idx
  ON public.opportunity_candidates (company_id, status);

CREATE TABLE public.opportunity_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  opportunity_candidate_id uuid NOT NULL,
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
  CONSTRAINT opportunity_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT opportunity_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT opportunity_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT opportunity_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT opportunity_candidate_validations_unique
    UNIQUE (opportunity_candidate_id, validation_round, validator_code),
  CONSTRAINT opportunity_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (opportunity_candidate_id, workspace_id)
    REFERENCES public.opportunity_candidates (id, workspace_id),
  CONSTRAINT opportunity_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id)
);

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  opportunity_type text NOT NULL,
  maturity text NOT NULL,
  relevance_level text NOT NULL,
  urgency_level text NOT NULL,
  confidence_tier text NOT NULL,
  assertion_mode text NOT NULL,
  geography text,
  account_intelligence_id uuid,
  primary_efeso_fit_id uuid,
  origin_opportunity_candidate_id uuid,
  origin_model_run_id uuid,
  parent_opportunity_id uuid,
  supersedes_opportunity_id uuid,
  dismissal_reason text,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_title_check CHECK (length(trim(title)) > 0),
  CONSTRAINT opportunities_summary_check CHECK (length(trim(summary)) > 0),
  CONSTRAINT opportunities_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived', 'dismissed'
  )),
  CONSTRAINT opportunities_type_check CHECK (opportunity_type IN (
    'operational_excellence', 'asset_productivity', 'maintenance', 'ramp_up', 'capacity_optimization',
    'supply_chain', 'procurement', 'working_capital', 'cost_reduction', 'restructuring_support',
    'performance_management', 'digital_transformation', 'automation', 'sustainability', 'decarbonization',
    'organization_transformation', 'strategy_execution', 'quality', 'productivity',
    'transformation_management', 'other'
  )),
  CONSTRAINT opportunities_maturity_check CHECK (maturity IN ('emerging', 'developing', 'established')),
  CONSTRAINT opportunities_relevance_check CHECK (relevance_level IN ('low', 'medium', 'high')),
  CONSTRAINT opportunities_urgency_check CHECK (urgency_level IN ('low', 'medium', 'high')),
  CONSTRAINT opportunities_confidence_check CHECK (confidence_tier IN ('direct', 'supported', 'inferred')),
  CONSTRAINT opportunities_assertion_check CHECK (assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  )),
  CONSTRAINT opportunities_dismissal_reason_check CHECK (
    dismissal_reason IS NULL OR dismissal_reason IN (
      'not_relevant', 'already_known', 'no_client_need', 'poor_fit', 'duplicate', 'outdated', 'other'
    )
  ),
  CONSTRAINT opportunities_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT opportunities_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT opportunities_account_intelligence_fk
    FOREIGN KEY (account_intelligence_id) REFERENCES public.account_intelligence (id),
  CONSTRAINT opportunities_primary_fit_fk
    FOREIGN KEY (primary_efeso_fit_id) REFERENCES public.efeso_fits (id),
  CONSTRAINT opportunities_origin_candidate_fk
    FOREIGN KEY (origin_opportunity_candidate_id) REFERENCES public.opportunity_candidates (id),
  CONSTRAINT opportunities_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT opportunities_parent_fk
    FOREIGN KEY (parent_opportunity_id) REFERENCES public.opportunities (id),
  CONSTRAINT opportunities_supersedes_fk
    FOREIGN KEY (supersedes_opportunity_id) REFERENCES public.opportunities (id)
);

CREATE UNIQUE INDEX opportunities_one_active_fingerprint_idx
  ON public.opportunities (workspace_id, company_id, ((metadata->>'fingerprint')))
  WHERE status = 'active' AND metadata ? 'fingerprint';

CREATE INDEX opportunities_workspace_status_idx ON public.opportunities (workspace_id, status);
CREATE INDEX opportunities_company_status_idx ON public.opportunities (company_id, status);
CREATE INDEX opportunities_type_idx ON public.opportunities (opportunity_type, status);
CREATE INDEX opportunities_relevance_idx ON public.opportunities (relevance_level, urgency_level, created_at DESC);

CREATE TABLE public.opportunity_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  opportunity_id uuid NOT NULL,
  signal_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_signals_relationship_check CHECK (relationship_type IN ('trigger', 'supporting', 'contextual')),
  CONSTRAINT opportunity_signals_unique UNIQUE (opportunity_id, signal_id),
  CONSTRAINT opportunity_signals_opportunity_workspace_fk
    FOREIGN KEY (opportunity_id, workspace_id) REFERENCES public.opportunities (id, workspace_id),
  CONSTRAINT opportunity_signals_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id) REFERENCES public.signals (id, workspace_id)
);

CREATE INDEX opportunity_signals_signal_idx ON public.opportunity_signals (signal_id);

CREATE TABLE public.opportunity_efeso_fits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  opportunity_id uuid NOT NULL,
  efeso_fit_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_efeso_fits_relationship_check CHECK (relationship_type IN ('primary', 'supporting')),
  CONSTRAINT opportunity_efeso_fits_unique UNIQUE (opportunity_id, efeso_fit_id),
  CONSTRAINT opportunity_efeso_fits_opportunity_workspace_fk
    FOREIGN KEY (opportunity_id, workspace_id) REFERENCES public.opportunities (id, workspace_id),
  CONSTRAINT opportunity_efeso_fits_fit_fk
    FOREIGN KEY (efeso_fit_id) REFERENCES public.efeso_fits (id)
);

CREATE TABLE public.opportunity_knowledge_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  opportunity_id uuid NOT NULL,
  knowledge_object_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_knowledge_objects_relationship_check CHECK (relationship_type IN (
    'capability', 'service', 'methodology', 'case', 'result', 'credential'
  )),
  CONSTRAINT opportunity_knowledge_objects_unique UNIQUE (opportunity_id, knowledge_object_id, relationship_type),
  CONSTRAINT opportunity_knowledge_objects_opportunity_workspace_fk
    FOREIGN KEY (opportunity_id, workspace_id) REFERENCES public.opportunities (id, workspace_id),
  CONSTRAINT opportunity_knowledge_objects_ko_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id)
);

CREATE TABLE public.opportunity_rationales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  opportunity_id uuid NOT NULL,
  rationale_type text NOT NULL,
  statement text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_rationales_type_check CHECK (rationale_type IN (
    'signal_trigger', 'account_context', 'efeso_relevance', 'supporting_case', 'urgency_reason', 'uncertainty'
  )),
  CONSTRAINT opportunity_rationales_statement_check CHECK (length(trim(statement)) > 0),
  CONSTRAINT opportunity_rationales_opportunity_workspace_fk
    FOREIGN KEY (opportunity_id, workspace_id) REFERENCES public.opportunities (id, workspace_id)
);

CREATE INDEX opportunity_rationales_opportunity_idx ON public.opportunity_rationales (opportunity_id);

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
