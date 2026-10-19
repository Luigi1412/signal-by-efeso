-- SIGNAL v0.4 Sprint 4 — EFESO Knowledge.
-- Structured, typed, source-linked institutional knowledge. Model proposes; pipeline validates.

ALTER TABLE public.model_runs DROP CONSTRAINT model_runs_task_type_check;
ALTER TABLE public.model_runs ADD CONSTRAINT model_runs_task_type_check CHECK (task_type IN (
  'claim_extraction',
  'claim_grounding_validation',
  'claim_semantic_validation',
  'claim_escalation',
  'knowledge_extraction',
  'knowledge_validation'
));

-- ---------------------------------------------------------------------------
-- knowledge_tags — controlled catalog (not workspace-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  canonical_name text NOT NULL,
  normalized_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_tags_category_check CHECK (category IN (
    'INDUSTRY', 'CAPABILITY_DOMAIN', 'BUSINESS_PROBLEM', 'GEOGRAPHY'
  )),
  CONSTRAINT knowledge_tags_name_check CHECK (length(trim(canonical_name)) > 0),
  CONSTRAINT knowledge_tags_category_normalized_unique UNIQUE (category, normalized_name)
);

CREATE TABLE public.knowledge_tag_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.knowledge_tags (id),
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_tag_aliases_unique UNIQUE (normalized_alias)
);

-- ---------------------------------------------------------------------------
-- knowledge_candidates
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  analysis_id uuid NOT NULL,
  research_run_id uuid NOT NULL,
  source_snapshot_id uuid NOT NULL,
  extraction_model_run_id uuid NOT NULL,
  candidate_type text NOT NULL,
  canonical_name text NOT NULL,
  normalized_name text NOT NULL,
  proposed_description text NOT NULL,
  candidate_fingerprint text NOT NULL,
  attributed_to_efeso boolean NOT NULL DEFAULT true,
  proposed_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_relations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_validation',
  rejection_reason_code text,
  rejection_reason_text text,
  promoted_knowledge_object_id uuid,
  validated_at timestamptz,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_candidates_type_check CHECK (candidate_type IN (
    'capability', 'methodology', 'service', 'industry_expertise', 'case',
    'credential', 'result', 'testimonial', 'concept'
  )),
  CONSTRAINT knowledge_candidates_name_check CHECK (length(trim(canonical_name)) > 0),
  CONSTRAINT knowledge_candidates_description_check CHECK (length(trim(proposed_description)) > 0),
  CONSTRAINT knowledge_candidates_status_check CHECK (status IN (
    'pending_validation', 'validated', 'needs_review', 'rejected', 'promoted'
  )),
  CONSTRAINT knowledge_candidates_fingerprint_unique
    UNIQUE (workspace_id, source_snapshot_id, candidate_fingerprint),
  CONSTRAINT knowledge_candidates_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT knowledge_candidates_id_workspace_snapshot_unique
    UNIQUE (id, workspace_id, source_snapshot_id),
  CONSTRAINT knowledge_candidates_analysis_workspace_fk
    FOREIGN KEY (analysis_id, workspace_id)
    REFERENCES public.analyses (id, workspace_id),
  CONSTRAINT knowledge_candidates_run_analysis_workspace_fk
    FOREIGN KEY (research_run_id, analysis_id, workspace_id)
    REFERENCES public.research_runs (id, analysis_id, workspace_id),
  CONSTRAINT knowledge_candidates_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT knowledge_candidates_origin_run_scope_fk
    FOREIGN KEY (extraction_model_run_id, workspace_id, analysis_id, research_run_id, source_snapshot_id)
    REFERENCES public.model_runs (id, workspace_id, analysis_id, research_run_id, source_snapshot_id)
);

CREATE INDEX knowledge_candidates_workspace_idx ON public.knowledge_candidates (workspace_id);
CREATE INDEX knowledge_candidates_snapshot_idx ON public.knowledge_candidates (source_snapshot_id);
CREATE INDEX knowledge_candidates_status_idx ON public.knowledge_candidates (status);

