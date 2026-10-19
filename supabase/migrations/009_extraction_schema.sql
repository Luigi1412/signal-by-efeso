-- SIGNAL v0.3 Sprint 3 — controlled intelligence extraction schema.
-- Model proposes. Pipeline validates. Only then Signal accepts.

-- ---------------------------------------------------------------------------
-- source_content_blocks — deterministic parser output of an immutable snapshot
-- ---------------------------------------------------------------------------
CREATE TABLE public.source_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  source_snapshot_id uuid NOT NULL,
  block_index integer NOT NULL,
  block_type text NOT NULL,
  text_content text NOT NULL,
  content_hash text NOT NULL,
  page_number integer,
  section_title text,
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  parser_name text NOT NULL,
  parser_version text NOT NULL,
  parse_confidence smallint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_content_blocks_index_check CHECK (block_index >= 0),
  CONSTRAINT source_content_blocks_type_check CHECK (block_type IN (
    'heading', 'paragraph', 'table', 'list', 'caption', 'header', 'footer', 'other'
  )),
  CONSTRAINT source_content_blocks_text_check CHECK (length(trim(text_content)) > 0),
  CONSTRAINT source_content_blocks_page_check CHECK (page_number IS NULL OR page_number > 0),
  CONSTRAINT source_content_blocks_confidence_check
    CHECK (parse_confidence IS NULL OR (parse_confidence BETWEEN 0 AND 100)),
  CONSTRAINT source_content_blocks_parser_index_unique
    UNIQUE (source_snapshot_id, parser_name, parser_version, block_index),
  CONSTRAINT source_content_blocks_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT source_content_blocks_id_workspace_snapshot_unique
    UNIQUE (id, workspace_id, source_snapshot_id),
  CONSTRAINT source_content_blocks_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

CREATE INDEX source_content_blocks_snapshot_idx ON public.source_content_blocks (source_snapshot_id);
CREATE INDEX source_content_blocks_workspace_idx ON public.source_content_blocks (workspace_id);

-- ---------------------------------------------------------------------------
-- model_runs — audit every AI execution
-- ---------------------------------------------------------------------------
CREATE TABLE public.model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid,
  task_type text NOT NULL,
  provider text NOT NULL,
  model_name text NOT NULL,
  model_version text,
  provider_response_id text,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  status text NOT NULL,
  input_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_hash text NOT NULL,
  output_hash text,
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT model_runs_task_type_check CHECK (task_type IN (
    'claim_extraction',
    'claim_grounding_validation',
    'claim_semantic_validation',
    'claim_escalation'
  )),
  CONSTRAINT model_runs_status_check CHECK (status IN (
    'running', 'completed', 'failed', 'incomplete', 'cancelled'
  )),
  CONSTRAINT model_runs_input_tokens_check CHECK (input_tokens IS NULL OR input_tokens >= 0),
  CONSTRAINT model_runs_cached_input_tokens_check
    CHECK (cached_input_tokens IS NULL OR cached_input_tokens >= 0),
  CONSTRAINT model_runs_output_tokens_check CHECK (output_tokens IS NULL OR output_tokens >= 0),
  CONSTRAINT model_runs_latency_check CHECK (latency_ms IS NULL OR latency_ms >= 0),
  CONSTRAINT model_runs_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT model_runs_id_scope_unique
    UNIQUE (id, workspace_id, analysis_id, research_run_id),
  CONSTRAINT model_runs_id_snapshot_scope_unique
    UNIQUE (id, workspace_id, analysis_id, research_run_id, source_snapshot_id),
  CONSTRAINT model_runs_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id)
    REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT model_runs_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT model_runs_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

CREATE INDEX model_runs_analysis_idx ON public.model_runs (analysis_id);
CREATE INDEX model_runs_workspace_idx ON public.model_runs (workspace_id);
CREATE INDEX model_runs_research_run_idx ON public.model_runs (research_run_id);
CREATE INDEX model_runs_snapshot_idx ON public.model_runs (source_snapshot_id);

