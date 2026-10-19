-- SIGNAL Sprint 1 RLS smoke test.
-- Proves: unauthenticated (anon) cannot read tenant data;
--         User A in Workspace A cannot SELECT companies from Workspace B.
--
-- Run (local Supabase must be up):
--   npm run test:rls
--
-- This file is executed inside a transaction that rolls back.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(39);

-- Synthetic Workspace B — never seeded into the product dataset.
INSERT INTO public.workspaces (id, name, slug, country_code, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'EFESO Isolation Test',
  'efeso-isolation-test',
  'IT',
  'active'
);

INSERT INTO public.companies (
  id, workspace_id, slug, display_name, resolution_status
) VALUES (
  'a1000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'secret-co',
  'Secret Co',
  'resolved'
);

-- Two auth users (local test identities). instance_id is required by GoTrue.
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'authenticated',
    'authenticated',
    'rls-user-a@signal.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'authenticated',
    'authenticated',
    'rls-user-b@signal.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.profiles (id, full_name, job_title)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'User A', 'Tester'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'User B', 'Tester');

-- Sprint 2 tenant rows in Workspace B (and one Source in A for the positive check).
INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'Isolation analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (
  id, workspace_id, canonical_url, publisher_name, source_type, source_tier
) VALUES
  (
    'e1000000-0000-4000-8000-00000000bbbb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
    'https://example.invalid/workspace-b',
    'Workspace B Press',
    'other',
    'E'
  ),
  (
    'e1000000-0000-4000-8000-0000000000aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'https://example.invalid/workspace-a',
    'Workspace A Press',
    'other',
    'E'
  );

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'e1000000-0000-4000-8000-00000000bbbb',
  'hash-b',
  'partial',
  'secret snapshot'
);

INSERT INTO public.evidence_fragments (
  id, workspace_id, source_snapshot_id, fragment_type, excerpt
) VALUES (
  'a2000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'quote',
  'secret fragment'
);

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id,
  statement, claim_category
) VALUES (
  'a3000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'd1000000-0000-4000-8000-00000000bbbb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'secret claim',
  'other'
);

INSERT INTO public.claim_evidence (
  id, workspace_id, claim_id, evidence_fragment_id, relationship, directness
) VALUES (
  'a4000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a3000000-0000-4000-8000-00000000bbbb',
  'a2000000-0000-4000-8000-00000000bbbb',
  'supports',
  'direct'
);

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version
) VALUES (
  'b1000000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'f1000000-0000-4000-8000-00000000bbbb',
  0,
  'paragraph',
  'secret block',
  'hash-secret-block',
  'plain-text-signal',
  'plain-text-signal-v1'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'd1000000-0000-4000-8000-00000000bbbb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'claim_extraction',
  'openai',
  'gpt-6-luna',
  'claim-extraction-v1',
  'claim-extraction-schema-v1',
  'completed',
  'hash-secret-run'
);

INSERT INTO public.claim_candidates (
  id, workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
  origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type
) VALUES (
  'a1200000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'd1000000-0000-4000-8000-00000000bbbb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'a1100000-0000-4000-8000-00000000bbbb',
  'fp-secret',
  'secret candidate',
  'other',
  'fact'
);

INSERT INTO public.claim_candidate_evidence (
  id, workspace_id, claim_candidate_id, source_content_block_id, source_snapshot_id,
  origin_model_run_id, exact_quote
) VALUES (
  'a1300000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1200000-0000-4000-8000-00000000bbbb',
  'b1000000-0000-4000-8000-00000000bbbb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'a1100000-0000-4000-8000-00000000bbbb',
  'secret block'
);

INSERT INTO public.claim_candidate_validations (
  id, workspace_id, claim_candidate_id, validator_code, validator_version, validator_type, result, severity
) VALUES (
  'a1400000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1200000-0000-4000-8000-00000000bbbb',
  'schema_validity',
  'deterministic-v1',
  'deterministic',
  'pass',
  'info'
);

