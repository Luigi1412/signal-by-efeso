-- SIGNAL v0.8 Sprint 8 — Relationship Intelligence + Recommended Actions.
-- Relationship is never inferred. unknown is a valid state.
-- Recommended Action is a structured suggestion, never an automatic outreach.

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
  'opportunity_validation',
  'relationship_action_generation',
  'relationship_action_validation'
));

CREATE TABLE public.relationship_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  display_name text NOT NULL,
  email text,
  organization text NOT NULL,
  role_title text,
  person_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relationship_persons_name_check CHECK (length(trim(display_name)) > 0),
  CONSTRAINT relationship_persons_org_check CHECK (length(trim(organization)) > 0),
  CONSTRAINT relationship_persons_type_check CHECK (person_type IN (
    'efeso_internal', 'client_contact', 'advisor', 'partner', 'other'
  )),
  CONSTRAINT relationship_persons_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT relationship_persons_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE INDEX relationship_persons_workspace_idx ON public.relationship_persons (workspace_id, status);

CREATE TABLE public.account_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  relationship_status text NOT NULL DEFAULT 'unknown',
  relationship_strength text NOT NULL DEFAULT 'unknown',
  data_quality text NOT NULL DEFAULT 'unknown',
  last_known_interaction_at timestamptz,
  relationship_summary text,
  source_type text NOT NULL,
  source_reference text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles (id),
  supersedes_relationship_id uuid,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_relationships_status_enum CHECK (relationship_status IN (
    'unknown', 'prospect', 'former_client', 'active_client', 'strategic_account', 'dormant'
  )),
  CONSTRAINT account_relationships_strength_enum CHECK (relationship_strength IN (
    'unknown', 'none', 'weak', 'medium', 'strong'
  )),
  CONSTRAINT account_relationships_quality_enum CHECK (data_quality IN ('unknown', 'partial', 'verified')),
  CONSTRAINT account_relationships_row_status CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT account_relationships_source_enum CHECK (source_type IN (
    'demo_seed', 'manual_admin_entry', 'existing_internal_data', 'imported_structured_data_future'
  )),
  CONSTRAINT account_relationships_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT account_relationships_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT account_relationships_supersedes_fk
    FOREIGN KEY (supersedes_relationship_id) REFERENCES public.account_relationships (id)
);

CREATE UNIQUE INDEX account_relationships_one_active_idx
  ON public.account_relationships (workspace_id, company_id)
  WHERE status = 'active';

CREATE INDEX account_relationships_company_idx ON public.account_relationships (company_id, status);

CREATE TABLE public.company_relationship_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  relationship_person_id uuid NOT NULL,
  relationship_role text NOT NULL,
  strength text NOT NULL DEFAULT 'unknown',
  last_interaction_at timestamptz,
  notes text,
  source_type text NOT NULL,
  source_reference text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_relationship_contacts_role_enum CHECK (relationship_role IN (
    'account_owner', 'sponsor', 'relationship_holder', 'executive_contact',
    'operational_contact', 'former_contact', 'unknown'
  )),
  CONSTRAINT company_relationship_contacts_strength_enum CHECK (strength IN (
    'unknown', 'weak', 'medium', 'strong'
  )),
  CONSTRAINT company_relationship_contacts_status_enum CHECK (status IN ('active', 'archived')),
  CONSTRAINT company_relationship_contacts_source_enum CHECK (source_type IN (
    'demo_seed', 'manual_admin_entry', 'existing_internal_data', 'imported_structured_data_future'
  )),
  CONSTRAINT company_relationship_contacts_notes_check CHECK (notes IS NULL OR length(notes) <= 280),
  CONSTRAINT company_relationship_contacts_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT company_relationship_contacts_person_workspace_fk
    FOREIGN KEY (relationship_person_id, workspace_id) REFERENCES public.relationship_persons (id, workspace_id)
);

CREATE UNIQUE INDEX company_relationship_contacts_active_unique
  ON public.company_relationship_contacts (company_id, relationship_person_id, relationship_role)
  WHERE status = 'active';

CREATE INDEX company_relationship_contacts_company_idx
  ON public.company_relationship_contacts (company_id, status);