-- ---------------------------------------------------------------------------
-- claim_candidates — proposed assertions, not yet Signal knowledge
-- company_id is required so entity FKs and Claim origin stay in-company.
-- ---------------------------------------------------------------------------
CREATE TABLE public.claim_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  company_id uuid NOT NULL,
  source_snapshot_id uuid NOT NULL,
  origin_model_run_id uuid NOT NULL,
  candidate_fingerprint text NOT NULL,
  proposed_statement text NOT NULL,
  claim_category text NOT NULL,
  claim_type text NOT NULL,
  assertion_mode text NOT NULL DEFAULT 'unspecified',
  entity_id uuid,
  geography_level text,
  country_code text,
  state_region text,
  city text,
  period_type text,
  period_start date,
  period_end date,
  as_of_date date,
  metric_name text,
  numeric_value numeric,
  unit text,
  currency_code text,
  scale text,
  model_extraction_confidence smallint,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  validated_at timestamptz,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_candidates_statement_check CHECK (length(trim(proposed_statement)) > 0),
  CONSTRAINT claim_candidates_category_check CHECK (claim_category IN (
    'financial', 'strategy', 'manufacturing', 'capacity', 'headcount', 'investment',
    'supply_chain', 'procurement', 'leadership', 'regulatory', 'sustainability', 'market', 'other'
  )),
  CONSTRAINT claim_candidates_type_check CHECK (claim_type IN (
    'fact', 'derived', 'hypothesis', 'client_confirmed'
  )),
  CONSTRAINT claim_candidates_assertion_mode_check CHECK (assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  )),
  CONSTRAINT claim_candidates_geography_level_check CHECK (
    geography_level IS NULL OR geography_level IN (
      'global', 'region', 'country', 'state', 'city', 'site', 'entity', 'not_applicable'
    )
  ),
  CONSTRAINT claim_candidates_country_code_len
    CHECK (country_code IS NULL OR char_length(country_code) = 2),
  CONSTRAINT claim_candidates_period_type_check CHECK (
    period_type IS NULL OR period_type IN (
      'instant', 'month', 'quarter', 'semester', 'year', 'range', 'as_of', 'not_applicable'
    )
  ),
  CONSTRAINT claim_candidates_period_range_check CHECK (
    period_end IS NULL OR period_start IS NULL OR period_end >= period_start
  ),
  CONSTRAINT claim_candidates_currency_code_len
    CHECK (currency_code IS NULL OR char_length(currency_code) = 3),
  CONSTRAINT claim_candidates_scale_check CHECK (
    scale IS NULL OR scale IN ('unit', 'thousand', 'million', 'billion', 'trillion')
  ),
  CONSTRAINT claim_candidates_confidence_check
    CHECK (model_extraction_confidence IS NULL OR (model_extraction_confidence BETWEEN 0 AND 100)),
  CONSTRAINT claim_candidates_status_check CHECK (status IN (
    'pending_validation', 'needs_review', 'validated', 'rejected', 'promoted'
  )),
  CONSTRAINT claim_candidates_fingerprint_unique UNIQUE (source_snapshot_id, candidate_fingerprint),
  CONSTRAINT claim_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT claim_candidates_id_workspace_analysis_unique UNIQUE (id, workspace_id, analysis_id),
  CONSTRAINT claim_candidates_id_workspace_analysis_company_unique
    UNIQUE (id, workspace_id, analysis_id, company_id),
  CONSTRAINT claim_candidates_id_workspace_snapshot_unique UNIQUE (id, workspace_id, source_snapshot_id),
  CONSTRAINT claim_candidates_analysis_company_fk
    FOREIGN KEY (analysis_id, workspace_id, company_id)
    REFERENCES public.analyses (id, workspace_id, company_id),
  CONSTRAINT claim_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT claim_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT claim_candidates_origin_run_scope_fk
    FOREIGN KEY (origin_model_run_id, workspace_id, analysis_id, research_run_id, source_snapshot_id)
    REFERENCES public.model_runs (id, workspace_id, analysis_id, research_run_id, source_snapshot_id),
  CONSTRAINT claim_candidates_entity_company_fk
    FOREIGN KEY (entity_id, company_id)
    REFERENCES public.company_entities (id, company_id)
);

CREATE INDEX claim_candidates_analysis_idx ON public.claim_candidates (analysis_id);
CREATE INDEX claim_candidates_workspace_idx ON public.claim_candidates (workspace_id);
CREATE INDEX claim_candidates_status_idx ON public.claim_candidates (status);
CREATE INDEX claim_candidates_snapshot_idx ON public.claim_candidates (source_snapshot_id);

