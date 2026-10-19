-- SIGNAL Sprint 3 — extraction-chain database integrity.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

INSERT INTO public.workspaces (id, name, slug, country_code, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
  'Extraction Integrity B',
  'efeso-extraction-integrity-b',
  'IT',
  'active'
);

INSERT INTO public.companies (id, workspace_id, slug, display_name, resolution_status)
VALUES (
  'a1000000-0000-4000-8000-00000000e3bb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
  'extraction-b',
  'Extraction B Co',
  'resolved'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES
  (
    'c1000000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'a1000000-0000-4000-8000-00000000e3bb',
    'Extraction B analysis',
    'draft'
  ),
  (
    'c1000000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Extraction A analysis',
    'draft'
  ),
  (
    'c1000000-0000-4000-8000-00000000e3a2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'Extraction Vale analysis',
    'draft'
  );

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES
  (
    'd1000000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'c1000000-0000-4000-8000-00000000e3bb',
    'v-test',
    'v-test',
    'queued'
  ),
  (
    'd1000000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e3aa',
    'v-test',
    'v-test',
    'queued'
  ),
  (
    'd1000000-0000-4000-8000-00000000e3a2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e3a2',
    'v-test',
    'v-test',
    'queued'
  );

INSERT INTO public.sources (id, workspace_id, publisher_name, source_type, source_tier)
VALUES
  (
    'e1000000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'Extraction B Press',
    'other',
    'E'
  ),
  (
    'e1000000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'Extraction A Press',
    'other',
    'E'
  );

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES
  (
    'f1000000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'e1000000-0000-4000-8000-00000000e3bb',
    'hash-b-extraction',
    'partial',
    'b'
  ),
  (
    'f1000000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000e3aa',
    'hash-a-extraction',
    'partial',
    'SYNTHETIC A'
  );

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version
) VALUES
  (
    'b1000000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'f1000000-0000-4000-8000-00000000e3bb',
    0,
    'paragraph',
    'block b',
    'hash-block-b',
    'plain-text-signal',
    'plain-text-signal-v1'
  ),
  (
    'b1000000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000e3aa',
    0,
    'paragraph',
    'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
    'hash-block-a',
    'plain-text-signal',
    'plain-text-signal-v1'
  );

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash
) VALUES
  (
    'a1100000-0000-4000-8000-00000000e3aa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000e3aa',
    'd1000000-0000-4000-8000-00000000e3aa',
    'f1000000-0000-4000-8000-00000000e3aa',
    'claim_extraction',
    'openai',
    'gpt-6-luna',
    'claim-extraction-v1',
    'claim-extraction-schema-v1',
    'completed',
    'input-hash-a'
  ),
  (
    'a1100000-0000-4000-8000-00000000e3bb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
    'c1000000-0000-4000-8000-00000000e3bb',
    'd1000000-0000-4000-8000-00000000e3bb',
    'f1000000-0000-4000-8000-00000000e3bb',
    'claim_extraction',
    'openai',
    'gpt-6-luna',
    'claim-extraction-v1',
    'claim-extraction-schema-v1',
    'completed',
    'input-hash-b'
  );

INSERT INTO public.claim_candidates (
  id, workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
  origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type, status
) VALUES (
  'a1200000-0000-4000-8000-00000000e3aa',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e3aa',
  'd1000000-0000-4000-8000-00000000e3aa',
  'a1000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-00000000e3aa',
  'a1100000-0000-4000-8000-00000000e3aa',
  'fp-a',
  'The company announced an investment of R$500 million in its Brazilian manufacturing operation.',
  'investment',
  'fact',
  'validated'
);

-- 1) SourceContentBlock in wrong workspace.
SELECT throws_ok(
  $$INSERT INTO public.source_content_blocks (
      workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
      parser_name, parser_version
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'f1000000-0000-4000-8000-00000000e3bb',
      1, 'paragraph', 'cross', 'h', 'plain-text-signal', 'plain-text-signal-v1'
    )$$,
  '23503',
  NULL,
  'source_content_blocks rejects snapshot from another workspace'
);

-- 2) Candidate using Analysis from another workspace.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidates (
      workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
      origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e3bb',
      'd1000000-0000-4000-8000-00000000e3aa',
      'a1000000-0000-4000-8000-000000000001',
      'f1000000-0000-4000-8000-00000000e3aa',
      'a1100000-0000-4000-8000-00000000e3aa',
      'fp-x2', 'x', 'other', 'fact'
    )$$,
  '23503',
  NULL,
  'claim_candidates rejects Analysis from another workspace'
);

-- 3) Candidate using ResearchRun from another Analysis.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidates (
      workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
      origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e3aa',
      'd1000000-0000-4000-8000-00000000e3a2',
      'a1000000-0000-4000-8000-000000000001',
      'f1000000-0000-4000-8000-00000000e3aa',
      'a1100000-0000-4000-8000-00000000e3aa',
      'fp-x3', 'x', 'other', 'fact'
    )$$,
  '23503',
  NULL,
  'claim_candidates rejects ResearchRun from another Analysis'
);

-- 4) Candidate using Snapshot from another workspace.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidates (
      workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
      origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e3aa',
      'd1000000-0000-4000-8000-00000000e3aa',
      'a1000000-0000-4000-8000-000000000001',
      'f1000000-0000-4000-8000-00000000e3bb',
      'a1100000-0000-4000-8000-00000000e3aa',
      'fp-x4', 'x', 'other', 'fact'
    )$$,
  '23503',
  NULL,
  'claim_candidates rejects Snapshot from another workspace'
);

