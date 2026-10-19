BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(9);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
    'authenticated', 'authenticated', 'research-outsider@signal.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-4fff-8fff-fffffffffff6',
    'authenticated', 'authenticated', 'research-member@efeso.com',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.profiles (id, full_name, job_title) VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'Outsider', 'External'),
  ('ffffffff-ffff-4fff-8fff-fffffffffff6', 'Research Member', 'Consultor');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status, provisioned_reason)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'ffffffff-ffff-4fff-8fff-fffffffffff6',
  'member',
  'active',
  'demo_seed'
);

INSERT INTO public.external_research_runs (
  id, workspace_id, requested_query, normalized_query, status, created_by
) VALUES (
  'aa100000-0000-4000-8000-00000000e001',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'Suzano',
  'suzano',
  'queued',
  'ffffffff-ffff-4fff-8fff-fffffffffff6'
);

INSERT INTO public.external_source_candidates (
  workspace_id, research_run_id, url, normalized_url, publisher, source_type, source_tier, source_quality, status
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'aa100000-0000-4000-8000-00000000e001',
  'https://www.suzano.com.br/investors',
  'https://suzano.com.br/investors',
  'Suzano',
  'official_page',
  1,
  'primary',
  'discovered'
);

SELECT set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.external_research_runs), 0, 'outsider cannot SELECT research runs');
SELECT is((SELECT count(*)::int FROM public.external_source_candidates), 0, 'outsider cannot SELECT source candidates');

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-fffffffffff6', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', 'ffffffff-ffff-4fff-8fff-fffffffffff6', 'role', 'authenticated', 'aud', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is((SELECT count(*)::int FROM public.external_research_runs) > 0, true, 'member can SELECT workspace research runs');

SELECT lives_ok(
  $$INSERT INTO public.external_research_runs (
      workspace_id, requested_query, normalized_query, status, created_by
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'Natura',
      'natura',
      'queued',
      'ffffffff-ffff-4fff-8fff-fffffffffff6'
    )$$,
  'member can create a queued research run'
);

SELECT throws_ok(
  $$INSERT INTO public.external_research_runs (
      workspace_id, requested_query, normalized_query, status, created_by, accepted_source_count
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'Forge',
      'forge',
      'completed',
      'ffffffff-ffff-4fff-8fff-fffffffffff6',
      9
    )$$,
  '42501',
  NULL,
  'member cannot insert a completed research run'
);

SELECT throws_ok(
  $$UPDATE public.external_research_runs
      SET status = 'completed'
      WHERE id = 'aa100000-0000-4000-8000-00000000e001'$$,
  '42501',
  NULL,
  'member cannot mark a research run completed'
);

SELECT throws_ok(
  $$INSERT INTO public.external_source_candidates (
      workspace_id, research_run_id, url, normalized_url, publisher, source_type, source_tier, source_quality, status
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'aa100000-0000-4000-8000-00000000e001',
      'https://evil.example/official',
      'https://evil.example/official',
      'Evil',
      'official_page',
      1,
      'primary',
      'accepted'
    )$$,
  '42501',
  NULL,
  'member cannot forge an accepted source candidate'
);

SELECT lives_ok(
  $$UPDATE public.external_research_runs
      SET status = 'cancelled'
      WHERE id = 'aa100000-0000-4000-8000-00000000e001'$$,
  'member can cancel an in-progress run they created'
);

SELECT throws_ok(
  $$INSERT INTO public.external_research_events (
      workspace_id, research_run_id, event_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'aa100000-0000-4000-8000-00000000e001',
      'run_completed'
    )$$,
  '42501',
  NULL,
  'member cannot insert research audit events'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
