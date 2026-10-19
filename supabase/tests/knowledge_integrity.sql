-- SIGNAL Sprint 4 — EFESO Knowledge integrity, promotion, and immutability.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(16);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  'authenticated',
  'authenticated',
  'knowledge-user@signal.test',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

INSERT INTO public.profiles (id, full_name, job_title)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'Knowledge User', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  'consultant',
  'active'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Knowledge analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e6aa',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'EFESO Knowledge Press',
  'internal_efeso',
  'A'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000e6aa',
  'hash-knowledge',
  'partial',
  'Our BOOST methodology consists of five stages. EFESO helps organizations improve operational performance through Operational Excellence programs.'
);

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version
) VALUES (
  'b1000000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'f1000000-0000-4000-8000-00000000e6aa',
  0,
  'paragraph',
  'Our BOOST methodology consists of five stages. EFESO helps organizations improve operational performance through Operational Excellence programs.',
  'hash-block-knowledge',
  'plain-text-signal',
  'plain-text-signal-v1'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000e6aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e6aa',
  'd1000000-0000-4000-8000-00000000e6aa',
  'f1000000-0000-4000-8000-00000000e6aa',
  'knowledge_extraction',
  'fake',
  'gpt-6-luna',
  'knowledge-extraction-v1',
  'knowledge-extraction-schema-v1',
  'completed',
  'input-hash-knowledge'
);

INSERT INTO public.knowledge_candidates (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint,
  proposed_aliases, proposed_tags, status
) VALUES
  (
    'a1500000-0000-4000-8000-00000000e6a1',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e6aa',
    'd1000000-0000-4000-8000-00000000e6aa',
    'f1000000-0000-4000-8000-00000000e6aa',
    'a1100000-0000-4000-8000-00000000e6aa',
    'methodology',
    'BOOST',
    'boost',
    'BOOST is an EFESO methodology composed of five stages.',
    'fp-boost',
    '["BOOST methodology"]'::jsonb,
    '[{"category":"CAPABILITY_DOMAIN","canonical_name":"Transformation"}]'::jsonb,
    'validated'
  ),
  (
    'a1500000-0000-4000-8000-00000000e6a2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e6aa',
    'd1000000-0000-4000-8000-00000000e6aa',
    'f1000000-0000-4000-8000-00000000e6aa',
    'a1100000-0000-4000-8000-00000000e6aa',
    'capability',
    'Operational Excellence',
    'operational excellence',
    'Needs human review.',
    'fp-opex',
    '[]'::jsonb,
    '[]'::jsonb,
    'needs_review'
  );

INSERT INTO public.knowledge_candidate_evidence (
  workspace_id, knowledge_candidate_id, source_content_block_id, source_snapshot_id,
  origin_model_run_id, exact_quote, char_start, char_end
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1500000-0000-4000-8000-00000000e6a1',
  'b1000000-0000-4000-8000-00000000e6aa',
  'f1000000-0000-4000-8000-00000000e6aa',
  'a1100000-0000-4000-8000-00000000e6aa',
  'Our BOOST methodology consists of five stages.',
  0,
  46
);

INSERT INTO public.knowledge_candidate_validations (
  workspace_id, knowledge_candidate_id, validator_code, validator_version, validator_type, result, severity
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1500000-0000-4000-8000-00000000e6a1',
  'schema_validity',
  'knowledge-deterministic-v1',
  'deterministic',
  'pass',
  'info'
);

SELECT ok(
  (SELECT count(*)::int FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Automotive') = 1,
  'controlled INDUSTRY taxonomy includes Automotive'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_candidates (
      workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
      candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e6aa',
      'd1000000-0000-4000-8000-00000000e6aa',
      'f1000000-0000-4000-8000-00000000e6aa',
      'a1100000-0000-4000-8000-00000000e6aa',
      'magic_capability', 'X', 'x', 'nope', 'fp-bad-type'
    )$$,
  '23514',
  NULL,
  'arbitrary object_type is rejected'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_candidate_evidence (
      workspace_id, knowledge_candidate_id, source_content_block_id, source_snapshot_id,
      origin_model_run_id, exact_quote
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1500000-0000-4000-8000-00000000e6a1',
      'b1000000-0000-4000-8000-00000000e6aa',
      'f1000000-0000-4000-8000-00000000e6aa',
      'a1100000-0000-4000-8000-00000000e6aa',
      '   '
    )$$,
  '23514',
  NULL,
  'empty exact_quote is rejected'
);

SELECT lives_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      id, workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
    ) VALUES (
      'a1600000-0000-4000-8000-00000000e6a2',
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'capability',
      'Operational Excellence',
      'operational excellence',
      'Needs human review.',
      'needs_review',
      'f1000000-0000-4000-8000-00000000e6aa'
    )$$,
  'needs_review knowledge objects can remain persisted'
);