CREATE TABLE public.recommended_action_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  opportunity_id uuid,
  proposed_action_type text NOT NULL,
  proposed_title text NOT NULL,
  proposed_rationale text NOT NULL,
  proposed_priority text NOT NULL,
  proposed_confidence_tier text NOT NULL,
  proposed_opportunity_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_relationship_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_knowledge_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_rationale_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidate_fingerprint text NOT NULL,
  generation_model_run_id uuid,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  promoted_action_id uuid,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommended_action_candidates_title_check CHECK (length(trim(proposed_title)) > 0),
  CONSTRAINT recommended_action_candidates_rationale_check CHECK (length(trim(proposed_rationale)) > 0),
  CONSTRAINT recommended_action_candidates_type_check CHECK (proposed_action_type IN (
    'validate_account_context', 'validate_relationship', 'reconnect_existing_relationship',
    'contact_account_owner', 'prepare_internal_brief', 'review_relevant_case',
    'align_internal_team', 'explore_client_need', 'prepare_meeting_hypothesis',
    'monitor_development', 'no_action', 'other'
  )),
  CONSTRAINT recommended_action_candidates_priority_check CHECK (proposed_priority IN ('low', 'medium', 'high')),
  CONSTRAINT recommended_action_candidates_confidence_check CHECK (proposed_confidence_tier IN ('direct', 'supported', 'inferred')),
  CONSTRAINT recommended_action_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT recommended_action_candidates_fingerprint_unique
    UNIQUE (workspace_id, company_id, candidate_fingerprint),
  CONSTRAINT recommended_action_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT recommended_action_candidates_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT recommended_action_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id) REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT recommended_action_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT recommended_action_candidates_origin_run_workspace_fk
    FOREIGN KEY (generation_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX recommended_action_candidates_company_idx
  ON public.recommended_action_candidates (company_id, status);

CREATE TABLE public.recommended_action_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  recommended_action_candidate_id uuid NOT NULL,
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
  CONSTRAINT recommended_action_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT recommended_action_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT recommended_action_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT recommended_action_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT recommended_action_candidate_validations_unique
    UNIQUE (recommended_action_candidate_id, validation_round, validator_code),
  CONSTRAINT recommended_action_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (recommended_action_candidate_id, workspace_id)
    REFERENCES public.recommended_action_candidates (id, workspace_id),
  CONSTRAINT recommended_action_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id)
);

CREATE TABLE public.recommended_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  opportunity_id uuid,
  action_type text NOT NULL,
  title text NOT NULL,
  rationale text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL,
  confidence_tier text NOT NULL,
  relationship_context_id uuid,
  origin_action_candidate_id uuid,
  origin_model_run_id uuid,
  supersedes_action_id uuid,
  dismissal_reason text,
  version integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommended_actions_title_check CHECK (length(trim(title)) > 0),
  CONSTRAINT recommended_actions_rationale_check CHECK (length(trim(rationale)) > 0),
  CONSTRAINT recommended_actions_type_check CHECK (action_type IN (
    'validate_account_context', 'validate_relationship', 'reconnect_existing_relationship',
    'contact_account_owner', 'prepare_internal_brief', 'review_relevant_case',
    'align_internal_team', 'explore_client_need', 'prepare_meeting_hypothesis',
    'monitor_development', 'no_action', 'other'
  )),
  CONSTRAINT recommended_actions_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'completed', 'dismissed', 'archived'
  )),
  CONSTRAINT recommended_actions_priority_check CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT recommended_actions_confidence_check CHECK (confidence_tier IN ('direct', 'supported', 'inferred')),
  CONSTRAINT recommended_actions_dismissal_reason_check CHECK (
    dismissal_reason IS NULL OR dismissal_reason IN (
      'not_relevant', 'already_done', 'relationship_changed', 'opportunity_changed', 'duplicate', 'outdated', 'other'
    )
  ),
  CONSTRAINT recommended_actions_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT recommended_actions_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id) REFERENCES public.companies (id, workspace_id),
  CONSTRAINT recommended_actions_opportunity_fk
    FOREIGN KEY (opportunity_id) REFERENCES public.opportunities (id),
  CONSTRAINT recommended_actions_relationship_fk
    FOREIGN KEY (relationship_context_id) REFERENCES public.account_relationships (id),
  CONSTRAINT recommended_actions_origin_candidate_fk
    FOREIGN KEY (origin_action_candidate_id) REFERENCES public.recommended_action_candidates (id),
  CONSTRAINT recommended_actions_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id) REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT recommended_actions_supersedes_fk
    FOREIGN KEY (supersedes_action_id) REFERENCES public.recommended_actions (id)
);

