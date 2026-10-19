-- SIGNAL v0.6 Sprint 6 — Explainable EFESO Fit.
-- Signals + EFESO Knowledge. Deterministic components are the authority.

CREATE TABLE public.efeso_fit_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  knowledge_object_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid,
  proposed_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_rationale text NOT NULL,
  proposed_fit_level text NOT NULL,
  proposed_fit_score integer NOT NULL,
  candidate_fingerprint text NOT NULL,
  model_run_id uuid,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_fit_id uuid,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT efeso_fit_candidates_rationale_check CHECK (length(trim(proposed_rationale)) > 0),
  CONSTRAINT efeso_fit_candidates_level_check CHECK (proposed_fit_level IN ('low', 'medium', 'high')),
  CONSTRAINT efeso_fit_candidates_score_check CHECK (proposed_fit_score >= 0 AND proposed_fit_score <= 20),
  CONSTRAINT efeso_fit_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT efeso_fit_candidates_fingerprint_unique
    UNIQUE (workspace_id, company_id, knowledge_object_id, candidate_fingerprint),
  CONSTRAINT efeso_fit_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT efeso_fit_candidates_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT efeso_fit_candidates_knowledge_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT efeso_fit_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id) REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT efeso_fit_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT efeso_fit_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT efeso_fit_candidates_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX efeso_fit_candidates_company_idx ON public.efeso_fit_candidates (company_id, status);

CREATE TABLE public.efeso_fit_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  efeso_fit_candidate_id uuid NOT NULL,
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
  CONSTRAINT efeso_fit_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT efeso_fit_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT efeso_fit_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT efeso_fit_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT efeso_fit_candidate_validations_unique
    UNIQUE (efeso_fit_candidate_id, validation_round, validator_code),
  CONSTRAINT efeso_fit_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (efeso_fit_candidate_id, workspace_id)
    REFERENCES public.efeso_fit_candidates (id, workspace_id),
  CONSTRAINT efeso_fit_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id)
);

CREATE TABLE public.efeso_fits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  knowledge_object_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  fit_level text NOT NULL,
  fit_score integer,
  fit_reason_summary text NOT NULL,
  origin_model_run_id uuid,
  origin_candidate_id uuid,
  version integer NOT NULL DEFAULT 1,
  supersedes_fit_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT efeso_fits_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT efeso_fits_level_check CHECK (fit_level IN ('low', 'medium', 'high')),
  CONSTRAINT efeso_fits_score_check CHECK (fit_score IS NULL OR (fit_score >= 0 AND fit_score <= 20)),
  CONSTRAINT efeso_fits_reason_check CHECK (length(trim(fit_reason_summary)) > 0),
  CONSTRAINT efeso_fits_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT efeso_fits_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT efeso_fits_knowledge_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT efeso_fits_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT efeso_fits_origin_candidate_workspace_fk
    FOREIGN KEY (origin_candidate_id, workspace_id)
    REFERENCES public.efeso_fit_candidates (id, workspace_id),
  CONSTRAINT efeso_fits_supersedes_workspace_fk
    FOREIGN KEY (supersedes_fit_id, workspace_id) REFERENCES public.efeso_fits (id, workspace_id)
);

CREATE UNIQUE INDEX efeso_fits_one_active_uidx
  ON public.efeso_fits (workspace_id, company_id, knowledge_object_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX efeso_fits_origin_candidate_uidx
  ON public.efeso_fits (origin_candidate_id)
  WHERE origin_candidate_id IS NOT NULL;

CREATE INDEX efeso_fits_company_status_idx ON public.efeso_fits (company_id, status);

ALTER TABLE public.efeso_fit_candidates
  ADD CONSTRAINT efeso_fit_candidates_promoted_fk
  FOREIGN KEY (promoted_fit_id, workspace_id)
  REFERENCES public.efeso_fits (id, workspace_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.efeso_fits
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.efeso_fit_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  efeso_fit_id uuid NOT NULL,
  component_type text NOT NULL,
  component_value text NOT NULL,
  contribution integer NOT NULL,
  explanation text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT efeso_fit_components_type_check CHECK (component_type IN (
    'industry_match',
    'capability_match',
    'business_problem_match',
    'geography_match',
    'signal_type_match',
    'methodology_match',
    'case_relevance',
    'credential_relevance',
    'result_relevance',
    'recurring_theme_match'
  )),
  CONSTRAINT efeso_fit_components_source_type_check CHECK (source_type IN (
    'knowledge_tag',
    'knowledge_object',
    'signal',
    'account_theme',
    'company'
  )),
  CONSTRAINT efeso_fit_components_contribution_check CHECK (contribution >= 0 AND contribution <= 5),
  CONSTRAINT efeso_fit_components_value_check CHECK (length(trim(component_value)) > 0),
  CONSTRAINT efeso_fit_components_explanation_check CHECK (length(trim(explanation)) > 0),
  CONSTRAINT efeso_fit_components_fit_workspace_fk
    FOREIGN KEY (efeso_fit_id, workspace_id) REFERENCES public.efeso_fits (id, workspace_id)
);

CREATE INDEX efeso_fit_components_fit_idx ON public.efeso_fit_components (efeso_fit_id);

CREATE TABLE public.signal_knowledge_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  signal_id uuid NOT NULL,
  knowledge_object_id uuid NOT NULL,
  match_type text NOT NULL,
  match_strength text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  explanation text NOT NULL,
  origin_fit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_knowledge_matches_type_check CHECK (match_type IN (
    'industry',
    'capability',
    'business_problem',
    'methodology',
    'case',
    'result',
    'credential',
    'geography',
    'theme'
  )),
  CONSTRAINT signal_knowledge_matches_strength_check CHECK (match_strength IN ('weak', 'medium', 'strong')),
  CONSTRAINT signal_knowledge_matches_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT signal_knowledge_matches_explanation_check CHECK (length(trim(explanation)) > 0),
  CONSTRAINT signal_knowledge_matches_unique UNIQUE (signal_id, knowledge_object_id, match_type),
  CONSTRAINT signal_knowledge_matches_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT signal_knowledge_matches_signal_workspace_fk
    FOREIGN KEY (signal_id, workspace_id) REFERENCES public.signals (id, workspace_id),
  CONSTRAINT signal_knowledge_matches_knowledge_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT signal_knowledge_matches_fit_workspace_fk
    FOREIGN KEY (origin_fit_id, workspace_id) REFERENCES public.efeso_fits (id, workspace_id)
);

CREATE INDEX signal_knowledge_matches_signal_idx ON public.signal_knowledge_matches (signal_id, status);
CREATE INDEX signal_knowledge_matches_knowledge_idx ON public.signal_knowledge_matches (knowledge_object_id, status);
