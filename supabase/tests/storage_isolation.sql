-- SIGNAL Sprint 2 — private source-files bucket isolation.
--
-- Run (local Supabase must be up):
--   npm run test:storage

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

INSERT INTO public.workspaces (id, name, slug, country_code, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc',
  'Storage Isolation B',
  'efeso-storage-isolation-b',
  'IT',
  'active'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'authenticated',
    'authenticated',
    'storage-user-a@signal.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'authenticated',
    'authenticated',
    'storage-user-b@signal.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.profiles (id, full_name, job_title)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Storage User A', 'Tester'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'Storage User B', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'consultant',
    'active'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'consultant',
    'active'
  );

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'source-files'),
  false,
  'source-files bucket is private'
);

INSERT INTO storage.objects (bucket_id, name, metadata)
VALUES
  (
    'source-files',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001/e1000000-0000-4000-8000-00000000staa/f1000000-0000-4000-8000-00000000staa/original.txt',
    '{}'::jsonb
  ),
  (
    'source-files',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc/e1000000-0000-4000-8000-00000000stbb/f1000000-0000-4000-8000-00000000stbb/original.txt',
    '{}'::jsonb
  );

-- Anon may have table SELECT privilege, but no policy grants source-files rows.
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'source-files'),
  0,
  'anon cannot read source-files objects'
);
RESET ROLE;

-- Workspace A member can read A objects, not B.
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

SELECT is(
  (
    SELECT count(*)::int FROM storage.objects
    WHERE bucket_id = 'source-files'
      AND name LIKE '0e8f0e50-b2a1-4c3d-9e7f-000000000001/%'
  ),
  1,
  'workspace A member can SELECT own source-files object'
);

SELECT is(
  (
    SELECT count(*)::int FROM storage.objects
    WHERE bucket_id = 'source-files'
      AND name LIKE '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc/%'
  ),
  0,
  'workspace A member cannot SELECT workspace B source-files object'
);

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'source-files',
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc/e1000000-0000-4000-8000-00000000stxx/f1000000-0000-4000-8000-00000000stxx/steal.txt',
      '{}'::jsonb
    )$$,
  '42501',
  NULL,
  'workspace A member cannot INSERT into workspace B source-files path'
);
RESET ROLE;

-- Workspace B member cannot read EFESO Brazil object.
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::int FROM storage.objects
    WHERE bucket_id = 'source-files'
      AND name LIKE '0e8f0e50-b2a1-4c3d-9e7f-000000000001/%'
  ),
  0,
  'workspace B member cannot SELECT EFESO Brazil source-files object'
);

SELECT is(
  (
    SELECT count(*)::int FROM storage.objects
    WHERE bucket_id = 'source-files'
      AND name LIKE '0e8f0e50-b2a1-4c3d-9e7f-0000000000cc/%'
  ),
  1,
  'workspace B member can SELECT own source-files object'
);

SELECT * FROM finish();

ROLLBACK;