CREATE TABLE public.knowledge_candidate_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  knowledge_candidate_id uuid NOT NULL,
  source_content_block_id uuid NOT NULL,
  source_snapshot_id uuid NOT NULL,
  origin_model_run_id uuid NOT NULL,
  citation_order integer NOT NULL DEFAULT 0,
  exact_quote text NOT NULL,
  char_start integer,
  char_end integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_candidate_evidence_order_check CHECK (citation_order >= 0),
  CONSTRAINT knowledge_candidate_evidence_quote_check CHECK (length(trim(exact_quote)) > 0),
  CONSTRAINT knowledge_candidate_evidence_char_start_check CHECK (char_start IS NULL OR char_start >= 0),
  CONSTRAINT knowledge_candidate_evidence_char_end_check CHECK (char_end IS NULL OR char_end >= 0),
  CONSTRAINT knowledge_candidate_evidence_char_range_check
    CHECK (char_end IS NULL OR char_start IS NULL OR char_end >= char_start),
  CONSTRAINT knowledge_candidate_evidence_unique
    UNIQUE (knowledge_candidate_id, source_content_block_id, origin_model_run_id, exact_quote),
  CONSTRAINT knowledge_candidate_evidence_candidate_snapshot_fk
    FOREIGN KEY (knowledge_candidate_id, workspace_id, source_snapshot_id)
    REFERENCES public.knowledge_candidates (id, workspace_id, source_snapshot_id),
  CONSTRAINT knowledge_candidate_evidence_block_snapshot_fk
    FOREIGN KEY (source_content_block_id, workspace_id, source_snapshot_id)
    REFERENCES public.source_content_blocks (id, workspace_id, source_snapshot_id),
  CONSTRAINT knowledge_candidate_evidence_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

CREATE TABLE public.knowledge_candidate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  knowledge_candidate_id uuid NOT NULL,
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
  CONSTRAINT knowledge_candidate_validations_round_check CHECK (validation_round > 0),
  CONSTRAINT knowledge_candidate_validations_type_check CHECK (validator_type IN ('deterministic', 'model', 'hybrid')),
  CONSTRAINT knowledge_candidate_validations_result_check CHECK (result IN ('pass', 'warn', 'fail')),
  CONSTRAINT knowledge_candidate_validations_severity_check CHECK (severity IN ('info', 'review', 'blocking')),
  CONSTRAINT knowledge_candidate_validations_unique
    UNIQUE (knowledge_candidate_id, validation_round, validator_code),
  CONSTRAINT knowledge_candidate_validations_candidate_workspace_fk
    FOREIGN KEY (knowledge_candidate_id, workspace_id)
    REFERENCES public.knowledge_candidates (id, workspace_id),
  CONSTRAINT knowledge_candidate_validations_run_workspace_fk
    FOREIGN KEY (model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- efeso_knowledge_objects
-- ---------------------------------------------------------------------------
CREATE TABLE public.efeso_knowledge_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  object_type text NOT NULL,
  canonical_name text NOT NULL,
  normalized_name text NOT NULL,
  short_description text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  source_snapshot_id uuid NOT NULL,
  primary_content_block_id uuid,
  origin_model_run_id uuid,
  origin_candidate_id uuid,
  supersedes_object_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT efeso_knowledge_objects_type_check CHECK (object_type IN (
    'capability', 'methodology', 'service', 'industry_expertise', 'case',
    'credential', 'result', 'testimonial', 'concept'
  )),
  CONSTRAINT efeso_knowledge_objects_name_check CHECK (length(trim(canonical_name)) > 0),
  CONSTRAINT efeso_knowledge_objects_description_check CHECK (length(trim(short_description)) > 0),
  CONSTRAINT efeso_knowledge_objects_status_check CHECK (status IN (
    'draft', 'validated', 'needs_review', 'active', 'archived'
  )),
  CONSTRAINT efeso_knowledge_objects_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT efeso_knowledge_objects_id_workspace_snapshot_unique
    UNIQUE (id, workspace_id, source_snapshot_id),
  CONSTRAINT efeso_knowledge_objects_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id),
  CONSTRAINT efeso_knowledge_objects_block_snapshot_fk
    FOREIGN KEY (primary_content_block_id, workspace_id, source_snapshot_id)
    REFERENCES public.source_content_blocks (id, workspace_id, source_snapshot_id),
  CONSTRAINT efeso_knowledge_objects_origin_run_workspace_fk
    FOREIGN KEY (origin_model_run_id, workspace_id)
    REFERENCES public.model_runs (id, workspace_id),
  CONSTRAINT efeso_knowledge_objects_origin_candidate_workspace_fk
    FOREIGN KEY (origin_candidate_id, workspace_id)
    REFERENCES public.knowledge_candidates (id, workspace_id),
  CONSTRAINT efeso_knowledge_objects_supersedes_workspace_fk
    FOREIGN KEY (supersedes_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id)
);

CREATE UNIQUE INDEX efeso_knowledge_objects_origin_candidate_uidx
  ON public.efeso_knowledge_objects (origin_candidate_id)
  WHERE origin_candidate_id IS NOT NULL;