INSERT INTO public.knowledge_candidates (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint, status
) VALUES (
  'a1500000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'd1000000-0000-4000-8000-00000000bbbb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'a1100000-0000-4000-8000-00000000bbbb',
  'capability',
  'Secret Capability',
  'secret capability',
  'secret knowledge candidate',
  'fp-secret-knowledge',
  'validated'
);

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status,
  source_snapshot_id, origin_model_run_id, origin_candidate_id
) VALUES (
  'a1600000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'capability',
  'Secret Capability',
  'secret capability',
  'secret knowledge object',
  'active',
  'f1000000-0000-4000-8000-00000000bbbb',
  'a1100000-0000-4000-8000-00000000bbbb',
  'a1500000-0000-4000-8000-00000000bbbb'
);

INSERT INTO public.signal_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  proposed_signal_type, proposed_signal_nature, proposed_title, proposed_summary, proposed_importance,
  proposed_assertion_mode, proposed_core_event, candidate_fingerprint, status
) VALUES (
  'a1800000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'c1000000-0000-4000-8000-00000000bbbb',
  'd1000000-0000-4000-8000-00000000bbbb',
  'f1000000-0000-4000-8000-00000000bbbb',
  'a1100000-0000-4000-8000-00000000bbbb',
  'expansion',
  'event',
  'Secret expansion',
  'secret signal candidate',
  'medium',
  'announced',
  'secret expansion',
  'fp-secret-signal',
  'validated'
);

INSERT INTO public.signals (
  id, workspace_id, company_id, signal_type, signal_nature, title, summary, status, importance,
  confidence_tier, assertion_mode, signal_fingerprint, origin_signal_candidate_id
) VALUES (
  'a1700000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'expansion',
  'event',
  'Secret expansion',
  'secret signal',
  'active',
  'medium',
  'supported',
  'announced',
  'fp-secret-signal',
  'a1800000-0000-4000-8000-00000000bbbb'
);

INSERT INTO public.account_intelligence (
  id, workspace_id, company_id, status, headline, executive_summary
) VALUES (
  'a1900000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'active',
  'Secret narrative',
  'secret intelligence'
);

INSERT INTO public.efeso_fits (
  id, workspace_id, company_id, knowledge_object_id, status, fit_level, fit_reason_summary
) VALUES (
  'a1930000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'a1600000-0000-4000-8000-00000000bbbb',
  'active',
  'high',
  'secret fit'
);

INSERT INTO public.opportunities (
  id, workspace_id, company_id, title, summary, status, opportunity_type, maturity,
  relevance_level, urgency_level, confidence_tier, assertion_mode
) VALUES (
  'a2100000-0000-4000-8000-00000000bbbb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
  'a1000000-0000-4000-8000-00000000bbbb',
  'Secret opportunity',
  'secret opportunity hypothesis',
  'active',
  'ramp_up',
  'emerging',
  'high',
  'medium',
  'inferred',
  'announced'
);

-- User A → EFESO Brazil (seeded). User B → Workspace B only.
INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'consultant',
    'active'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'consultant',
    'active'
  );

-- 1) anon cannot read tenant tables.
-- RLS is not the first line of defense here: migrations REVOKE ALL FROM anon,
-- so PostgreSQL raises insufficient_privilege (42501) before any row is visible.
-- That is stricter than "count = 0 under RLS" and must not be weakened with GRANTs.
SET LOCAL ROLE anon;
SELECT throws_ok(
  'SELECT count(*)::int FROM public.companies',
  '42501',
  NULL,
  'anon cannot SELECT companies'
);

SELECT throws_ok(
  'SELECT count(*)::int FROM public.analyses',
  '42501',
  NULL,
  'anon cannot SELECT analyses'
);
RESET ROLE;

-- 2) User A (EFESO Brazil) cannot see Workspace B company
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.companies WHERE slug = 'secret-co'),
  0,
  'user A cannot SELECT company from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.workspaces WHERE slug = 'efeso-isolation-test'),
  0,
  'user A cannot SELECT workspace B'
);

