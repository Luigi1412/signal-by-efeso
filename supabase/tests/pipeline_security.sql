-- SIGNAL Sprint 3 — authenticated clients cannot forge pipeline state.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(9);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'authenticated',
  'authenticated',
  'pipeline-user@signal.test',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

INSERT INTO public.profiles (id, full_name, job_title)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Pipeline User', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'consultant',
  'active'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Pipeline security analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e4aa',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'Pipeline Press',
  'other',
  'E'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000e4aa',
  'hash-pipeline-sec',
  'partial',
  'synthetic'
);

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version
) VALUES (
  'b1000000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'f1000000-0000-4000-8000-00000000e4aa',
  0,
  'paragraph',
  'synthetic block',
  'hash-block',
  'plain-text-signal',
  'plain-text-signal-v1'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e4aa',
  'd1000000-0000-4000-8000-00000000e4aa',
  'f1000000-0000-4000-8000-00000000e4aa',
  'claim_extraction',
  'openai',
  'gpt-6-luna',
  'claim-extraction-v1',
  'claim-extraction-schema-v1',
  'running',
  'input-hash'
);

INSERT INTO public.claim_candidates (
  id, workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
  origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type, status
) VALUES (
  'a1200000-0000-4000-8000-00000000e4aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e4aa',
  'd1000000-0000-4000-8000-00000000e4aa',
  'a1000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-00000000e4aa',
  'a1100000-0000-4000-8000-00000000e4aa',
  'fp-sec',
  'synthetic statement',
  'other',
  'fact',
  'pending_validation'
);

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$UPDATE public.claim_candidates
      SET status = 'validated'
      WHERE id = 'a1200000-0000-4000-8000-00000000e4aa'$$,
  '42501',
  NULL,
  'authenticated client cannot mark a candidate validated'
);

SELECT throws_ok(
  $$INSERT INTO public.claim_candidate_validations (
      workspace_id, claim_candidate_id, validator_code, validator_version, validator_type, result, severity
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1200000-0000-4000-8000-00000000e4aa',
      'schema_validity', 'deterministic-v1', 'deterministic', 'pass', 'info'
    )$$,
  '42501',
  NULL,
  'authenticated client cannot insert fake validation passes'
);

SELECT throws_ok(
  $$UPDATE public.claim_candidates
      SET status = 'promoted'
      WHERE id = 'a1200000-0000-4000-8000-00000000e4aa'$$,
  '42501',
  NULL,
  'authenticated client cannot mark a candidate promoted'
);

SELECT throws_ok(
  $$UPDATE public.model_runs
      SET status = 'completed'
      WHERE id = 'a1100000-0000-4000-8000-00000000e4aa'$$,
  '42501',
  NULL,
  'authenticated client cannot forge ModelRun completion'
);

SELECT throws_ok(
  $$INSERT INTO public.model_runs (
      workspace_id, analysis_id, research_run_id, source_snapshot_id,
      task_type, provider, model_name, prompt_version, schema_version, status, input_hash
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e4aa',
      'd1000000-0000-4000-8000-00000000e4aa',
      'f1000000-0000-4000-8000-00000000e4aa',
      'claim_extraction', 'openai', 'gpt-6-luna',
      'claim-extraction-v1', 'claim-extraction-schema-v1', 'completed', 'forged'
    )$$,
  '42501',
  NULL,
  'authenticated client cannot insert ModelRuns'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_candidates (
      workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
      candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e4aa',
      'd1000000-0000-4000-8000-00000000e4aa',
      'f1000000-0000-4000-8000-00000000e4aa',
      'a1100000-0000-4000-8000-00000000e4aa',
      'capability', 'Forged', 'forged', 'forged', 'fp-k-sec', 'validated'
    )$$,
  '42501',
  NULL,
  'authenticated client cannot insert knowledge candidates'
);

SELECT throws_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'capability', 'Forged Object', 'forged object', 'forged', 'active',
      'f1000000-0000-4000-8000-00000000e4aa'
    )$$,
  '42501',
  NULL,
  'authenticated client cannot create an active knowledge object'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_candidate_validations (
      workspace_id, knowledge_candidate_id, validator_code, validator_version, validator_type, result, severity
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1200000-0000-4000-8000-00000000e4aa',
      'schema_validity', 'knowledge-deterministic-v1', 'deterministic', 'pass', 'info'
    )$$,
  '42501',
  NULL,
  'authenticated client cannot insert knowledge validations'
);

SELECT throws_ok(
  $$UPDATE public.model_runs
      SET task_type = 'knowledge_extraction'
      WHERE id = 'a1100000-0000-4000-8000-00000000e4aa'$$,
  '42501',
  NULL,
  'authenticated client cannot rewrite ModelRun task type'
);

SELECT * FROM finish();

ROLLBACK;