CREATE UNIQUE INDEX recommended_actions_one_active_fingerprint_idx
  ON public.recommended_actions (workspace_id, company_id, ((metadata->>'fingerprint')))
  WHERE status = 'active' AND metadata ? 'fingerprint';

CREATE INDEX recommended_actions_workspace_status_idx ON public.recommended_actions (workspace_id, status);
CREATE INDEX recommended_actions_company_status_idx ON public.recommended_actions (company_id, status);
CREATE INDEX recommended_actions_priority_idx ON public.recommended_actions (priority, created_at DESC);

CREATE TABLE public.recommended_action_opportunities (
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  action_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, opportunity_id, relationship_type),
  CONSTRAINT recommended_action_opportunities_type_check CHECK (relationship_type IN ('primary', 'supporting')),
  CONSTRAINT recommended_action_opportunities_action_workspace_fk
    FOREIGN KEY (action_id, workspace_id) REFERENCES public.recommended_actions (id, workspace_id),
  CONSTRAINT recommended_action_opportunities_opportunity_fk
    FOREIGN KEY (opportunity_id) REFERENCES public.opportunities (id)
);

CREATE TABLE public.recommended_action_relationships (
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  action_id uuid NOT NULL,
  account_relationship_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, account_relationship_id, relationship_type),
  CONSTRAINT recommended_action_relationships_type_check CHECK (relationship_type IN ('informs', 'target_context')),
  CONSTRAINT recommended_action_relationships_action_workspace_fk
    FOREIGN KEY (action_id, workspace_id) REFERENCES public.recommended_actions (id, workspace_id),
  CONSTRAINT recommended_action_relationships_rel_fk
    FOREIGN KEY (account_relationship_id) REFERENCES public.account_relationships (id)
);

CREATE TABLE public.recommended_action_knowledge_objects (
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  action_id uuid NOT NULL,
  knowledge_object_id uuid NOT NULL,
  relationship_type text NOT NULL DEFAULT 'supporting',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, knowledge_object_id, relationship_type),
  CONSTRAINT recommended_action_knowledge_type_check CHECK (relationship_type IN ('supporting', 'case', 'brief')),
  CONSTRAINT recommended_action_knowledge_action_workspace_fk
    FOREIGN KEY (action_id, workspace_id) REFERENCES public.recommended_actions (id, workspace_id),
  CONSTRAINT recommended_action_knowledge_object_fk
    FOREIGN KEY (knowledge_object_id) REFERENCES public.efeso_knowledge_objects (id)
);

CREATE TABLE public.recommended_action_rationales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  action_id uuid NOT NULL,
  rationale_type text NOT NULL,
  statement text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommended_action_rationales_type_check CHECK (rationale_type IN (
    'opportunity_context', 'relationship_context', 'urgency_context', 'efeso_context', 'uncertainty'
  )),
  CONSTRAINT recommended_action_rationales_statement_check CHECK (length(trim(statement)) > 0),
  CONSTRAINT recommended_action_rationales_action_workspace_fk
    FOREIGN KEY (action_id, workspace_id) REFERENCES public.recommended_actions (id, workspace_id)
);

CREATE TABLE public.recommended_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  action_id uuid NOT NULL,
  actor_user_id uuid REFERENCES public.profiles (id),
  from_status text,
  to_status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommended_action_events_action_workspace_fk
    FOREIGN KEY (action_id, workspace_id) REFERENCES public.recommended_actions (id, workspace_id)
);

CREATE TRIGGER account_relationships_updated_at
  BEFORE UPDATE ON public.account_relationships
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER relationship_persons_updated_at
  BEFORE UPDATE ON public.relationship_persons
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER recommended_actions_updated_at
  BEFORE UPDATE ON public.recommended_actions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