-- 3) User A can see EFESO Brazil companies
SELECT ok(
  (SELECT count(*)::int FROM public.companies WHERE slug = 'natura') >= 1,
  'user A can SELECT Natura in EFESO Brazil'
);
RESET ROLE;

-- 4) User B can see Workspace B company but not Natura
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.companies WHERE slug = 'natura'),
  0,
  'user B cannot SELECT Natura from EFESO Brazil'
);
RESET ROLE;

-- 5) User A cannot read Sprint 2 tenant rows from Workspace B
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.sources WHERE publisher_name = 'Workspace B Press'),
  0,
  'user A cannot SELECT sources from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.source_snapshots WHERE content_hash = 'hash-b'),
  0,
  'user A cannot SELECT source_snapshots from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.evidence_fragments WHERE excerpt = 'secret fragment'),
  0,
  'user A cannot SELECT evidence_fragments from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.claims WHERE statement = 'secret claim'),
  0,
  'user A cannot SELECT claims from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.claim_evidence WHERE id = 'a4000000-0000-4000-8000-00000000bbbb'),
  0,
  'user A cannot SELECT claim_evidence from workspace B'
);

SELECT ok(
  (SELECT count(*)::int FROM public.sources WHERE publisher_name = 'Workspace A Press') >= 1,
  'user A can SELECT sources in EFESO Brazil'
);

SELECT throws_ok(
  $$INSERT INTO public.sources (workspace_id, publisher_name, source_type, source_tier)
    VALUES ('0e8f0e50-b2a1-4c3d-9e7f-0000000000bb', 'Cross write', 'other', 'E')$$,
  '42501',
  NULL,
  'user A cannot INSERT a source into workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.source_content_blocks WHERE text_content = 'secret block'),
  0,
  'user A cannot SELECT source_content_blocks from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.model_runs WHERE input_hash = 'hash-secret-run'),
  0,
  'user A cannot SELECT model_runs from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.claim_candidates WHERE proposed_statement = 'secret candidate'),
  0,
  'user A cannot SELECT claim_candidates from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.claim_candidate_evidence WHERE exact_quote = 'secret block'),
  0,
  'user A cannot SELECT claim_candidate_evidence from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.claim_candidate_validations WHERE id = 'a1400000-0000-4000-8000-00000000bbbb'),
  0,
  'user A cannot SELECT claim_candidate_validations from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE canonical_name = 'Secret Capability'),
  0,
  'user A cannot SELECT knowledge objects from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.knowledge_candidates WHERE canonical_name = 'Secret Capability'),
  0,
  'user A cannot SELECT knowledge candidates from workspace B'
);

SELECT throws_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'capability', 'Forged Active', 'forged active', 'forged', 'active',
      'f1000000-0000-4000-8000-00000000bbbb'
    )$$,
  '42501',
  NULL,
  'user A cannot INSERT an active knowledge object'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_candidate_validations (
      workspace_id, knowledge_candidate_id, validator_code, validator_version, validator_type, result, severity
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
      'a1500000-0000-4000-8000-00000000bbbb',
      'schema_validity', 'knowledge-deterministic-v1', 'deterministic', 'pass', 'info'
    )$$,
  '42501',
  NULL,
  'user A cannot insert a fake knowledge validation pass'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_object_relations (
      workspace_id, source_object_id, target_object_id, relation_type, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
      'a1600000-0000-4000-8000-00000000bbbb',
      'a1600000-0000-4000-8000-00000000bbbb',
      'related_to', 'active'
    )$$,
  '42501',
  NULL,
  'user A cannot forge an active knowledge relation'
);

SELECT is(
  (SELECT count(*)::int FROM public.signals WHERE title = 'Secret expansion'),
  0,
  'user A cannot SELECT signals from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.signal_candidates WHERE proposed_title = 'Secret expansion'),
  0,
  'user A cannot SELECT signal candidates from workspace B'
);

