-- SIGNAL Sprint 3 — atomic Candidate promotion.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'authenticated',
  'authenticated',
  'promo-user@signal.test',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

INSERT INTO public.profiles (id, full_name, job_title)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Promo User', 'Tester');

INSERT INTO public.workspace_memberships (workspace_id, user_id, role, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'consultant',
  'active'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES (
  'c1000000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'Promotion analysis',
  'draft'
);

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES (
  'd1000000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e5aa',
  'v-test',
  'v-test',
  'queued'
);

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES (
  'e1000000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'Promotion Press',
  'other',
  'E'
);

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000e5aa',
  'hash-promo',
  'partial',
  'The company announced an investment of R$500 million in its Brazilian manufacturing operation.'
);

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version, page_number, section_title
) VALUES (
  'b1000000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'f1000000-0000-4000-8000-00000000e5aa',
  0,
  'paragraph',
  'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
  'hash-block-promo',
  'plain-text-signal',
  'plain-text-signal-v1',
  1,
  'Investments'
);

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES (
  'a1100000-0000-4000-8000-00000000e5aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e5aa',
  'd1000000-0000-4000-8000-00000000e5aa',
  'f1000000-0000-4000-8000-00000000e5aa',
  'claim_extraction',
  'openai',
  'gpt-6-luna',
  'claim-extraction-v1',
  'claim-extraction-schema-v1',
  'completed',
  'input-hash-promo'
);

INSERT INTO public.claim_candidates (
  id, workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
  origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type,
  assertion_mode, status
) VALUES
  (
    'a1200000-0000-4000-8000-00000000e5a1',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e5aa',
    'd1000000-0000-4000-8000-00000000e5aa',
    'a1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-00000000e5aa',
    'a1100000-0000-4000-8000-00000000e5aa',
    'fp-promo-1',
    'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
    'investment',
    'fact',
    'announced',
    'validated'
  ),
  (
    'a1200000-0000-4000-8000-00000000e5a2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e5aa',
    'd1000000-0000-4000-8000-00000000e5aa',
    'a1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-00000000e5aa',
    'a1100000-0000-4000-8000-00000000e5aa',
    'fp-promo-2',
    'Second validated candidate for failure simulation.',
    'investment',
    'fact',
    'announced',
    'validated'
  );

INSERT INTO public.claim_candidate_evidence (
  workspace_id, claim_candidate_id, source_content_block_id, source_snapshot_id,
  origin_model_run_id, exact_quote, relationship
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1200000-0000-4000-8000-00000000e5a1',
    'b1000000-0000-4000-8000-00000000e5aa',
    'f1000000-0000-4000-8000-00000000e5aa',
    'a1100000-0000-4000-8000-00000000e5aa',
    'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
    'supports'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1200000-0000-4000-8000-00000000e5a2',
    'b1000000-0000-4000-8000-00000000e5aa',
    'f1000000-0000-4000-8000-00000000e5aa',
    'a1100000-0000-4000-8000-00000000e5aa',
    'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
    'supports'
  );

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.promote_claim_candidate('a1200000-0000-4000-8000-00000000e5a1')$$,
  'validated candidate promotes successfully'
);

RESET ROLE;

SELECT is(
  (SELECT status FROM public.claim_candidates WHERE id = 'a1200000-0000-4000-8000-00000000e5a1'),
  'promoted',
  'candidate is marked promoted'
);

SELECT is(
  (SELECT count(*)::int FROM public.claims
     WHERE origin_claim_candidate_id = 'a1200000-0000-4000-8000-00000000e5a1'
       AND verification_status = 'supported'),
  1,
  'exactly one supported claim is created'
);

SELECT is(
  (SELECT count(*)::int FROM public.claim_evidence ce
     JOIN public.claims c ON c.id = ce.claim_id
     WHERE c.origin_claim_candidate_id = 'a1200000-0000-4000-8000-00000000e5a1'),
  1,
  'promoted claim has evidence'
);

CREATE OR REPLACE FUNCTION public.test_fail_claim_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('signal.test_fail_promotion', true) = 'on' THEN
    RAISE EXCEPTION 'simulated promotion failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER claims_test_fail_promotion
  BEFORE INSERT ON public.claims
  FOR EACH ROW EXECUTE PROCEDURE public.test_fail_claim_insert();

SELECT set_config('signal.test_fail_promotion', 'on', true);
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.promote_claim_candidate('a1200000-0000-4000-8000-00000000e5a2')$$,
  NULL,
  NULL,
  'simulated failure aborts promotion'
);

RESET ROLE;
SELECT set_config('signal.test_fail_promotion', 'off', true);

SELECT is(
  (SELECT status FROM public.claim_candidates WHERE id = 'a1200000-0000-4000-8000-00000000e5a2'),
  'validated',
  'failed promotion does not mark candidate promoted'
);

SELECT is(
  (SELECT count(*)::int FROM public.claims
     WHERE origin_claim_candidate_id = 'a1200000-0000-4000-8000-00000000e5a2'),
  0,
  'failed promotion does not leave a claim without evidence'
);

SELECT * FROM finish();

ROLLBACK;
