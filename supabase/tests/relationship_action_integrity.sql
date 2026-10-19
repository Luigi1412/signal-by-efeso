-- SIGNAL Sprint 8 — Relationship / Recommended Action integrity, RLS, immutability.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    'authenticated', 'authenticated', 'rel-admin@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    'authenticated', 'authenticated', 'rel-member@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31', 'Rel Admin', 'Tester'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32', 'Rel Member', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31', 'admin', 'active'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32', 'member', 'active');

INSERT INTO public.workspaces (id, name, slug, country_code, status)
VALUES ('0e8f0e50-b2a1-4c3d-9e7f-0000000000cc', 'Isolation Rel', 'isolation-rel', 'IT', 'active');

INSERT INTO public.companies (id, workspace_id, slug, display_name, resolution_status)
VALUES ('a1000000-0000-4000-8000-00000000cccc', '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc', 'secret-rel', 'Secret Rel', 'resolved');

INSERT INTO public.account_relationships (
  id, workspace_id, company_id, relationship_status, relationship_strength, data_quality, source_type, status, metadata
) VALUES (
  'a2210000-0000-4000-8000-00000000cccc',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc',
  'a1000000-0000-4000-8000-00000000cccc',
  'active_client', 'strong', 'verified', 'demo_seed', 'active', '{"origin":"other_workspace"}'::jsonb
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT throws_ok(
  $$INSERT INTO public.account_relationships (
      workspace_id, company_id, relationship_status, relationship_strength, data_quality, source_type, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'active_client', 'strong', 'verified', 'manual_admin_entry', 'active'
    )$$,
  '42501',
  NULL,
  'member cannot INSERT account_relationships'
);

SELECT throws_ok(
  $$UPDATE public.account_relationships
      SET relationship_strength = 'strong'
      WHERE id = 'a2210000-0000-4000-8000-00000000d002'$$,
  '42501',
  NULL,
  'member cannot raise relationship strength'
);

SELECT throws_ok(
  $$INSERT INTO public.recommended_actions (
      workspace_id, company_id, action_type, title, rationale, status, priority, confidence_tier
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'contact_account_owner', 'Forged', 'forged', 'active', 'high', 'direct'
    )$$,
  '42501',
  NULL,
  'member cannot INSERT active RecommendedAction'
);

SELECT throws_ok(
  $$SELECT public.promote_recommended_action_candidate('a2300000-0000-4000-8000-00000000d021')$$,
  '42501',
  NULL,
  'member cannot promote recommended action candidate'
);

SELECT is(
  (SELECT count(*)::int FROM public.recommended_action_candidates),
  0,
  'member cannot SELECT action candidates'
);

SELECT isnt_empty(
  $$SELECT id FROM public.recommended_actions WHERE status = 'active' AND company_id = 'a1000000-0000-4000-8000-000000000002'$$,
  'member can SELECT active recommended actions in own workspace'
);

SELECT is(
  (SELECT count(*)::int FROM public.account_relationships WHERE id = 'a2210000-0000-4000-8000-00000000cccc'),
  0,
  'member cannot SELECT relationship from another workspace'
);

SELECT is(
  (SELECT relationship_strength FROM public.account_relationships WHERE company_id = 'a1000000-0000-4000-8000-000000000003'),
  'unknown',
  'demo Raízen relationship strength remains unknown'
);

RESET ROLE;
SET LOCAL ROLE postgres;

SELECT throws_ok(
  $$UPDATE public.recommended_action_rationales SET statement = 'rewritten'$$,
  '23001',
  NULL,
  'recommended action rationales are immutable'
);

SELECT throws_ok(
  $$UPDATE public.recommended_actions
      SET title = 'rewritten'
      WHERE id = 'a2310000-0000-4000-8000-00000000d021'$$,
  '23001',
  NULL,
  'recommended action title is immutable'
);

SELECT is(
  (SELECT relationship_status FROM public.account_relationships WHERE id = 'a2210000-0000-4000-8000-00000000d001'),
  'active_client',
  'demo Vale is an explicit active_client'
);

SELECT is(
  (SELECT action_type FROM public.recommended_actions WHERE id = 'a2310000-0000-4000-8000-00000000d023'),
  'validate_relationship',
  'demo Raízen high opportunity with unknown relationship validates access'
);

SELECT is(
  (SELECT count(*)::int FROM public.company_relationship_contacts
    WHERE company_id = 'a1000000-0000-4000-8000-000000000002'
      AND relationship_role = 'account_owner'
      AND status = 'active'),
  1,
  'demo Vale has an explicit account owner'
);

SELECT is(
  (SELECT count(*)::int FROM public.company_relationship_contacts
    WHERE company_id = 'a1000000-0000-4000-8000-000000000003' AND status = 'active'),
  0,
  'demo Raízen has no invented contacts'
);

SELECT * FROM finish();

ROLLBACK;
