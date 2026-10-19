-- SIGNAL Sprint 2 — evidence-chain database integrity.
-- Executes invalid operations and asserts PostgreSQL rejects them.
--
-- Run (local Supabase must be up):
--   npm run test:evidence

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

-- Workspace B + company + analysis + run (seed already has Workspace A / Natura / Vale).
INSERT INTO public.workspaces (id, name, slug, country_code, status)
VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
  'Evidence Integrity B',
  'efeso-evidence-integrity-b',
  'IT',
  'active'
);

INSERT INTO public.companies (id, workspace_id, slug, display_name, resolution_status)
VALUES (
  'a1000000-0000-4000-8000-00000000eebb',
  '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
  'integrity-b',
  'Integrity B Co',
  'resolved'
);

INSERT INTO public.analyses (id, workspace_id, company_id, title, status)
VALUES
  (
    'c1000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'a1000000-0000-4000-8000-00000000eebb',
    'Integrity B analysis',
    'draft'
  ),
  (
    'c1000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Integrity A analysis',
    'draft'
  ),
  (
    'c1000000-0000-4000-8000-00000000eea2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'Integrity Vale analysis',
    'draft'
  );

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status
) VALUES
  (
    'd1000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'c1000000-0000-4000-8000-00000000eebb',
    'v-test',
    'v-test',
    'queued'
  ),
  (
    'd1000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000eeaa',
    'v-test',
    'v-test',
    'queued'
  ),
  (
    'd1000000-0000-4000-8000-00000000eea2',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000eea2',
    'v-test',
    'v-test',
    'queued'
  );

INSERT INTO public.sources (
  id, workspace_id, publisher_name, source_type, source_tier
) VALUES
  (
    'e1000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'Integrity B Press',
    'other',
    'E'
  ),
  (
    'e1000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'Integrity A Press',
    'other',
    'E'
  );

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES
  (
    'f1000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'e1000000-0000-4000-8000-00000000eebb',
    'hash-b-integrity',
    'partial',
    'b'
  ),
  (
    'f1000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000eeaa',
    'hash-a-integrity',
    'partial',
    'Este conteúdo sintético versão A.'
  );

INSERT INTO public.evidence_fragments (
  id, workspace_id, source_snapshot_id, fragment_type, excerpt
) VALUES
  (
    'a2000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'f1000000-0000-4000-8000-00000000eebb',
    'quote',
    'fragment b'
  ),
  (
    'a2000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000eeaa',
    'quote',
    'fragment a'
  );

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id,
  statement, claim_category
) VALUES
  (
    'a3000000-0000-4000-8000-00000000eebb',
    '0e8f0e50-b2a1-4c3d-9e7f-0000000000eb',
    'c1000000-0000-4000-8000-00000000eebb',
    'd1000000-0000-4000-8000-00000000eebb',
    'a1000000-0000-4000-8000-00000000eebb',
    'claim b',
    'other'
  ),
  (
    'a3000000-0000-4000-8000-00000000eeaa',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000eeaa',
    'd1000000-0000-4000-8000-00000000eeaa',
    'a1000000-0000-4000-8000-000000000001',
    'claim a',
    'other'
  );

-- 1) ResearchRunSource cannot mix Source and ResearchRun workspaces.
SELECT throws_ok(
  $$INSERT INTO public.research_run_sources (
      workspace_id, research_run_id, source_id, research_wave
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'd1000000-0000-4000-8000-00000000eebb',
      'e1000000-0000-4000-8000-00000000eeaa',
      'manual'
    )$$,
  '23503',
  NULL,
  'research_run_sources rejects mixed-workspace run/source'
);

-- 2) SourceSnapshot cannot use a Source from another workspace.
SELECT throws_ok(
  $$INSERT INTO public.source_snapshots (
      workspace_id, source_id, content_hash, snapshot_mode
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'e1000000-0000-4000-8000-00000000eebb',
      'cross-workspace-hash',
      'partial'
    )$$,
  '23503',
  NULL,
  'source_snapshots rejects Source from another workspace'
);

-- 3) EvidenceFragment workspace must match SourceSnapshot workspace.
SELECT throws_ok(
  $$INSERT INTO public.evidence_fragments (
      workspace_id, source_snapshot_id, fragment_type, excerpt
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'f1000000-0000-4000-8000-00000000eebb',
      'quote',
      'mismatched fragment'
    )$$,
  '23503',
  NULL,
  'evidence_fragments rejects mismatched snapshot workspace'
);

-- 4) Claim cannot attach to an Analysis from another workspace.
SELECT throws_ok(
  $$INSERT INTO public.claims (
      workspace_id, analysis_id, originating_research_run_id, company_id,
      statement, claim_category
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000eebb',
      'd1000000-0000-4000-8000-00000000eeaa',
      'a1000000-0000-4000-8000-000000000001',
      'cross analysis claim',
      'other'
    )$$,
  '23503',
  NULL,
  'claims rejects Analysis from another workspace'
);