-- ---------------------------------------------------------------------------
-- claim_candidate_evidence — citations to parser blocks
-- ---------------------------------------------------------------------------
CREATE TABLE public.claim_candidate_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  claim_candidate_id uuid NOT NULL,
  source_content_block_id uuid NOT NULL,
  source_snapshot_id uuid NOT NULL,
  origin_model_run_id uuid NOT NULL,
  citation_order integer NOT NULL DEFAULT 0,
  exact_quote text NOT NULL,
  char_start integer,
  char_end integer,
  relationship text NOT NULL DEFAULT 'supports',
  proposed_directness text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_candidate_evidence_order_check CHECK (citation_order >= 0),
  CONSTRAINT claim_candidate_evidence_quote_check CHECK (length(trim(exact_quote)) > 0),
  CONSTRAINT claim_candidate_evidence_char_start_check CHECK (char_start IS NULL OR char_start >= 0),
  CONSTRAINT claim_candidate_evidence_char_end_check CHECK (char_end IS NULL OR char_end >= 0),
  CONSTRAINT claim_candidate_evidence_char_range_check
    CHECK (char_end IS NULL OR char_start IS NULL OR char_end >= char_start),
  CONSTRAINT claim_candidate_evidence_relationship_check CHECK (relationship IN ('supports', 'contextualizes')),
  CONSTRAINT claim_candidate_evidence_directness_check CHECK (
    proposed_directness IS NULL OR proposed_directness IN ('direct', 'strong_indirect', 'weak_indirect')
  ),
  CONSTRAINT claim_candidate_evidence_unique
    UNIQUE (claim_candidate_id, source_content_block_id, origin_model_run_id, exact_quote),
  CONSTRAINT claim_candidate_evidence_candidate_snapshot_fk
    FOREIGN KEY (claim_candidate_id, workspace_id, source_snapshot_id)
    REFERENCES public.claim_candidates (id, workspace_id, source_snapshot_id),
  CONSTRAINT claim_candidate_evidence_block_snapshot_fk
    FOREIGN KEY (source_content_block_id, workspace_id, source_snapshot_id)
    REFERENCES public.source_content_blocks (id, workspace_id, source_snapshot_id),
  CONSTRAINT claim_candidate_evidence_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX claim_candidate_evidence_candidate_idx ON public.claim_candidate_evidence (claim_candidate_id);
CREATE INDEX claim_candidate_evidence_block_idx ON public.claim_candidate_evidence (source_content_block_id);

-- ---------------------------------------------------------------------------
-- claim_candidate_validations — QA ledger
-- ---------------------------------------------------------------------------
CREATE TABLE public.claim_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  claim_candidate_id uuid NOT NULL,
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
  CONSTRAINT claim_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT claim_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT claim_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT claim_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT claim_candidate_validations_unique
    UNIQUE (claim_candidate_id, validation_round, validator_code),
  CONSTRAINT claim_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (claim_candidate_id, workspace_id)
    REFERENCES public.claim_candidates (id, workspace_id),
  CONSTRAINT claim_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE INDEX claim_candidate_validations_candidate_idx
  ON public.claim_candidate_validations (claim_candidate_id);

-- ---------------------------------------------------------------------------
-- claims — assertion_mode + origin candidate
-- ---------------------------------------------------------------------------
ALTER TABLE public.claims
  ADD COLUMN assertion_mode text NOT NULL DEFAULT 'unspecified',
  ADD COLUMN origin_claim_candidate_id uuid;

ALTER TABLE public.claims
  ADD CONSTRAINT claims_assertion_mode_check CHECK (assertion_mode IN (
    'reported_actual', 'announced', 'planned', 'expected', 'target', 'estimated', 'conditional', 'unspecified'
  ));

CREATE UNIQUE INDEX claims_origin_candidate_uidx
  ON public.claims (origin_claim_candidate_id)
  WHERE origin_claim_candidate_id IS NOT NULL;

ALTER TABLE public.claims
  ADD CONSTRAINT claims_origin_candidate_scope_fk
  FOREIGN KEY (origin_claim_candidate_id, workspace_id, analysis_id, company_id)
  REFERENCES public.claim_candidates (id, workspace_id, analysis_id, company_id);

-- ---------------------------------------------------------------------------
-- evidence_fragments — optional parser-block linkage
-- ---------------------------------------------------------------------------
ALTER TABLE public.evidence_fragments
  ADD COLUMN source_content_block_id uuid,
  ADD COLUMN char_start integer,
  ADD COLUMN char_end integer;

ALTER TABLE public.evidence_fragments
  ADD CONSTRAINT evidence_fragments_char_start_check CHECK (char_start IS NULL OR char_start >= 0),
  ADD CONSTRAINT evidence_fragments_char_end_check CHECK (char_end IS NULL OR char_end >= 0),
  ADD CONSTRAINT evidence_fragments_char_range_check
    CHECK (char_end IS NULL OR char_start IS NULL OR char_end >= char_start);

ALTER TABLE public.evidence_fragments
  ADD CONSTRAINT evidence_fragments_block_snapshot_fk
  FOREIGN KEY (source_content_block_id, workspace_id, source_snapshot_id)
  REFERENCES public.source_content_blocks (id, workspace_id, source_snapshot_id);
