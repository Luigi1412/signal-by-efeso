-- SIGNAL v0.2 Sprint 2 — evidence foundation schema.
-- Source ≠ Evidence ≠ Claim. Snapshots are immutable. No hard-delete of intelligence.

-- ---------------------------------------------------------------------------
-- sources — stable identity of a source (not a capture)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  canonical_url text,
  domain text,
  publisher_name text NOT NULL,
  source_type text NOT NULL,
  source_tier text NOT NULL,
  is_primary_source boolean NOT NULL DEFAULT false,
  language_code text,
  country_code text,
  access_type text NOT NULL DEFAULT 'public',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT sources_type_check CHECK (source_type IN (
    'annual_report',
    'earnings_release',
    'investor_presentation',
    'regulatory_filing',
    'corporate_page',
    'corporate_press_release',
    'government',
    'industry_association',
    'trade_press',
    'business_press',
    'news',
    'job_posting',
    'linkedin_company',
    'linkedin_person',
    'partner_supplier',
    'academic',
    'internal_efeso',
    'other'
  )),
  CONSTRAINT sources_tier_check CHECK (source_tier IN ('A', 'B', 'C', 'D', 'E')),
  CONSTRAINT sources_access_type_check CHECK (access_type IN (
    'public',
    'workspace_internal',
    'restricted'
  )),
  CONSTRAINT sources_country_code_len
    CHECK (country_code IS NULL OR char_length(country_code) = 2),
  CONSTRAINT sources_seen_range_check CHECK (last_seen_at >= first_seen_at),
  CONSTRAINT sources_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE UNIQUE INDEX sources_workspace_canonical_url_uidx
  ON public.sources (workspace_id, canonical_url)
  WHERE canonical_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- research_run_sources — how a Source participated in a ResearchRun
