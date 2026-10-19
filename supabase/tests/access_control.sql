-- SIGNAL Sprint 4.5 — domain/membership is enforced in the app;
-- this file proves the database still denies authenticated users without membership.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(16);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    'authenticated',
    'authenticated',
    'rls-outsider@signal.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    'authenticated',
    'authenticated',
    'rls-member@efeso.com',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.profiles (id, full_name, job_title)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'External User', 'External'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'Demo Member', 'Consultor');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status, provisioned_reason)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
  'member',
  'active',
  'demo_seed'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Access control analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000ac01',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'Access Control Press',
  'other',
  'E'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000ac01',
  'hash-access-control',
  'partial',
  'private snapshot'
);

INSERT INTO public.evidence_fragments (
  id, workspace_id, source_snapshot_id, fragment_type, excerpt
) VALUES (
  'a2000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'f1000000-0000-4000-8000-00000000ac01',
  'paragraph',
  'private fragment'
);

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id, statement, claim_category
) VALUES (
  'a3000000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000ac01',
  'd1000000-0000-4000-8000-00000000ac01',
  'a1000000-0000-4000-8000-000000000001',
  'private claim',
  'other'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000ac01',
  'd1000000-0000-4000-8000-00000000ac01',
  'f1000000-0000-4000-8000-00000000ac01',
  'knowledge_extraction',
  'fake',
  'test',
  'v1',
  'v1',
  'completed',
  'hash-access-run'
);

INSERT INTO public.knowledge_candidates (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint, status
) VALUES (
  'a1500000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000ac01',
  'd1000000-0000-4000-8000-00000000ac01',
  'f1000000-0000-4000-8000-00000000ac01',
  'a1100000-0000-4000-8000-00000000ac01',
  'capability',
  'Private Capability',
  'private capability',
  'private knowledge candidate',
  'fp-access-private',
  'validated'
);

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
) VALUES (
  'a1600000-0000-4000-8000-00000000ac01',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'capability',
  'Private Capability',
  'private capability',
  'private knowledge object',
  'active',
  'f1000000-0000-4000-8000-00000000ac01'
);

-- Authenticated outsider, no membership.
SELECT set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.companies), 0, 'unauthorized user cannot SELECT companies');
SELECT is((SELECT count(*)::int FROM public.claims), 0, 'unauthorized user cannot SELECT claims');
SELECT is((SELECT count(*)::int FROM public.evidence_fragments), 0, 'unauthorized user cannot SELECT evidence');
SELECT is((SELECT count(*)::int FROM public.sources), 0, 'unauthorized user cannot SELECT sources');
SELECT is((SELECT count(*)::int FROM public.source_snapshots), 0, 'unauthorized user cannot SELECT snapshots');
SELECT is((SELECT count(*)::int FROM public.efeso_knowledge_objects), 0, 'unauthorized user cannot SELECT knowledge objects');
SELECT is((SELECT count(*)::int FROM public.knowledge_candidates), 0, 'unauthorized user cannot SELECT knowledge candidates');
SELECT is((SELECT count(*)::int FROM public.model_runs), 0, 'unauthorized user cannot SELECT model runs');
SELECT is((SELECT count(*)::int FROM public.workspaces), 0, 'unauthorized user cannot SELECT workspaces');

SELECT throws_ok(
  $$INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
    VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'admin',
      'active'
    )$$,
  '42501',
  NULL,
  'unauthorized user cannot INSERT membership'
);

SELECT throws_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'capability', 'Forged', 'forged', 'forged', 'active',
      'f1000000-0000-4000-8000-00000000ac01'
    )$$,
  '42501',
  NULL,
  'unauthorized user cannot INSERT knowledge objects'
);

SELECT throws_ok(
  $$SELECT public.promote_claim_candidate('00000000-0000-4000-8000-000000000001')$$,
  NULL,
  'unauthorized RPC does not succeed'
);

SELECT throws_ok(
  'SELECT count(*)::int FROM public.access_audit_events',
  '42501',
  NULL,
  'authenticated clients cannot SELECT access audit events'
);

UPDATE public.claims SET statement = 'forged claim' WHERE id = 'a3000000-0000-4000-8000-00000000ac01';
RESET ROLE;

SELECT is(
  (SELECT statement FROM public.claims WHERE id = 'a3000000-0000-4000-8000-00000000ac01'),
  'private claim',
  'unauthorized user cannot alter a claim'
);

-- Member cannot escalate role (no UPDATE grant on memberships).
SELECT set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$UPDATE public.workspace_memberships SET role = 'admin'
    WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'$$,
  '42501',
  NULL,
  'member cannot escalate role'
);

SELECT throws_ok(
  $$INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
    VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'member',
      'active'
    )$$,
  '42501',
  NULL,
  'member cannot INSERT another membership'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