-- 5) Candidate entity from another Company.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidates (
      workspace_id, analysis_id, research_run_id, company_id, source_snapshot_id,
      origin_model_run_id, candidate_fingerprint, proposed_statement, claim_category, claim_type,
      entity_id
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e3aa',
      'd1000000-0000-4000-8000-00000000e3aa',
      'a1000000-0000-4000-8000-000000000001',
      'f1000000-0000-4000-8000-00000000e3aa',
      'a1100000-0000-4000-8000-00000000e3aa',
      'fp-x5', 'x', 'other', 'fact',
      'b1000000-0000-4000-8000-000000000021'
    )$$,
  '23503',
  NULL,
  'claim_candidates rejects entity from another Company'
);

-- 6) CandidateEvidence citing a block from another Snapshot.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidate_evidence (
      workspace_id, claim_candidate_id, source_content_block_id, source_snapshot_id,
      origin_model_run_id, exact_quote
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a1200000-0000-4000-8000-00000000e3aa',
      'b1000000-0000-4000-8000-00000000e3bb',
      'f1000000-0000-4000-8000-00000000e3aa',
      'a1100000-0000-4000-8000-00000000e3aa',
      'block b'
    )$$,
  '23503',
  NULL,
  'claim_candidate_evidence rejects block from another Snapshot'
);

-- 7) CandidateEvidence with mismatched workspace.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidate_evidence (
      workspace_id, claim_candidate_id, source_content_block_id, source_snapshot_id,
      origin_model_run_id, exact_quote
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
      'a1200000-0000-4000-8000-00000000e3aa',
      'b1000000-0000-4000-8000-00000000e3aa',
      'f1000000-0000-4000-8000-00000000e3aa',
      'a1100000-0000-4000-8000-00000000e3aa',
      'quote'
    )$$,
  '23503',
  NULL,
  'claim_candidate_evidence rejects mismatched workspace'
);

-- 8) CandidateValidation linked across workspace.
SELECT throws_ok(
  $$INSERT INTO public.claim_candidate_validations (
      workspace_id, claim_candidate_id, validator_code, validator_version, validator_type, result, severity
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-0000000000e3',
      'a1200000-0000-4000-8000-00000000e3aa',
      'schema_validity', 'deterministic-v1', 'deterministic', 'pass', 'info'
    )$$,
  '23503',
  NULL,
  'claim_candidate_validations rejects cross-workspace candidate'
);

-- 9) ModelRun using unrelated ResearchRun.
SELECT throws_ok(
  $$INSERT INTO public.model_runs (
      workspace_id, analysis_id, research_run_id, source_snapshot_id,
      task_type, provider, model_name, prompt_version, schema_version, status, input_hash
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000e3aa',
      'd1000000-0000-4000-8000-00000000e3a2',
      'f1000000-0000-4000-8000-00000000e3aa',
      'claim_extraction', 'openai', 'gpt-6-luna',
      'claim-extraction-v1', 'claim-extraction-schema-v1', 'running', 'x'
    )$$,
  '23503',
  NULL,
  'model_runs rejects ResearchRun from another Analysis'
);

-- 10) Final Claim origin Candidate from another Analysis/workspace.
INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id,
  statement, claim_category
) VALUES (
  'a3000000-0000-4000-8000-00000000e3a2',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000e3a2',
  'd1000000-0000-4000-8000-00000000e3a2',
  'a1000000-0000-4000-8000-000000000002',
  'vale claim',
  'other'
);

SELECT throws_ok(
  $$UPDATE public.claims
      SET origin_claim_candidate_id = 'a1200000-0000-4000-8000-00000000e3aa'
      WHERE id = 'a3000000-0000-4000-8000-00000000e3a2'$$,
  '23503',
  NULL,
  'claims rejects origin candidate from another Analysis/company'
);

-- 11) EvidenceFragment block from another Snapshot.
SELECT throws_ok(
  $$INSERT INTO public.evidence_fragments (
      workspace_id, source_snapshot_id, source_content_block_id, fragment_type, excerpt
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'f1000000-0000-4000-8000-00000000e3aa',
      'b1000000-0000-4000-8000-00000000e3bb',
      'paragraph',
      'cross block'
    )$$,
  '23503',
  NULL,
  'evidence_fragments rejects block from another Snapshot'
);

-- 12) UPDATE of immutable SourceContentBlock.
SELECT throws_ok(
  $$UPDATE public.source_content_blocks
      SET text_content = 'mutated'
      WHERE id = 'b1000000-0000-4000-8000-00000000e3aa'$$,
  '23001',
  NULL,
  'source_content_blocks UPDATE is rejected'
);

-- 13) DELETE of immutable SourceContentBlock.
SELECT throws_ok(
  $$DELETE FROM public.source_content_blocks
      WHERE id = 'b1000000-0000-4000-8000-00000000e3aa'$$,
  '23001',
  NULL,
  'source_content_blocks DELETE is rejected'
);

-- Parser versioning: v2 may insert without modifying v1.
INSERT INTO public.source_content_blocks (
  workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash,
  parser_name, parser_version
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'f1000000-0000-4000-8000-00000000e3aa',
  0,
  'paragraph',
  'v2 text',
  'hash-v2',
  'pdfjs-signal',
  'pdfjs-signal-v2'
);

SELECT is(
  (SELECT count(*)::int FROM public.source_content_blocks
     WHERE source_snapshot_id = 'f1000000-0000-4000-8000-00000000e3aa'),
  2,
  'same snapshot may have two parser versions without overwriting v1'
);

SELECT * FROM finish();

ROLLBACK;