SELECT throws_ok(
  $$UPDATE public.knowledge_candidate_evidence
      SET exact_quote = 'rewritten'
      WHERE knowledge_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'$$,
  '23001',
  NULL,
  'knowledge evidence quotes are immutable'
);

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.promote_knowledge_candidate('a1500000-0000-4000-8000-00000000e6a2')$$,
  NULL,
  NULL,
  'needs_review candidates cannot be promoted'
);

SELECT lives_ok(
  $$SELECT public.promote_knowledge_candidate('a1500000-0000-4000-8000-00000000e6a1')$$,
  'validated knowledge candidate promotes atomically'
);

RESET ROLE;

SELECT is(
  (SELECT status FROM public.knowledge_candidates WHERE id = 'a1500000-0000-4000-8000-00000000e6a1'),
  'promoted',
  'promoted candidate status is promoted'
);

SELECT is(
  (SELECT status FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'),
  'active',
  'promoted knowledge object is active'
);

SELECT ok(
  (SELECT count(*)::int FROM public.knowledge_object_aliases WHERE normalized_alias IN ('boost', 'boost methodology')) >= 1,
  'promotion stores aliases including core name'
);

SELECT lives_ok(
  $$INSERT INTO public.knowledge_object_aliases (
      workspace_id, knowledge_object_id, alias, normalized_alias
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      (SELECT id FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'),
      'BOOST programme',
      'boost programme'
    )$$,
  'additional aliases can be stored'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_object_aliases (
      workspace_id, knowledge_object_id, alias, normalized_alias
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      (SELECT id FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'),
      'BOOST',
      'boost'
    )$$,
  '23505',
  NULL,
  'alias uniqueness is enforced per workspace'
);

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status,
  source_snapshot_id, supersedes_object_id
) VALUES (
  'a1600000-0000-4000-8000-00000000e6a3',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'credential',
  'Countries of operation 2026',
  'countries of operation 2026',
  'EFESO operates in 35 countries.',
  'active',
  'f1000000-0000-4000-8000-00000000e6aa',
  (SELECT id FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1')
);

SELECT isnt(
  (SELECT supersedes_object_id FROM public.efeso_knowledge_objects WHERE id = 'a1600000-0000-4000-8000-00000000e6a3'),
  NULL,
  'versioning via supersedes_object_id is stored without deleting the past'
);

SELECT throws_ok(
  $$UPDATE public.efeso_knowledge_objects
      SET source_snapshot_id = 'f1000000-0000-4000-8000-00000000e6aa',
          origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a2'
      WHERE id = 'a1600000-0000-4000-8000-00000000e6a3'$$,
  '23001',
  NULL,
  'knowledge object provenance cannot be rewritten'
);

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
) VALUES (
  'a1600000-0000-4000-8000-00000000e6a4',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'industry_expertise',
  'Automotive',
  'automotive',
  'Automotive expertise.',
  'active',
  'f1000000-0000-4000-8000-00000000e6aa'
);

SELECT lives_ok(
  $$INSERT INTO public.knowledge_object_relations (
      workspace_id, source_object_id, target_object_id, relation_type, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      (SELECT id FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'),
      'a1600000-0000-4000-8000-00000000e6a4',
      'applicable_to_industry',
      'needs_review'
    )$$,
  'closed knowledge relations can be persisted for review'
);

SELECT throws_ok(
  $$INSERT INTO public.knowledge_object_relations (
      workspace_id, source_object_id, target_object_id, relation_type, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      (SELECT id FROM public.efeso_knowledge_objects WHERE origin_candidate_id = 'a1500000-0000-4000-8000-00000000e6a1'),
      'a1600000-0000-4000-8000-00000000e6a4',
      'invented_by_model',
      'active'
    )$$,
  '23514',
  NULL,
  'invented relation types are rejected'
);

SELECT * FROM finish();

ROLLBACK;