SELECT throws_ok(
  $$INSERT INTO public.signals (
      workspace_id, company_id, signal_type, signal_nature, title, summary, status, importance,
      confidence_tier, assertion_mode, signal_fingerprint
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'expansion', 'event', 'Forged active signal', 'forged', 'active', 'high',
      'direct', 'announced', 'fp-forged-signal'
    )$$,
  '42501',
  NULL,
  'user A cannot INSERT an active signal'
);

SELECT throws_ok(
  $$INSERT INTO public.signal_claims (
      workspace_id, signal_id, claim_id, relationship_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
      'a1700000-0000-4000-8000-00000000bbbb',
      'a3000000-0000-4000-8000-00000000bbbb',
      'primary_evidence'
    )$$,
  '42501',
  NULL,
  'user A cannot forge a SignalClaim'
);

SELECT throws_ok(
  $$SELECT public.promote_signal_candidate('a1800000-0000-4000-8000-00000000bbbb')$$,
  '42501',
  NULL,
  'user A cannot promote a signal candidate'
);

SELECT is(
  (SELECT count(*)::int FROM public.account_intelligence WHERE headline = 'Secret narrative'),
  0,
  'user A cannot SELECT account intelligence from workspace B'
);

SELECT is(
  (SELECT count(*)::int FROM public.efeso_fits WHERE fit_reason_summary = 'secret fit'),
  0,
  'user A cannot SELECT EFESO fits from workspace B'
);

SELECT throws_ok(
  $$INSERT INTO public.account_intelligence (
      workspace_id, company_id, status, headline, executive_summary
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'active', 'Forged narrative', 'forged'
    )$$,
  '42501',
  NULL,
  'user A cannot INSERT active account intelligence'
);

SELECT throws_ok(
  $$INSERT INTO public.efeso_fits (
      workspace_id, company_id, knowledge_object_id, status, fit_level, fit_reason_summary
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'a1600000-0000-4000-8000-00000000d011',
      'active', 'high', 'forged fit'
    )$$,
  '42501',
  NULL,
  'user A cannot forge an active EFESO Fit'
);

SELECT throws_ok(
  $$SELECT public.promote_account_intelligence_candidate('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')$$,
  NULL,
  NULL,
  'user A cannot promote account intelligence in another workspace'
);

SELECT throws_ok(
  $$INSERT INTO public.signal_knowledge_matches (
      workspace_id, signal_id, knowledge_object_id, match_type, match_strength, status, explanation
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
      'a1700000-0000-4000-8000-00000000bbbb',
      'a1600000-0000-4000-8000-00000000bbbb',
      'industry', 'strong', 'active', 'forged match'
    )$$,
  '42501',
  NULL,
  'user A cannot forge a SignalKnowledgeMatch'
);

SELECT is(
  (SELECT count(*)::int FROM public.opportunities WHERE title = 'Secret opportunity'),
  0,
  'user A cannot SELECT opportunities from workspace B'
);

SELECT throws_ok(
  $$INSERT INTO public.opportunities (
      workspace_id, company_id, title, summary, status, opportunity_type, maturity,
      relevance_level, urgency_level, confidence_tier, assertion_mode
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'Forged opportunity', 'forged', 'active', 'ramp_up', 'emerging', 'high', 'high', 'direct', 'announced'
    )$$,
  '42501',
  NULL,
  'user A cannot INSERT an active Opportunity'
);

SELECT throws_ok(
  $$SELECT public.promote_opportunity_candidate('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')$$,
  NULL,
  NULL,
  'user A cannot promote an opportunity candidate in another workspace'
);

SELECT throws_ok(
  $$INSERT INTO public.opportunity_signals (
      workspace_id, opportunity_id, signal_id, relationship_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000bb',
      'a2100000-0000-4000-8000-00000000bbbb',
      'a1700000-0000-4000-8000-00000000bbbb',
      'trigger'
    )$$,
  '42501',
  NULL,
  'user A cannot forge an OpportunitySignal'
);

RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  'SELECT count(*)::int FROM public.claim_candidates',
  '42501',
  NULL,
  'anon cannot SELECT claim_candidates'
);

SELECT * FROM finish();

ROLLBACK;