-- ---------------------------------------------------------------------------
CREATE TABLE public.research_run_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  research_run_id uuid NOT NULL,
  source_id uuid NOT NULL,
  research_wave text NOT NULL,
  disposition text NOT NULL DEFAULT 'discovered',
  ranking_score numeric,
  discovery_method text NOT NULL DEFAULT 'manual',
  discard_reason text,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_run_sources_wave_check CHECK (research_wave IN (
    'corporate_truth',
    'brazil_truth',
    'strategic_signals',
    'operational_signals',
    'market_context',
    'opportunity_specific',
    'challenge',
    'manual'
  )),
  CONSTRAINT research_run_sources_disposition_check CHECK (disposition IN (
    'discovered',
    'retained',
    'discarded',
    'duplicate'
  )),
  CONSTRAINT research_run_sources_discovery_method_check CHECK (discovery_method IN (
    'manual',
    'search',
    'crawler',
    'api',
    'upload',
    'other'
  )),
  CONSTRAINT research_run_sources_run_source_unique UNIQUE (research_run_id, source_id),
  CONSTRAINT research_run_sources_run_workspace_fk
    FOREIGN KEY (research_run_id, workspace_id)
    REFERENCES public.research_runs (id, workspace_id),
  CONSTRAINT research_run_sources_source_workspace_fk
    FOREIGN KEY (source_id, workspace_id)
    REFERENCES public.sources (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- source_snapshots — immutable capture of a Source at a moment
-- SHA-256 content_hash is computed server-side (file bytes, else UTF-8 text).
-- ---------------------------------------------------------------------------
CREATE TABLE public.source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  source_id uuid NOT NULL,
  captured_by_research_run_id uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  publication_date date,
  title text,
  author text,
  language_code text,
  content_hash text NOT NULL,
  mime_type text,
  page_count integer,
  snapshot_mode text NOT NULL,
  storage_key text,
  normalized_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_snapshots_page_count_check
    CHECK (page_count IS NULL OR page_count > 0),
  CONSTRAINT source_snapshots_mode_check CHECK (snapshot_mode IN (
    'full',
    'partial',
    'metadata_only'
  )),
  CONSTRAINT source_snapshots_source_hash_unique UNIQUE (source_id, content_hash),
  CONSTRAINT source_snapshots_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT source_snapshots_source_workspace_fk
    FOREIGN KEY (source_id, workspace_id)
    REFERENCES public.sources (id, workspace_id),
  CONSTRAINT source_snapshots_run_workspace_fk
    FOREIGN KEY (captured_by_research_run_id, workspace_id)
    REFERENCES public.research_runs (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- evidence_fragments — exact fragment of a snapshot
-- ---------------------------------------------------------------------------
CREATE TABLE public.evidence_fragments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  source_snapshot_id uuid NOT NULL,
  fragment_type text NOT NULL,
  excerpt text NOT NULL,
  context_before text,
  context_after text,
  page_number integer,
  section_title text,
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_method text NOT NULL DEFAULT 'manual',
  extraction_confidence smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_fragments_type_check CHECK (fragment_type IN (
    'quote',
    'paragraph',
    'table_cell',
    'table_row',
    'chart',
    'headline',
    'caption',
    'metadata',
    'other'
  )),
  CONSTRAINT evidence_fragments_excerpt_check CHECK (length(trim(excerpt)) > 0),
  CONSTRAINT evidence_fragments_page_number_check
    CHECK (page_number IS NULL OR page_number > 0),
  CONSTRAINT evidence_fragments_extraction_method_check CHECK (extraction_method IN (
    'manual',
    'parser',
    'llm',
    'ocr',
    'api',
    'other'
  )),
  CONSTRAINT evidence_fragments_extraction_confidence_check
    CHECK (extraction_confidence IS NULL OR (extraction_confidence BETWEEN 0 AND 100)),
  CONSTRAINT evidence_fragments_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT evidence_fragments_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- claims — one atomic assertion
-- claim_type / verification_status / review_status / claim_status stay distinct.
-- ---------------------------------------------------------------------------
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  analysis_id uuid NOT NULL,
  originating_research_run_id uuid NOT NULL,
  company_id uuid NOT NULL,
  entity_id uuid,
  statement text NOT NULL,
  claim_category text NOT NULL,
  claim_type text NOT NULL DEFAULT 'fact',
  verification_status text NOT NULL DEFAULT 'unverified',
  review_status text NOT NULL DEFAULT 'pending',
  claim_status text NOT NULL DEFAULT 'active',
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
  confidence_score smallint,
  confidence_method_version text,
  supersedes_claim_id uuid,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claims_statement_check CHECK (length(trim(statement)) > 0),
  CONSTRAINT claims_category_check CHECK (claim_category IN (
    'financial',
    'strategy',
    'manufacturing',
    'capacity',
    'headcount',
    'investment',
    'supply_chain',
    'procurement',
    'leadership',
    'regulatory',
    'sustainability',
    'market',
    'other'
  )),
  CONSTRAINT claims_type_check CHECK (claim_type IN (
    'fact',
    'derived',
    'hypothesis',
    'client_confirmed'
  )),
  CONSTRAINT claims_verification_status_check CHECK (verification_status IN (
    'unverified',
    'supported',
    'corroborated',
    'conflicted',
    'rejected'
  )),
  CONSTRAINT claims_review_status_check CHECK (review_status IN (
    'pending',
    'approved',
    'rejected',
    'needs_review'
  )),
  CONSTRAINT claims_status_check CHECK (claim_status IN (
    'active',
    'superseded',
    'rejected',
    'archived'
  )),
  CONSTRAINT claims_geography_level_check CHECK (
    geography_level IS NULL OR geography_level IN (
      'global',
      'region',
      'country',
      'state',
      'city',
      'site',
      'entity',
      'not_applicable'
    )
  ),
  CONSTRAINT claims_country_code_len
    CHECK (country_code IS NULL OR char_length(country_code) = 2),
  CONSTRAINT claims_period_type_check CHECK (
    period_type IS NULL OR period_type IN (
      'instant',
      'month',
      'quarter',
      'semester',
      'year',
      'range',
      'as_of',
      'not_applicable'
    )
  ),
  CONSTRAINT claims_period_range_check CHECK (
    period_end IS NULL OR period_start IS NULL OR period_end >= period_start
  ),
  CONSTRAINT claims_currency_code_len
    CHECK (currency_code IS NULL OR char_length(currency_code) = 3),
  CONSTRAINT claims_scale_check CHECK (
    scale IS NULL OR scale IN ('unit', 'thousand', 'million', 'billion', 'trillion')
  ),
  CONSTRAINT claims_confidence_score_check
    CHECK (confidence_score IS NULL OR (confidence_score BETWEEN 0 AND 100)),
  CONSTRAINT claims_supersedes_not_self CHECK (
    supersedes_claim_id IS NULL OR supersedes_claim_id <> id
  ),
  CONSTRAINT claims_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT claims_id_workspace_analysis_company_unique
    UNIQUE (id, workspace_id, analysis_id, company_id),
  CONSTRAINT claims_analysis_workspace_company_fk
    FOREIGN KEY (analysis_id, workspace_id, company_id)
    REFERENCES public.analyses (id, workspace_id, company_id),
  CONSTRAINT claims_run_analysis_workspace_fk
    FOREIGN KEY (originating_research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT claims_entity_company_fk
    FOREIGN KEY (entity_id, company_id)
    REFERENCES public.company_entities (id, company_id)
);

ALTER TABLE public.claims
  ADD CONSTRAINT claims_supersedes_same_scope_fk
  FOREIGN KEY (supersedes_claim_id, workspace_id, analysis_id, company_id)
  REFERENCES public.claims (id, workspace_id, analysis_id, company_id);

-- ---------------------------------------------------------------------------
-- claim_evidence — Claim ↔ EvidenceFragment
-- ---------------------------------------------------------------------------
CREATE TABLE public.claim_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  claim_id uuid NOT NULL,
  evidence_fragment_id uuid NOT NULL,
  relationship text NOT NULL,
  directness text NOT NULL,
  relevance_score smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_evidence_relationship_check CHECK (relationship IN (
    'supports',
    'contradicts',
    'contextualizes'
  )),
  CONSTRAINT claim_evidence_directness_check CHECK (directness IN (
    'direct',
    'strong_indirect',
    'weak_indirect'
  )),
  CONSTRAINT claim_evidence_relevance_score_check
    CHECK (relevance_score IS NULL OR (relevance_score BETWEEN 0 AND 100)),
  CONSTRAINT claim_evidence_claim_fragment_relationship_unique
    UNIQUE (claim_id, evidence_fragment_id, relationship),
  CONSTRAINT claim_evidence_claim_workspace_fk
    FOREIGN KEY (claim_id, workspace_id)
    REFERENCES public.claims (id, workspace_id),
  CONSTRAINT claim_evidence_fragment_workspace_fk
    FOREIGN KEY (evidence_fragment_id, workspace_id)
    REFERENCES public.evidence_fragments (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- updated_at — only for mutable Source identity
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
CREATE INDEX sources_workspace_id_idx ON public.sources (workspace_id);
CREATE INDEX sources_workspace_type_idx ON public.sources (workspace_id, source_type);
CREATE INDEX sources_workspace_tier_idx ON public.sources (workspace_id, source_tier);

CREATE INDEX research_run_sources_run_id_idx ON public.research_run_sources (research_run_id);
CREATE INDEX research_run_sources_source_id_idx ON public.research_run_sources (source_id);
CREATE INDEX research_run_sources_workspace_id_idx ON public.research_run_sources (workspace_id);

CREATE INDEX source_snapshots_source_id_idx ON public.source_snapshots (source_id);
CREATE INDEX source_snapshots_workspace_id_idx ON public.source_snapshots (workspace_id);
CREATE INDEX source_snapshots_content_hash_idx ON public.source_snapshots (content_hash);

CREATE INDEX evidence_fragments_snapshot_id_idx ON public.evidence_fragments (source_snapshot_id);
CREATE INDEX evidence_fragments_workspace_id_idx ON public.evidence_fragments (workspace_id);

CREATE INDEX claims_analysis_id_idx ON public.claims (analysis_id);
CREATE INDEX claims_company_id_idx ON public.claims (company_id);
CREATE INDEX claims_workspace_id_idx ON public.claims (workspace_id);
CREATE INDEX claims_originating_run_id_idx ON public.claims (originating_research_run_id);
CREATE INDEX claims_verification_status_idx ON public.claims (verification_status);
CREATE INDEX claims_review_status_idx ON public.claims (review_status);
CREATE INDEX claims_claim_status_idx ON public.claims (claim_status);
CREATE INDEX claims_entity_id_idx ON public.claims (entity_id);

CREATE INDEX claim_evidence_claim_id_idx ON public.claim_evidence (claim_id);
CREATE INDEX claim_evidence_fragment_id_idx ON public.claim_evidence (evidence_fragment_id);
