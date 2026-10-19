BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(11);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41',
  'authenticated', 'authenticated', 'gov-member@signal.test',
  crypt('test-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
), (
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb41',
  'authenticated', 'authenticated', 'gov-outsider@signal.test',
  crypt('test-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41', 'Gov Member', 'Tester'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb41', 'Gov Outsider', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41',
  'member',
  'active'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000e641',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Governance analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000e641',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e641',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000e641',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'EFESO Catalog',
  'internal_efeso',
  'A'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000e641',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000e641',
  'hash-gov',
  'metadata_only',
  'catalog'
);

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status,
  source_snapshot_id, visibility_level, confidentiality_level, knowledge_nature, outcome_status,
  approved_for_display, approved_for_matching, commercial_terms_present
) VALUES
  (
    'a1600000-0000-4000-8000-00000000e641',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability',
    'Visible Capability',
    'visible capability',
    'Member visible catalog object.',
    'active',
    'f1000000-0000-4000-8000-00000000e641',
    'efeso_member',
    'internal',
    'reusable_methodology',
    'not_applicable',
    true,
    true,
    false
  ),
  (
    'a1600000-0000-4000-8000-00000000e642',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability',
    'Restricted Capability',
    'restricted capability',
    'Account-team only.',
    'active',
    'f1000000-0000-4000-8000-00000000e641',
    'restricted_account_team',
    'confidential',
    'proposed_scope',
    'proposed',
    false,
    true,
    false
  ),
  (
    'a1600000-0000-4000-8000-00000000e643',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability',
    'Admin Only Capability',
    'admin only capability',
    'Admin only.',
    'active',
    'f1000000-0000-4000-8000-00000000e641',
    'admin_only',
    'highly_confidential',
    'institutional_fact',
    'not_applicable',
    false,
    false,
    true
  );

SELECT throws_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id,
      knowledge_nature, outcome_status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'case',
      'Fake delivered proposal',
      'fake delivered proposal',
      'A proposal is not a delivered case.',
      'active',
      'f1000000-0000-4000-8000-00000000e641',
      'proposed_scope',
      'delivered'
    )$$,
  '23514',
  NULL,
  'proposed_scope cannot be delivered'
);

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE canonical_name = 'Visible Capability'),
  1,
  'member reads efeso_member catalog objects'
);

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE canonical_name = 'Restricted Capability'),
  0,
  'member does not read restricted_account_team objects'
);

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE canonical_name = 'Admin Only Capability'),
  0,
  'member does not read admin_only objects'
);

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE commercial_terms_present),
  0,
  'member does not read commercial-term objects'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb41', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb41', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE workspace_id = '0e8f0e50-b2a1-4c3d-9e7f-000000000001'),
  0,
  'outsider reads no workspace knowledge'
);

RESET ROLE;

SELECT ok(
  EXISTS (SELECT 1 FROM public.knowledge_tags WHERE category = 'SERVICE_FAMILY' AND canonical_name = 'Manufacturing'),
  'service family taxonomy is present'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'low OEE'),
  'canonical business problems are present'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Mining, Metals and Minerals'),
  'canonical industries are present'
);

SELECT ok(
  (SELECT count(*)::int FROM public.efeso_knowledge_objects WHERE id = 'a1600000-0000-4000-8000-00000000e642' AND approved_for_matching) = 1,
  'restricted object can remain approved for matching at rest'
);

SELECT throws_ok(
  $$INSERT INTO public.efeso_knowledge_objects (
      workspace_id, object_type, canonical_name, normalized_name, short_description, status, source_snapshot_id,
      knowledge_nature, outcome_status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'result',
      'Fake expected saving',
      'fake expected saving',
      'Expected benefit is not delivered.',
      'active',
      'f1000000-0000-4000-8000-00000000e641',
      'expected_benefit',
      'delivered'
    )$$,
  '23514',
  NULL,
  'expected_benefit cannot be delivered'
);

SELECT * FROM finish();
ROLLBACK;