-- 5) Claim.company_id must match Analysis.company_id.
SELECT throws_ok(
  $$INSERT INTO public.claims (
      workspace_id, analysis_id, originating_research_run_id, company_id,
      statement, claim_category
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000eeaa',
      'd1000000-0000-4000-8000-00000000eeaa',
      'a1000000-0000-4000-8000-000000000002',
      'wrong company claim',
      'other'
    )$$,
  '23503',
  NULL,
  'claims rejects company that does not match Analysis.company_id'
);

-- 6) originating ResearchRun must belong to the same Analysis.
SELECT throws_ok(
  $$INSERT INTO public.claims (
      workspace_id, analysis_id, originating_research_run_id, company_id,
      statement, claim_category
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000eeaa',
      'd1000000-0000-4000-8000-00000000eea2',
      'a1000000-0000-4000-8000-000000000001',
      'wrong run claim',
      'other'
    )$$,
  '23503',
  NULL,
  'claims rejects ResearchRun from another Analysis'
);

-- 7) entity_id must belong to Claim.company_id.
SELECT throws_ok(
  $$INSERT INTO public.claims (
      workspace_id, analysis_id, originating_research_run_id, company_id,
      entity_id, statement, claim_category
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000eeaa',
      'd1000000-0000-4000-8000-00000000eeaa',
      'a1000000-0000-4000-8000-000000000001',
      'b1000000-0000-4000-8000-000000000021',
      'wrong entity claim',
      'other'
    )$$,
  '23503',
  NULL,
  'claims rejects entity_id belonging to another Company'
);

-- 8) ClaimEvidence cannot connect Claim and EvidenceFragment from different workspaces.
SELECT throws_ok(
  $$INSERT INTO public.claim_evidence (
      workspace_id, claim_id, evidence_fragment_id, relationship, directness
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'a3000000-0000-4000-8000-00000000eeaa',
      'a2000000-0000-4000-8000-00000000eebb',
      'supports',
      'direct'
    )$$,
  '23503',
  NULL,
  'claim_evidence rejects cross-workspace fragment'
);

-- 9) supersedes_claim_id must stay in the same workspace/analysis/company.
SELECT throws_ok(
  $$INSERT INTO public.claims (
      workspace_id, analysis_id, originating_research_run_id, company_id,
      statement, claim_category, supersedes_claim_id
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'c1000000-0000-4000-8000-00000000eeaa',
      'd1000000-0000-4000-8000-00000000eeaa',
      'a1000000-0000-4000-8000-000000000001',
      'superseding claim',
      'other',
      'a3000000-0000-4000-8000-00000000eebb'
    )$$,
  '23503',
  NULL,
  'claims rejects supersedes_claim_id from another Analysis/company/workspace'
);

-- 10) source_snapshots UPDATE is rejected.
SELECT throws_ok(
  $$UPDATE public.source_snapshots
      SET title = 'mutated'
      WHERE id = 'f1000000-0000-4000-8000-00000000eeaa'$$,
  '23001',
  NULL,
  'source_snapshots UPDATE is rejected'
);

-- 11) source_snapshots DELETE is rejected.
SELECT throws_ok(
  $$DELETE FROM public.source_snapshots
      WHERE id = 'f1000000-0000-4000-8000-00000000eeaa'$$,
  '23001',
  NULL,
  'source_snapshots DELETE is rejected'
);

-- Snapshot A remains unchanged after the rejected UPDATE.
SELECT is(
  (SELECT title FROM public.source_snapshots WHERE id = 'f1000000-0000-4000-8000-00000000eeaa'),
  NULL,
  'snapshot A title remains unchanged after rejected UPDATE'
);

-- 12) Same Source + content_hash cannot create a second snapshot.
SELECT throws_ok(
  $$INSERT INTO public.source_snapshots (
      workspace_id, source_id, content_hash, snapshot_mode, normalized_text
    ) VALUES (
      '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
      'e1000000-0000-4000-8000-00000000eeaa',
      'hash-a-integrity',
      'partial',
      'duplicate'
    )$$,
  '23505',
  NULL,
  'source_snapshots rejects duplicate Source + content_hash'
);

-- A second distinct hash on the same Source is allowed (version B).
INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, content_hash, snapshot_mode, normalized_text
) VALUES (
  'f1000000-0000-4000-8000-00000000eeab',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'e1000000-0000-4000-8000-00000000eeaa',
  'hash-a-integrity-b',
  'partial',
  'Este conteúdo sintético versão B.'
);

SELECT is(
  (SELECT count(*)::int FROM public.source_snapshots
     WHERE source_id = 'e1000000-0000-4000-8000-00000000eeaa'),
  2,
  'same Source may have two snapshots with different hashes'
);

SELECT * FROM finish();

ROLLBACK;
