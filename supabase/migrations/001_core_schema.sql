-- SIGNAL v0.2 Sprint 1 — core persistence schema
-- UUID PKs, text+CHECK statuses, composite FKs for tenant integrity.
-- Intelligence tables (evidence, claims, signals, opportunities, …) are intentionally absent.

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT 'BR',
  default_ui_locale text NOT NULL DEFAULT 'pt-BR',
  default_report_locale text NOT NULL DEFAULT 'pt-BR',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_country_code_len CHECK (char_length(country_code) = 2),
  CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'inactive'))
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users — not a second identity system)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  job_title text,
  avatar_url text,
  preferred_locale text NOT NULL DEFAULT 'pt-BR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- workspace_memberships
-- ---------------------------------------------------------------------------
CREATE TABLE public.workspace_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_memberships_role_check
    CHECK (role IN ('consultant', 'manager', 'partner', 'admin')),
  CONSTRAINT workspace_memberships_status_check
    CHECK (status IN ('active', 'invited', 'suspended')),
  CONSTRAINT workspace_memberships_workspace_user_unique UNIQUE (workspace_id, user_id)
);

-- ---------------------------------------------------------------------------
-- companies
-- Composite UNIQUE (id, workspace_id) lets child tables enforce tenant match.
-- ---------------------------------------------------------------------------
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  slug text NOT NULL,
  display_name text NOT NULL,
  primary_domain text,
  primary_website_url text,
  primary_country_code text,
  industry text,
  subindustry text,
  company_type text NOT NULL DEFAULT 'unknown',
  description text,
  resolution_status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT companies_country_code_len
    CHECK (primary_country_code IS NULL OR char_length(primary_country_code) = 2),
  CONSTRAINT companies_company_type_check
    CHECK (company_type IN ('public', 'private', 'state_owned', 'subsidiary', 'other', 'unknown')),
  CONSTRAINT companies_resolution_status_check
    CHECK (resolution_status IN ('pending', 'resolved', 'ambiguous', 'failed')),
  CONSTRAINT companies_workspace_slug_unique UNIQUE (workspace_id, slug),
  CONSTRAINT companies_id_workspace_unique UNIQUE (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- company_entities
-- Parent must belong to the same company (composite FK).
-- ---------------------------------------------------------------------------
CREATE TABLE public.company_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id),
  parent_entity_id uuid,
  entity_type text NOT NULL,
  display_name text NOT NULL,
  legal_name text,
  country_code text,
  state_region text,
  city text,
  address text,
  website_url text,
  operational_status text NOT NULL DEFAULT 'unknown',
  valid_from date,
  valid_to date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT company_entities_type_check CHECK (entity_type IN (
    'group',
    'legal_entity',
    'business_unit',
    'plant',
    'distribution_center',
    'mine',
    'office',
    'lab',
    'technology_center',
    'warehouse',
    'other'
  )),
  CONSTRAINT company_entities_country_code_len
    CHECK (country_code IS NULL OR char_length(country_code) = 2),
  CONSTRAINT company_entities_operational_status_check CHECK (operational_status IN (
    'active',
    'planned',
    'under_construction',
    'inactive',
    'closed',
    'unknown'
  )),
  CONSTRAINT company_entities_valid_range_check
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CONSTRAINT company_entities_id_company_unique UNIQUE (id, company_id),
  CONSTRAINT company_entities_parent_same_company_fk
    FOREIGN KEY (parent_entity_id, company_id)
    REFERENCES public.company_entities (id, company_id)
);

