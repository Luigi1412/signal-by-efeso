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

SELECT plan(6);

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

SELECT * FROM finish();

ROLLBACK;
