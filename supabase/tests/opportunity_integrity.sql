-- SIGNAL Sprint 7 — Opportunity integrity, promotion, RLS mutation.
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    'authenticated', 'authenticated', 'opp-admin@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22',
    'authenticated', 'authenticated', 'opp-member@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', 'Opp Admin', 'Tester'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', 'Opp Member', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', 'admin', 'active'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', 'member', 'active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

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
  'member cannot INSERT active Opportunity'
);

SELECT throws_ok(
  $$SELECT public.promote_opportunity_candidate('a2110000-0000-4000-8000-00000000d021')$$,
  '42501',
  NULL,
  'member cannot promote opportunity'
);

SELECT throws_ok(
  $$INSERT INTO public.opportunity_signals (
      workspace_id, opportunity_id, signal_id, relationship_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a2100000-0000-4000-8000-00000000d021',
      'a1700000-0000-4000-8000-00000000d024',
      'trigger'
    )$$,
  '42501',
  NULL,
  'member cannot forge OpportunitySignal'
);

SELECT throws_ok(
  $$INSERT INTO public.opportunity_rationales (
      workspace_id, opportunity_id, rationale_type, statement
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a2100000-0000-4000-8000-00000000d021',
      'uncertainty',
      'forged uncertainty'
    )$$,
  '42501',
  NULL,
  'member cannot alter rationale'
);

SELECT isnt_empty(
  $$SELECT id FROM public.opportunities WHERE status = 'active' AND company_id = 'a1000000-0000-4000-8000-000000000002'$$,
  'member can SELECT active opportunities in own workspace'
);

RESET ROLE;
SET LOCAL ROLE postgres;

SELECT throws_ok(
  $$UPDATE public.opportunities
      SET title = 'rewritten'
      WHERE id = 'a2100000-0000-4000-8000-00000000d021'$$,
  '23001',
  NULL,
  'opportunity title is immutable'
);

SELECT throws_ok(
  $$UPDATE public.opportunity_rationales SET statement = 'rewritten'$$,
  '23001',
  NULL,
  'opportunity rationales are immutable'
);

SELECT is(
  (SELECT count(*)::int FROM public.opportunity_signals os
     JOIN public.opportunities o ON o.id = os.opportunity_id
    WHERE o.id = 'a2100000-0000-4000-8000-00000000d021' AND os.relationship_type = 'trigger'),
  2,
  'demo Vale ramp-up opportunity has trigger Signals'
);

SELECT is(
  (SELECT count(*)::int FROM public.opportunity_efeso_fits
    WHERE opportunity_id = 'a2100000-0000-4000-8000-00000000d021' AND relationship_type = 'primary'),
  1,
  'demo Vale ramp-up opportunity has a primary EFESO Fit'
);

SELECT is(
  (SELECT confidence_tier FROM public.opportunities WHERE id = 'a2100000-0000-4000-8000-00000000d021'),
  'inferred',
  'demo Vale ramp-up remains inferred, not a confirmed client need'
);

SELECT * FROM finish();

ROLLBACK;