-- ---------------------------------------------------------------------------
-- analyses
-- workspace_id must match the company's workspace (composite FK).
-- ---------------------------------------------------------------------------
CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  company_id uuid NOT NULL,
  created_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  analysis_type text NOT NULL DEFAULT 'general_opportunity_scan',
  primary_country_code text NOT NULL DEFAULT 'BR',
  research_focus text NOT NULL DEFAULT 'general',
  additional_instructions text,
  ui_locale text NOT NULL DEFAULT 'pt-BR',
  report_locale text NOT NULL DEFAULT 'pt-BR',
  scope_start_date date,
  scope_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT analyses_status_check CHECK (status IN (
    'draft',
    'researching',
    'needs_review',
    'ready',
    'failed',
    'archived'
  )),
  CONSTRAINT analyses_type_check CHECK (analysis_type IN (
    'general_opportunity_scan',
    'capability_deep_dive',
    'site_deep_dive',
    'account_update'
  )),
  CONSTRAINT analyses_country_code_len CHECK (char_length(primary_country_code) = 2),
  CONSTRAINT analyses_research_focus_check CHECK (research_focus IN (
    'general',
    'manufacturing',
    'operational_excellence',
    'supply_chain',
    'cost_profitability',
    'procurement',
    'organization_transformation',
    'digital_ai',
    'other'
  )),
  CONSTRAINT analyses_scope_range_check CHECK (
    scope_end_date IS NULL
    OR scope_start_date IS NULL
    OR scope_end_date >= scope_start_date
  ),
  CONSTRAINT analyses_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT analyses_company_workspace_fk
    FOREIGN KEY (company_id, workspace_id)
    REFERENCES public.companies (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- research_runs
-- workspace_id must match the analysis workspace.
-- parent_run, when set, must belong to the same analysis and workspace.
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  analysis_id uuid NOT NULL,
  parent_run_id uuid,
  requested_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  run_type text NOT NULL DEFAULT 'initial',
  status text NOT NULL DEFAULT 'queued',
  objective text,
  current_stage text,
  progress_percent smallint NOT NULL DEFAULT 0,
  pipeline_version text NOT NULL,
  research_policy_version text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_runs_type_check CHECK (run_type IN (
    'initial',
    'deep_dive',
    'refinement',
    'challenge',
    'revalidation',
    'scheduled_update'
  )),
  CONSTRAINT research_runs_status_check CHECK (status IN (
    'queued',
    'planning',
    'researching',
    'processing',
    'validating',
    'completed',
    'failed',
    'cancelled'
  )),
  CONSTRAINT research_runs_stage_check CHECK (
    current_stage IS NULL OR current_stage IN (
      'entity_resolution',
      'research_planning',
      'source_discovery',
      'source_retrieval',
      'content_extraction',
      'claim_extraction',
      'evidence_validation',
      'signal_detection',
      'opportunity_mapping',
      'challenge',
      'quality_gate',
      'report_generation',
      'completed'
    )
  ),
  CONSTRAINT research_runs_progress_check
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT research_runs_id_analysis_workspace_unique UNIQUE (id, analysis_id, workspace_id),
  CONSTRAINT research_runs_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id)
    REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT research_runs_parent_same_analysis_fk
    FOREIGN KEY (parent_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- indexes (UNIQUE constraints already cover some of these lookups)
-- ---------------------------------------------------------------------------
CREATE INDEX workspace_memberships_workspace_user_idx
  ON public.workspace_memberships (workspace_id, user_id);

CREATE INDEX companies_workspace_id_idx
  ON public.companies (workspace_id);

CREATE INDEX companies_workspace_slug_idx
  ON public.companies (workspace_id, slug);

CREATE INDEX company_entities_company_id_idx
  ON public.company_entities (company_id);

CREATE INDEX company_entities_parent_entity_id_idx
  ON public.company_entities (parent_entity_id);

CREATE INDEX analyses_workspace_id_idx
  ON public.analyses (workspace_id);

CREATE INDEX analyses_company_id_idx
  ON public.analyses (company_id);

CREATE INDEX analyses_created_by_user_id_idx
  ON public.analyses (created_by_user_id);

CREATE INDEX analyses_status_idx
  ON public.analyses (status);

CREATE INDEX research_runs_analysis_id_idx
  ON public.research_runs (analysis_id);

CREATE INDEX research_runs_workspace_id_idx
  ON public.research_runs (workspace_id);

CREATE INDEX research_runs_status_idx
  ON public.research_runs (status);

CREATE INDEX research_runs_parent_run_id_idx
  ON public.research_runs (parent_run_id);
