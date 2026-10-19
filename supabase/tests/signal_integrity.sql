-- SIGNAL Sprint 5 — Signal Engine integrity, promotion, RLS mutation, immutability.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(12);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
    'authenticated', 'authenticated', 'signal-admin@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
    'authenticated', 'authenticated', 'signal-member@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'Signal Admin', 'Tester'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Signal Member', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'admin', 'active'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'member', 'active');

INSERT INTO public.analyses (id, workspace_id, company_id, title, status) VALUES (
  'c1000000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Signal analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e7aa',
  'v-test', 'v-test', 'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'Signal Press', 'other', 'E'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000e7aa',
  'hash-signal',
  'partial',
  'Company announced a plant expansion in Brazil.'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e7aa',
  'd1000000-0000-4000-8000-00000000e7aa',
  'f1000000-0000-4000-8000-00000000e7aa',
  'signal_extraction', 'fake', 'fake-model', 'signal-extraction-v1',
  'signal-extraction-schema-v1', 'completed', 'hash-signal-run'
);

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id,
  statement, claim_category, assertion_mode, claim_status
) VALUES (
  'a3000000-0000-4000-8000-00000000e7aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e7aa',
  'd1000000-0000-4000-8000-00000000e7aa',
  'a1000000-0000-4000-8000-000000000001',
  'Company announced a plant expansion in Brazil.',
  'investment', 'announced', 'active'
);

INSERT INTO public.signal_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  proposed_signal_type, proposed_signal_nature, proposed_title, proposed_summary, proposed_importance,
  proposed_assertion_mode, proposed_confidence_tier, proposed_core_event, candidate_fingerprint, status
) VALUES
  (
    'a1800000-0000-4000-8000-00000000e7a1',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000e7aa',
    'd1000000-0000-4000-8000-00000000e7aa',
    'f1000000-0000-4000-8000-00000000e7aa',
    'a1100000-0000-4000-8000-00000000e7aa',
    'expansion', 'event',
    'Company announces a plant expansion in Brazil',
    'The company announced a plant expansion in Brazil.',
    'medium', 'announced', 'direct', 'plant expansion brazil', 'fp-signal-e7a1', 'validated'
  ),
  (
    'a1800000-0000-4000-8000-00000000e7a2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000e7aa',
    'd1000000-0000-4000-8000-00000000e7aa',
    'f1000000-0000-4000-8000-00000000e7aa',
    'a1100000-0000-4000-8000-00000000e7aa',
    'other', 'event',
    'Company announced something',
    'Needs review.',
    'low', 'announced', 'supported', 'something', 'fp-signal-e7a2', 'needs_review'
  );

INSERT INTO public.signal_candidate_claims (
  workspace_id, signal_candidate_id, claim_id, relationship_type
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1800000-0000-4000-8000-00000000e7a1',
  'a3000000-0000-4000-8000-00000000e7aa',
  'primary_evidence'
);

INSERT INTO public.signal_candidate_validations (
  workspace_id, signal_candidate_id, validator_code, validator_version, validator_type, result, severity
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1800000-0000-4000-8000-00000000e7a1',
  'schema_validity', 'signal-deterministic-v1', 'deterministic', 'pass', 'info'
);

SELECT throws_ok(
  $$INSERT INTO public.signal_candidates (
      workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
      proposed_signal_type, proposed_signal_nature, proposed_title, proposed_summary, proposed_importance,
      proposed_core_event, candidate_fingerprint
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-00000000e7aa',
      'd1000000-0000-4000-8000-00000000e7aa',
      'f1000000-0000-4000-8000-00000000e7aa',
      'a1100000-0000-4000-8000-00000000e7aa',
      'not_a_type', 'event', 'x', 'y', 'medium', 'core', 'fp-bad-type'
    )$$,
  '23514',
  NULL,
  'invented signal types are rejected'
);

SELECT throws_ok(
  $$UPDATE public.signal_candidate_claims SET relationship_type = 'contextual_evidence'
      WHERE signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1'$$,
  '23001',
  NULL,
  'signal candidate claims are immutable'
);

SELECT throws_ok(
  $$UPDATE public.signal_candidate_validations SET result = 'fail'
      WHERE signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1'$$,
  '23001',
  NULL,
  'signal validations are immutable'
);

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.promote_signal_candidate('a1800000-0000-4000-8000-00000000e7a1')$$,
  '42501',
  NULL,
  'member cannot promote a signal candidate'
);

SELECT throws_ok(
  $$INSERT INTO public.signals (
      workspace_id, company_id, signal_type, signal_nature, title, summary, status, importance,
      confidence_tier, assertion_mode, signal_fingerprint
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'expansion', 'event', 'Forged', 'forged', 'active', 'high', 'direct', 'announced', 'fp-member-forged'
    )$$,
  '42501',
  NULL,
  'member cannot insert an active signal'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.promote_signal_candidate('a1800000-0000-4000-8000-00000000e7a2')$$,
  NULL,
  NULL,
  'needs_review candidates cannot be promoted'
);

SELECT lives_ok(
  $$SELECT public.promote_signal_candidate('a1800000-0000-4000-8000-00000000e7a1')$$,
  'validated signal candidate promotes atomically'
);

RESET ROLE;

SELECT is(
  (SELECT status FROM public.signal_candidates WHERE id = 'a1800000-0000-4000-8000-00000000e7a1'),
  'promoted',
  'promoted candidate status is promoted'
);

SELECT is(
  (SELECT status FROM public.signals WHERE origin_signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1'),
  'active',
  'promoted signal is active'
);

SELECT ok(
  (SELECT count(*)::int FROM public.signal_claims
     WHERE signal_id = (SELECT id FROM public.signals WHERE origin_signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1')
       AND relationship_type = 'primary_evidence') = 1,
  'promotion copies primary SignalClaim'
);

SELECT ok(
  (SELECT count(*)::int FROM public.signal_companies
     WHERE signal_id = (SELECT id FROM public.signals WHERE origin_signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1')
       AND role = 'primary') = 1,
  'promotion creates primary SignalCompany'
);

SELECT throws_ok(
  $$UPDATE public.signals
      SET origin_signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a2'
      WHERE origin_signal_candidate_id = 'a1800000-0000-4000-8000-00000000e7a1'$$,
  '23001',
  NULL,
  'signal provenance cannot be rewritten'
);

SELECT * FROM finish();

ROLLBACK;
