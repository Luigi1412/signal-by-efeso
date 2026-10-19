-- SIGNAL Sprint 6 — Account Intelligence / EFESO Fit integrity, promotion, RLS mutation.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(10);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
    'authenticated', 'authenticated', 'ai-admin@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
    'authenticated', 'authenticated', 'ai-member@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'AI Admin', 'Tester'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', 'AI Member', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'admin', 'active'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', 'member', 'active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

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
  'member cannot INSERT active account intelligence'
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
  'member cannot forge an active EFESO Fit'
);

SELECT throws_ok(
  $$SELECT public.promote_account_intelligence_candidate('a1910000-0000-4000-8000-00000000d021')$$,
  '42501',
  NULL,
  'member cannot promote account intelligence'
);

SELECT throws_ok(
  $$SELECT public.promote_efeso_fit_candidate('a1940000-0000-4000-8000-00000000d021')$$,
  '42501',
  NULL,
  'member cannot promote EFESO Fit'
);

SELECT isnt_empty(
  $$SELECT id FROM public.account_intelligence WHERE status = 'active' AND company_id = 'a1000000-0000-4000-8000-000000000001'$$,
  'member can SELECT active account intelligence in own workspace'
);

RESET ROLE;
SET LOCAL ROLE postgres;

SELECT throws_ok(
  $$UPDATE public.account_intelligence
      SET headline = 'rewritten'
      WHERE id = 'a1900000-0000-4000-8000-00000000d021'$$,
  '23001',
  NULL,
  'account intelligence headline is immutable'
);

SELECT throws_ok(
  $$UPDATE public.efeso_fits
      SET fit_level = 'low'
      WHERE id = 'a1930000-0000-4000-8000-00000000d022'$$,
  '23001',
  NULL,
  'efeso fit level is immutable'
);

SELECT throws_ok(
  $$UPDATE public.efeso_fit_components SET contribution = 5$$,
  '23001',
  NULL,
  'fit components are immutable'
);

SELECT is(
  (SELECT count(*)::int FROM public.account_intelligence WHERE company_id = 'a1000000-0000-4000-8000-000000000001' AND status = 'active'),
  1,
  'only one active account intelligence per company'
);

SELECT is(
  (SELECT fit_level FROM public.efeso_fits WHERE id = 'a1930000-0000-4000-8000-00000000d022'),
  'high',
  'demo Vale Asset Productivity fit is high and explainable'
);

SELECT * FROM finish();

ROLLBACK;