CREATE INDEX efeso_knowledge_objects_workspace_status_idx
  ON public.efeso_knowledge_objects (workspace_id, status);
CREATE INDEX efeso_knowledge_objects_workspace_type_idx
  ON public.efeso_knowledge_objects (workspace_id, object_type);
CREATE INDEX efeso_knowledge_objects_normalized_idx
  ON public.efeso_knowledge_objects (workspace_id, normalized_name);

ALTER TABLE public.knowledge_candidates
  ADD CONSTRAINT knowledge_candidates_promoted_object_fk
  FOREIGN KEY (promoted_knowledge_object_id, workspace_id)
  REFERENCES public.efeso_knowledge_objects (id, workspace_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.efeso_knowledge_objects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE public.knowledge_object_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  knowledge_object_id uuid NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  source_snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_object_aliases_alias_check CHECK (length(trim(alias)) > 0),
  CONSTRAINT knowledge_object_aliases_workspace_normalized_unique UNIQUE (workspace_id, normalized_alias),
  CONSTRAINT knowledge_object_aliases_object_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT knowledge_object_aliases_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

CREATE TABLE public.knowledge_object_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  knowledge_object_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.knowledge_tags (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_object_tags_unique UNIQUE (knowledge_object_id, tag_id),
  CONSTRAINT knowledge_object_tags_object_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id)
);

CREATE TABLE public.knowledge_object_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  knowledge_object_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_object_claims_relationship_check CHECK (relationship_type IN (
    'defines', 'supports', 'describes', 'quantifies', 'demonstrates'
  )),
  CONSTRAINT knowledge_object_claims_unique UNIQUE (knowledge_object_id, claim_id, relationship_type),
  CONSTRAINT knowledge_object_claims_object_workspace_fk
    FOREIGN KEY (knowledge_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT knowledge_object_claims_claim_workspace_fk
    FOREIGN KEY (claim_id, workspace_id)
    REFERENCES public.claims (id, workspace_id)
);

CREATE TABLE public.knowledge_object_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id),
  source_object_id uuid NOT NULL,
  target_object_id uuid NOT NULL,
  relation_type text NOT NULL,
  evidence_fragment_id uuid,
  source_snapshot_id uuid,
  status text NOT NULL DEFAULT 'needs_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_object_relations_type_check CHECK (relation_type IN (
    'applicable_to_industry', 'addresses_problem', 'uses_methodology', 'demonstrates_capability',
    'related_to', 'produces_result', 'part_of', 'supports_service'
  )),
  CONSTRAINT knowledge_object_relations_status_check CHECK (status IN (
    'pending_validation', 'needs_review', 'active', 'rejected'
  )),
  CONSTRAINT knowledge_object_relations_not_self CHECK (source_object_id <> target_object_id),
  CONSTRAINT knowledge_object_relations_unique
    UNIQUE (source_object_id, target_object_id, relation_type),
  CONSTRAINT knowledge_object_relations_source_workspace_fk
    FOREIGN KEY (source_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT knowledge_object_relations_target_workspace_fk
    FOREIGN KEY (target_object_id, workspace_id)
    REFERENCES public.efeso_knowledge_objects (id, workspace_id),
  CONSTRAINT knowledge_object_relations_fragment_workspace_fk
    FOREIGN KEY (evidence_fragment_id, workspace_id)
    REFERENCES public.evidence_fragments (id, workspace_id),
  CONSTRAINT knowledge_object_relations_snapshot_workspace_fk
    FOREIGN KEY (source_snapshot_id, workspace_id)
    REFERENCES public.source_snapshots (id, workspace_id)
);

-- Controlled taxonomy seed
INSERT INTO public.knowledge_tags (category, canonical_name, normalized_name) VALUES
  ('INDUSTRY', 'Automotive', 'automotive'),
  ('INDUSTRY', 'Aerospace', 'aerospace'),
  ('INDUSTRY', 'Chemicals', 'chemicals'),
  ('INDUSTRY', 'Consumer Goods', 'consumer goods'),
  ('INDUSTRY', 'Energy', 'energy'),
  ('INDUSTRY', 'Food & Beverage', 'food and beverage'),
  ('INDUSTRY', 'Forest & Packaging', 'forest and packaging'),
  ('INDUSTRY', 'Life Sciences', 'life sciences'),
  ('INDUSTRY', 'Manufacturing', 'manufacturing'),
  ('INDUSTRY', 'Mining & Metals', 'mining and metals'),
  ('INDUSTRY', 'Oil & Gas', 'oil and gas'),
  ('INDUSTRY', 'Retail', 'retail'),
  ('INDUSTRY', 'Transportation', 'transportation'),
  ('INDUSTRY', 'Utilities', 'utilities'),
  ('INDUSTRY', 'Other', 'other'),
  ('CAPABILITY_DOMAIN', 'Operational Excellence', 'operational excellence'),
  ('CAPABILITY_DOMAIN', 'Supply Chain', 'supply chain'),
  ('CAPABILITY_DOMAIN', 'Procurement', 'procurement'),
  ('CAPABILITY_DOMAIN', 'Asset Productivity', 'asset productivity'),
  ('CAPABILITY_DOMAIN', 'Maintenance', 'maintenance'),
  ('CAPABILITY_DOMAIN', 'Quality', 'quality'),
  ('CAPABILITY_DOMAIN', 'Manufacturing', 'manufacturing'),
  ('CAPABILITY_DOMAIN', 'Digital', 'digital'),
  ('CAPABILITY_DOMAIN', 'Sustainability', 'sustainability'),
  ('CAPABILITY_DOMAIN', 'Strategy', 'strategy'),
  ('CAPABILITY_DOMAIN', 'Transformation', 'transformation'),
  ('CAPABILITY_DOMAIN', 'Organization', 'organization'),
  ('CAPABILITY_DOMAIN', 'Performance Management', 'performance management'),
  ('CAPABILITY_DOMAIN', 'Ramp-up', 'ramp up'),
  ('CAPABILITY_DOMAIN', 'Cost Reduction', 'cost reduction'),
  ('CAPABILITY_DOMAIN', 'Working Capital', 'working capital'),
  ('BUSINESS_PROBLEM', 'setup reduction', 'setup reduction'),
  ('BUSINESS_PROBLEM', 'throughput', 'throughput'),
  ('BUSINESS_PROBLEM', 'productivity', 'productivity'),
  ('BUSINESS_PROBLEM', 'inventory', 'inventory'),
  ('BUSINESS_PROBLEM', 'reliability', 'reliability'),
  ('BUSINESS_PROBLEM', 'OEE', 'oee'),
  ('BUSINESS_PROBLEM', 'yield', 'yield'),
  ('BUSINESS_PROBLEM', 'waste', 'waste'),
  ('BUSINESS_PROBLEM', 'cost', 'cost'),
  ('BUSINESS_PROBLEM', 'lead time', 'lead time'),
  ('BUSINESS_PROBLEM', 'service level', 'service level'),
  ('BUSINESS_PROBLEM', 'capacity', 'capacity'),
  ('BUSINESS_PROBLEM', 'ramp-up', 'ramp up'),
  ('BUSINESS_PROBLEM', 'maintenance', 'maintenance'),
  ('BUSINESS_PROBLEM', 'planning', 'planning'),
  ('GEOGRAPHY', 'Brazil', 'brazil'),
  ('GEOGRAPHY', 'Latin America', 'latin america'),
  ('GEOGRAPHY', 'Global', 'global'),
  ('GEOGRAPHY', 'Europe', 'europe'),
  ('GEOGRAPHY', 'North America', 'north america'),
  ('GEOGRAPHY', 'Asia', 'asia'),
  ('GEOGRAPHY', 'Other', 'other');

INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'OpEx', 'opex' FROM public.knowledge_tags
  WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Operational Excellence';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'Operations excellence', 'operations excellence' FROM public.knowledge_tags
  WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Operational Excellence';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'Operational Excellence Transformation', 'operational excellence transformation'
  FROM public.knowledge_tags
  WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Operational Excellence';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'auto', 'auto' FROM public.knowledge_tags
  WHERE category = 'INDUSTRY' AND canonical_name = 'Automotive';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'mining', 'mining' FROM public.knowledge_tags
  WHERE category = 'INDUSTRY' AND canonical_name = 'Mining & Metals';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'Brasil', 'brasil' FROM public.knowledge_tags
  WHERE category = 'GEOGRAPHY' AND canonical_name = 'Brazil';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'LATAM', 'latam' FROM public.knowledge_tags
  WHERE category = 'GEOGRAPHY' AND canonical_name = 'Latin America';
INSERT INTO public.knowledge_tag_aliases (tag_id, alias, normalized_alias)
SELECT id, 'worldwide', 'worldwide' FROM public.knowledge_tags
  WHERE category = 'GEOGRAPHY' AND canonical_name = 'Global';
