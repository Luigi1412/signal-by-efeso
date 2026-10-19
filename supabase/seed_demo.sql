-- SIGNAL Sprint 4.5 — explicit CEO Preview demo dataset.
-- Synthetic. Not EFESO institutional facts. Idempotent on primary keys.

INSERT INTO public.analyses (
  id, workspace_id, company_id, title, status, research_focus, primary_country_code
) VALUES
  (
    'c1000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Natura — varredura de demonstração',
    'ready',
    'operational_excellence',
    'BR'
  ),
  (
    'c1000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'Vale — varredura de demonstração',
    'ready',
    'manufacturing',
    'BR'
  ),
  (
    'c1000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'Raízen — varredura de demonstração',
    'ready',
    'cost_profitability',
    'BR'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.research_runs (
  id, workspace_id, analysis_id, pipeline_version, research_policy_version, status, current_stage, progress_percent
) VALUES
  (
    'd1000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'v0.4.5-demo',
    'v0.4.5-demo',
    'completed',
    'completed',
    100
  ),
  (
    'd1000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'v0.4.5-demo',
    'v0.4.5-demo',
    'completed',
    'completed',
    100
  ),
  (
    'd1000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'v0.4.5-demo',
    'v0.4.5-demo',
    'completed',
    'completed',
    100
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sources (
  id, workspace_id, canonical_url, publisher_name, source_type, source_tier, access_type, language_code, country_code
) VALUES
  (
    'e1000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'https://signal.demo.invalid/natura',
    'SIGNAL Demo Dataset',
    'other',
    'E',
    'workspace_internal',
    'pt',
    'BR'
  ),
  (
    'e1000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'https://signal.demo.invalid/vale',
    'SIGNAL Demo Dataset',
    'other',
    'E',
    'workspace_internal',
    'pt',
    'BR'
  ),
  (
    'e1000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'https://signal.demo.invalid/raizen',
    'SIGNAL Demo Dataset',
    'other',
    'E',
    'workspace_internal',
    'pt',
    'BR'
  ),
  (
    'e1000000-0000-4000-8000-00000000d010',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'https://signal.demo.invalid/efeso-knowledge',
    'SIGNAL Demo Dataset',
    'internal_efeso',
    'E',
    'workspace_internal',
    'pt',
    'BR'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.research_run_sources (
  workspace_id, research_run_id, source_id, research_wave, disposition, discovery_method
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'd1000000-0000-4000-8000-00000000d001',
    'e1000000-0000-4000-8000-00000000d001',
    'manual',
    'retained',
    'manual'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'd1000000-0000-4000-8000-00000000d002',
    'e1000000-0000-4000-8000-00000000d002',
    'manual',
    'retained',
    'manual'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'd1000000-0000-4000-8000-00000000d003',
    'e1000000-0000-4000-8000-00000000d003',
    'manual',
    'retained',
    'manual'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'd1000000-0000-4000-8000-00000000d001',
    'e1000000-0000-4000-8000-00000000d010',
    'manual',
    'retained',
    'manual'
  )
ON CONFLICT (research_run_id, source_id) DO NOTHING;

INSERT INTO public.source_snapshots (
  id, workspace_id, source_id, captured_by_research_run_id, title, content_hash, snapshot_mode, normalized_text, metadata
) VALUES
  (
    'f1000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'SIGNAL Demo — Natura',
    'demo-hash-natura-v1',
    'partial',
    'SIGNAL DEMO DATASET. Natura é uma empresa brasileira de consumo e beleza usada neste preview. Este texto é sintético e não é um fato institucional da EFESO.',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'SIGNAL Demo — Vale',
    'demo-hash-vale-v1',
    'partial',
    'SIGNAL DEMO DATASET. Vale é uma empresa de mineração usada neste preview. Este texto é sintético e não é um fato institucional da EFESO.',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'SIGNAL Demo — Raízen',
    'demo-hash-raizen-v1',
    'partial',
    'SIGNAL DEMO DATASET. Raízen é uma empresa de energia e agronegócio usada neste preview. Este texto é sintético e não é um fato institucional da EFESO.',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-00000000d010',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'e1000000-0000-4000-8000-00000000d010',
    'd1000000-0000-4000-8000-00000000d001',
    'SIGNAL Demo — EFESO Knowledge pack',
    'demo-hash-knowledge-v1',
    'partial',
    'SIGNAL DEMO DATASET. Operational Excellence is a structured way to improve industrial performance. BOOST Methodology is a staged transformation approach used in this preview. Asset Productivity focuses on reliability and throughput. Brazil Manufacturing Expertise describes local industrial context. This pack is synthetic demo content, not an EFESO credential.',
    '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_content_blocks (
  id, workspace_id, source_snapshot_id, block_index, block_type, text_content, content_hash, parser_name, parser_version
) VALUES
  (
    'b1000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d001',
    0,
    'paragraph',
    'SIGNAL DEMO DATASET. Natura é uma empresa brasileira de consumo e beleza usada neste preview.',
    'demo-block-natura',
    'demo-seed',
    'demo-seed-v1'
  ),
  (
    'b1000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d002',
    0,
    'paragraph',
    'SIGNAL DEMO DATASET. Vale é uma empresa de mineração usada neste preview.',
    'demo-block-vale',
    'demo-seed',
    'demo-seed-v1'
  ),
  (
    'b1000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d003',
    0,
    'paragraph',
    'SIGNAL DEMO DATASET. Raízen é uma empresa de energia e agronegócio usada neste preview.',
    'demo-block-raizen',
    'demo-seed',
    'demo-seed-v1'
  ),
  (
    'b1000000-0000-4000-8000-00000000d010',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d010',
    0,
    'paragraph',
    'SIGNAL DEMO DATASET. Operational Excellence is a structured way to improve industrial performance. BOOST Methodology is a staged transformation approach used in this preview. Asset Productivity focuses on reliability and throughput. Brazil Manufacturing Expertise describes local industrial context.',
    'demo-block-knowledge',
    'demo-seed',
    'demo-seed-v1'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evidence_fragments (
  id, workspace_id, source_snapshot_id, fragment_type, excerpt, extraction_method
) VALUES
  (
    'a2000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d001',
    'paragraph',
    'SIGNAL DEMO DATASET. Natura é uma empresa brasileira de consumo e beleza usada neste preview.',
    'manual'
  ),
  (
    'a2000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d002',
    'paragraph',
    'SIGNAL DEMO DATASET. Vale é uma empresa de mineração usada neste preview.',
    'manual'
  ),
  (
    'a2000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'f1000000-0000-4000-8000-00000000d003',
    'paragraph',
    'SIGNAL DEMO DATASET. Raízen é uma empresa de energia e agronegócio usada neste preview.',
    'manual'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id, statement,
  claim_category, claim_type, verification_status, review_status, claim_status, country_code
) VALUES
  (
    'a3000000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'a1000000-0000-4000-8000-000000000001',
    'Dataset de demonstração: Natura aparece neste preview como empresa brasileira de consumo e beleza.',
    'market',
    'fact',
    'supported',
    'approved',
    'active',
    'BR'
  ),
  (
    'a3000000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'a1000000-0000-4000-8000-000000000002',
    'Dataset de demonstração: Vale aparece neste preview como empresa de mineração com operações no Brasil.',
    'manufacturing',
    'fact',
    'supported',
    'approved',
    'active',
    'BR'
  ),
  (
    'a3000000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'a1000000-0000-4000-8000-000000000003',
    'Dataset de demonstração: Raízen aparece neste preview como empresa integrada de energia e agronegócio.',
    'other',
    'fact',
    'supported',
    'approved',
    'active',
    'BR'
  ),
  (
    'a3000000-0000-4000-8000-00000000d011',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'a1000000-0000-4000-8000-000000000001',
    'Dataset de demonstração: Operational Excellence é descrito neste pack como melhoria estruturada de desempenho industrial.',
    'other',
    'fact',
    'supported',
    'approved',
    'active',
    'BR'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claim_evidence (
  workspace_id, claim_id, evidence_fragment_id, relationship, directness
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a3000000-0000-4000-8000-00000000d001',
    'a2000000-0000-4000-8000-00000000d001',
    'supports',
    'direct'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a3000000-0000-4000-8000-00000000d002',
    'a2000000-0000-4000-8000-00000000d002',
    'supports',
    'direct'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a3000000-0000-4000-8000-00000000d003',
    'a2000000-0000-4000-8000-00000000d003',
    'supports',
    'direct'
  )
ON CONFLICT (claim_id, evidence_fragment_id, relationship) DO NOTHING;

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash, metadata
) VALUES (
  'a1100000-0000-4000-8000-00000000d010',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'c1000000-0000-4000-8000-00000000d001',
  'd1000000-0000-4000-8000-00000000d001',
  'f1000000-0000-4000-8000-00000000d010',
  'knowledge_extraction',
  'fake',
  'demo-seed',
  'demo-seed-v1',
  'demo-seed-schema-v1',
  'completed',
  'demo-input-hash-knowledge',
  '{"origin":"demo_seed"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.knowledge_candidates (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint,
  status, metadata
) VALUES
  (
    'a1500000-0000-4000-8000-00000000d011',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'capability',
    'Operational Excellence',
    'operational excellence',
    'Dataset de demonstração: prática estruturada de melhoria de desempenho industrial.',
    'demo-fp-opex',
    'promoted',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d012',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'methodology',
    'BOOST Methodology',
    'boost methodology',
    'Dataset de demonstração: abordagem estagiada de transformação usada neste preview.',
    'demo-fp-boost',
    'promoted',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d013',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'capability',
    'Asset Productivity',
    'asset productivity',
    'Dataset de demonstração: foco em confiabilidade e throughput de ativos.',
    'demo-fp-asset',
    'promoted',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d014',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'industry_expertise',
    'Brazil Manufacturing Expertise',
    'brazil manufacturing expertise',
    'Dataset de demonstração: contexto industrial brasileiro para o preview executivo.',
    'demo-fp-brazil-mfg',
    'promoted',
    '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.knowledge_candidate_evidence (
  workspace_id, knowledge_candidate_id, source_content_block_id, source_snapshot_id,
  origin_model_run_id, exact_quote
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1500000-0000-4000-8000-00000000d011',
    'b1000000-0000-4000-8000-00000000d010',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'Operational Excellence is a structured way to improve industrial performance.'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1500000-0000-4000-8000-00000000d012',
    'b1000000-0000-4000-8000-00000000d010',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'BOOST Methodology is a staged transformation approach used in this preview.'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1500000-0000-4000-8000-00000000d013',
    'b1000000-0000-4000-8000-00000000d010',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'Asset Productivity focuses on reliability and throughput.'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1500000-0000-4000-8000-00000000d014',
    'b1000000-0000-4000-8000-00000000d010',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'Brazil Manufacturing Expertise describes local industrial context.'
  )
ON CONFLICT (knowledge_candidate_id, source_content_block_id, origin_model_run_id, exact_quote) DO NOTHING;

INSERT INTO public.knowledge_candidate_validations (
  workspace_id, knowledge_candidate_id, validator_code, validator_version, validator_type, result, severity
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1500000-0000-4000-8000-00000000d011',
    'demo_seed',
    'demo-seed-v1',
    'deterministic',
    'pass',
    'info'
  )
ON CONFLICT (knowledge_candidate_id, validation_round, validator_code) DO NOTHING;

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status,
  source_snapshot_id, primary_content_block_id, origin_model_run_id, origin_candidate_id, metadata
) VALUES
  (
    'a1600000-0000-4000-8000-00000000d011',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability',
    'Operational Excellence',
    'operational excellence',
    'Dataset de demonstração: prática estruturada de melhoria de desempenho industrial.',
    'active',
    'f1000000-0000-4000-8000-00000000d010',
    'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'a1500000-0000-4000-8000-00000000d011',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d012',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'methodology',
    'BOOST Methodology',
    'boost methodology',
    'Dataset de demonstração: abordagem estagiada de transformação usada neste preview.',
    'active',
    'f1000000-0000-4000-8000-00000000d010',
    'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'a1500000-0000-4000-8000-00000000d012',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d013',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability',
    'Asset Productivity',
    'asset productivity',
    'Dataset de demonstração: foco em confiabilidade e throughput de ativos.',
    'active',
    'f1000000-0000-4000-8000-00000000d010',
    'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'a1500000-0000-4000-8000-00000000d013',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d014',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'industry_expertise',
    'Brazil Manufacturing Expertise',
    'brazil manufacturing expertise',
    'Dataset de demonstração: contexto industrial brasileiro para o preview executivo.',
    'active',
    'f1000000-0000-4000-8000-00000000d010',
    'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'a1500000-0000-4000-8000-00000000d014',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.knowledge_candidates
SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d011',
    promoted_at = now(),
    status = 'promoted'
WHERE id = 'a1500000-0000-4000-8000-00000000d011';
UPDATE public.knowledge_candidates
SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d012',
    promoted_at = now(),
    status = 'promoted'
WHERE id = 'a1500000-0000-4000-8000-00000000d012';
UPDATE public.knowledge_candidates
SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d013',
    promoted_at = now(),
    status = 'promoted'
WHERE id = 'a1500000-0000-4000-8000-00000000d013';
UPDATE public.knowledge_candidates
SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d014',
    promoted_at = now(),
    status = 'promoted'
WHERE id = 'a1500000-0000-4000-8000-00000000d014';

INSERT INTO public.knowledge_object_claims (
  workspace_id, knowledge_object_id, claim_id, relationship_type
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d011',
    'a3000000-0000-4000-8000-00000000d011',
    'describes'
  )
ON CONFLICT (knowledge_object_id, claim_id, relationship_type) DO NOTHING;

INSERT INTO public.knowledge_object_relations (
  workspace_id, source_object_id, target_object_id, relation_type, source_snapshot_id, status
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d011',
    'a1600000-0000-4000-8000-00000000d012',
    'uses_methodology',
    'f1000000-0000-4000-8000-00000000d010',
    'active'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d013',
    'a1600000-0000-4000-8000-00000000d011',
    'related_to',
    'f1000000-0000-4000-8000-00000000d010',
    'active'
  )
ON CONFLICT (source_object_id, target_object_id, relation_type) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1600000-0000-4000-8000-00000000d011',
  id
FROM public.knowledge_tags
WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Operational Excellence'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1600000-0000-4000-8000-00000000d012',
  id
FROM public.knowledge_tags
WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Transformation'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1600000-0000-4000-8000-00000000d013',
  id
FROM public.knowledge_tags
WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Asset Productivity'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1600000-0000-4000-8000-00000000d014',
  id
FROM public.knowledge_tags
WHERE category = 'GEOGRAPHY' AND canonical_name = 'Brazil'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_aliases (
  workspace_id, knowledge_object_id, alias, normalized_alias, source_snapshot_id
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d011',
    'OpEx (demo)',
    'opex demo',
    'f1000000-0000-4000-8000-00000000d010'
  )
ON CONFLICT (workspace_id, normalized_alias) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sprint 5 demo Signals — synthetic, not current institutional facts.
-- ---------------------------------------------------------------------------

INSERT INTO public.claims (
  id, workspace_id, analysis_id, originating_research_run_id, company_id, statement,
  claim_category, claim_type, verification_status, review_status, claim_status,
  assertion_mode, country_code, metric_name, numeric_value, unit, currency_code
) VALUES
  (
    'a3000000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'a1000000-0000-4000-8000-000000000001',
    'Dataset de demonstração: a empresa descreve um plano estratégico de crescimento no Brasil. Não é um fato institucional atual.',
    'strategy', 'fact', 'supported', 'approved', 'active', 'planned', 'BR', NULL, NULL, NULL, NULL
  ),
  (
    'a3000000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'a1000000-0000-4000-8000-000000000001',
    'Dataset de demonstração: a empresa anuncia um programa de sustentabilidade neste preview sintético.',
    'sustainability', 'fact', 'supported', 'approved', 'active', 'announced', 'BR', NULL, NULL, NULL, NULL
  ),
  (
    'a3000000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'a1000000-0000-4000-8000-000000000002',
    'Dataset de demonstração: a empresa anuncia investimento de capital (capex) em capacidade no Brasil neste preview sintético.',
    'investment', 'fact', 'supported', 'approved', 'active', 'announced', 'BR', 'capex', 2000000000, 'BRL', 'BRL'
  ),
  (
    'a3000000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'a1000000-0000-4000-8000-000000000002',
    'Dataset de demonstração: a empresa anuncia aumento de capacidade operacional neste preview sintético.',
    'capacity', 'fact', 'supported', 'approved', 'active', 'announced', 'BR', 'capacity', 10, '%', NULL
  ),
  (
    'a3000000-0000-4000-8000-00000000d025',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'a1000000-0000-4000-8000-000000000003',
    'Dataset de demonstração: a empresa anuncia um programa de reestruturação neste preview sintético.',
    'strategy', 'fact', 'supported', 'approved', 'active', 'announced', 'BR', NULL, NULL, NULL, NULL
  ),
  (
    'a3000000-0000-4000-8000-00000000d026',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'a1000000-0000-4000-8000-000000000003',
    'Dataset de demonstração: a empresa reporta pressão financeira neste preview sintético. Não é um fato atual validado.',
    'financial', 'fact', 'supported', 'approved', 'active', 'reported_actual', 'BR', NULL, NULL, NULL, NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claim_evidence (workspace_id, claim_id, evidence_fragment_id, relationship, directness) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d021', 'a2000000-0000-4000-8000-00000000d001', 'supports', 'direct'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d022', 'a2000000-0000-4000-8000-00000000d001', 'supports', 'direct'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d023', 'a2000000-0000-4000-8000-00000000d002', 'supports', 'direct'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d024', 'a2000000-0000-4000-8000-00000000d002', 'supports', 'direct'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d025', 'a2000000-0000-4000-8000-00000000d003', 'supports', 'direct'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a3000000-0000-4000-8000-00000000d026', 'a2000000-0000-4000-8000-00000000d003', 'supports', 'direct')
ON CONFLICT (claim_id, evidence_fragment_id, relationship) DO NOTHING;

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash, metadata
) VALUES
  (
    'a1100000-0000-4000-8000-00000000d020',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'signal_extraction', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-signal-natura', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'signal_extraction', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-signal-vale', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'signal_extraction', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-signal-raizen', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.signal_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  proposed_signal_type, proposed_signal_nature, proposed_title, proposed_summary, proposed_importance,
  proposed_assertion_mode, proposed_confidence_tier, proposed_geography, proposed_core_event,
  candidate_fingerprint, status, metadata
) VALUES
  (
    'a1800000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'a1100000-0000-4000-8000-00000000d020',
    'strategic_plan', 'event',
    'Company describes a strategic growth plan in Brazil',
    'Dataset de demonstração: a empresa descreve um plano estratégico de crescimento no Brasil.',
    'medium', 'planned', 'supported', 'Brazil', 'strategic growth plan brazil',
    'demo-fp-signal-natura-plan', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1800000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'a1100000-0000-4000-8000-00000000d020',
    'sustainability_program', 'event',
    'Company announces a sustainability program',
    'Dataset de demonstração: a empresa anuncia um programa de sustentabilidade neste preview sintético.',
    'medium', 'announced', 'supported', 'Brazil', 'sustainability program',
    'demo-fp-signal-natura-sust', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1800000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'a1100000-0000-4000-8000-00000000d021',
    'capex_investment', 'event',
    'Company announces capex investment in Brazil capacity',
    'Dataset de demonstração: a empresa anuncia investimento de capital em capacidade no Brasil.',
    'high', 'announced', 'supported', 'Brazil', 'capex investment brazil capacity',
    'demo-fp-signal-vale-capex', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1800000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'a1100000-0000-4000-8000-00000000d021',
    'capacity_increase', 'event',
    'Company announces an operational capacity increase',
    'Dataset de demonstração: a empresa anuncia aumento de capacidade operacional.',
    'medium', 'announced', 'supported', 'Brazil', 'capacity increase',
    'demo-fp-signal-vale-capacity', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1800000-0000-4000-8000-00000000d025',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'a1100000-0000-4000-8000-00000000d022',
    'restructuring', 'event',
    'Company announces a restructuring program',
    'Dataset de demonstração: a empresa anuncia um programa de reestruturação.',
    'high', 'announced', 'supported', 'Brazil', 'restructuring program',
    'demo-fp-signal-raizen-restruct', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1800000-0000-4000-8000-00000000d026',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'a1100000-0000-4000-8000-00000000d022',
    'financial_pressure', 'state',
    'Company reports financial pressure in this demo preview',
    'Dataset de demonstração: a empresa reporta pressão financeira neste preview sintético.',
    'medium', 'reported_actual', 'supported', 'Brazil', 'financial pressure',
    'demo-fp-signal-raizen-finance', 'promoted', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.signal_candidate_claims (workspace_id, signal_candidate_id, claim_id, relationship_type) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d021', 'a3000000-0000-4000-8000-00000000d021', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d022', 'a3000000-0000-4000-8000-00000000d022', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d023', 'a3000000-0000-4000-8000-00000000d023', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d024', 'a3000000-0000-4000-8000-00000000d024', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d025', 'a3000000-0000-4000-8000-00000000d025', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1800000-0000-4000-8000-00000000d026', 'a3000000-0000-4000-8000-00000000d026', 'primary_evidence')
ON CONFLICT (signal_candidate_id, claim_id, relationship_type) DO NOTHING;

INSERT INTO public.signals (
  id, workspace_id, company_id, signal_type, signal_nature, title, summary, status, importance,
  confidence_tier, assertion_mode, geography, signal_fingerprint, source_snapshot_id,
  origin_signal_candidate_id, origin_model_run_id, metadata
) VALUES
  (
    'a1700000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'strategic_plan', 'event',
    'Company describes a strategic growth plan in Brazil',
    'Dataset de demonstração: a empresa descreve um plano estratégico de crescimento no Brasil. Não é um fato institucional atual.',
    'active', 'medium', 'supported', 'planned', 'Brazil', 'demo-fp-signal-natura-plan',
    'f1000000-0000-4000-8000-00000000d001', 'a1800000-0000-4000-8000-00000000d021',
    'a1100000-0000-4000-8000-00000000d020', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1700000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'sustainability_program', 'event',
    'Company announces a sustainability program',
    'Dataset de demonstração: a empresa anuncia um programa de sustentabilidade neste preview sintético.',
    'active', 'medium', 'supported', 'announced', 'Brazil', 'demo-fp-signal-natura-sust',
    'f1000000-0000-4000-8000-00000000d001', 'a1800000-0000-4000-8000-00000000d022',
    'a1100000-0000-4000-8000-00000000d020', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1700000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'capex_investment', 'event',
    'Company announces capex investment in Brazil capacity',
    'Dataset de demonstração: a empresa anuncia investimento de capital em capacidade no Brasil.',
    'active', 'high', 'supported', 'announced', 'Brazil', 'demo-fp-signal-vale-capex',
    'f1000000-0000-4000-8000-00000000d002', 'a1800000-0000-4000-8000-00000000d023',
    'a1100000-0000-4000-8000-00000000d021', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1700000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'capacity_increase', 'event',
    'Company announces an operational capacity increase',
    'Dataset de demonstração: a empresa anuncia aumento de capacidade operacional.',
    'active', 'medium', 'supported', 'announced', 'Brazil', 'demo-fp-signal-vale-capacity',
    'f1000000-0000-4000-8000-00000000d002', 'a1800000-0000-4000-8000-00000000d024',
    'a1100000-0000-4000-8000-00000000d021', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1700000-0000-4000-8000-00000000d025',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'restructuring', 'event',
    'Company announces a restructuring program',
    'Dataset de demonstração: a empresa anuncia um programa de reestruturação.',
    'active', 'high', 'supported', 'announced', 'Brazil', 'demo-fp-signal-raizen-restruct',
    'f1000000-0000-4000-8000-00000000d003', 'a1800000-0000-4000-8000-00000000d025',
    'a1100000-0000-4000-8000-00000000d022', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1700000-0000-4000-8000-00000000d026',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'financial_pressure', 'state',
    'Company reports financial pressure in this demo preview',
    'Dataset de demonstração: a empresa reporta pressão financeira neste preview sintético. Não é um fato atual validado.',
    'active', 'medium', 'supported', 'reported_actual', 'Brazil', 'demo-fp-signal-raizen-finance',
    'f1000000-0000-4000-8000-00000000d003', 'a1800000-0000-4000-8000-00000000d026',
    'a1100000-0000-4000-8000-00000000d022', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d021' WHERE id = 'a1800000-0000-4000-8000-00000000d021';
UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d022' WHERE id = 'a1800000-0000-4000-8000-00000000d022';
UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d023' WHERE id = 'a1800000-0000-4000-8000-00000000d023';
UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d024' WHERE id = 'a1800000-0000-4000-8000-00000000d024';
UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d025' WHERE id = 'a1800000-0000-4000-8000-00000000d025';
UPDATE public.signal_candidates SET promoted_signal_id = 'a1700000-0000-4000-8000-00000000d026' WHERE id = 'a1800000-0000-4000-8000-00000000d026';

INSERT INTO public.signal_claims (workspace_id, signal_id, claim_id, relationship_type) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d021', 'a3000000-0000-4000-8000-00000000d021', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d022', 'a3000000-0000-4000-8000-00000000d022', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d023', 'a3000000-0000-4000-8000-00000000d023', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d024', 'a3000000-0000-4000-8000-00000000d024', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d025', 'a3000000-0000-4000-8000-00000000d025', 'primary_evidence'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d026', 'a3000000-0000-4000-8000-00000000d026', 'primary_evidence')
ON CONFLICT (signal_id, claim_id, relationship_type) DO NOTHING;

INSERT INTO public.signal_companies (workspace_id, signal_id, company_id, role) VALUES
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d021', 'a1000000-0000-4000-8000-000000000001', 'primary'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d022', 'a1000000-0000-4000-8000-000000000001', 'primary'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d023', 'a1000000-0000-4000-8000-000000000002', 'primary'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d024', 'a1000000-0000-4000-8000-000000000002', 'primary'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d025', 'a1000000-0000-4000-8000-000000000003', 'primary'),
  ('0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d026', 'a1000000-0000-4000-8000-000000000003', 'primary')
ON CONFLICT (signal_id, company_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d021', id
FROM public.knowledge_tags WHERE category = 'GEOGRAPHY' AND canonical_name = 'Brazil'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d022', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Sustainability'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d023', id
FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Mining & Metals'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d025', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'cost'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d021', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Strategy'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d023', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'capacity'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d024', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Asset Productivity'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d024', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'capacity'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d024', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'ramp-up'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.signal_tags (workspace_id, signal_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1700000-0000-4000-8000-00000000d026', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'cost'
ON CONFLICT (signal_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_candidates (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id, extraction_model_run_id,
  candidate_type, canonical_name, normalized_name, proposed_description, candidate_fingerprint,
  status, metadata
) VALUES
  (
    'a1500000-0000-4000-8000-00000000d015',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'capability', 'Sustainability', 'sustainability',
    'Dataset de demonstração: capability de sustentabilidade usada neste preview.',
    'demo-fp-sustainability', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d016',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'capability', 'Cost Reduction', 'cost reduction',
    'Dataset de demonstração: capability de redução de custo usada neste preview.',
    'demo-fp-cost-reduction', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d017',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'service', 'Industrial Performance Program', 'industrial performance program',
    'Dataset de demonstração: serviço de desempenho industrial usado neste preview.',
    'demo-fp-industrial-service', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1500000-0000-4000-8000-00000000d018',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010',
    'case', 'Mining ramp-up case', 'mining ramp up case',
    'Dataset de demonstração: caso sintético de ramp-up em mining. Não é um caso institucional atual.',
    'demo-fp-mining-case', 'promoted', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.efeso_knowledge_objects (
  id, workspace_id, object_type, canonical_name, normalized_name, short_description, status,
  source_snapshot_id, primary_content_block_id, origin_model_run_id, origin_candidate_id, metadata
) VALUES
  (
    'a1600000-0000-4000-8000-00000000d015',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability', 'Sustainability', 'sustainability',
    'Dataset de demonstração: capability de sustentabilidade usada neste preview.',
    'active', 'f1000000-0000-4000-8000-00000000d010', 'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010', 'a1500000-0000-4000-8000-00000000d015',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d016',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'capability', 'Cost Reduction', 'cost reduction',
    'Dataset de demonstração: capability de redução de custo usada neste preview.',
    'active', 'f1000000-0000-4000-8000-00000000d010', 'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010', 'a1500000-0000-4000-8000-00000000d016',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d017',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'service', 'Industrial Performance Program', 'industrial performance program',
    'Dataset de demonstração: serviço de desempenho industrial usado neste preview.',
    'active', 'f1000000-0000-4000-8000-00000000d010', 'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010', 'a1500000-0000-4000-8000-00000000d017',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  ),
  (
    'a1600000-0000-4000-8000-00000000d018',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'case', 'Mining ramp-up case', 'mining ramp up case',
    'Dataset de demonstração: caso sintético de ramp-up em mining. Não é um caso institucional atual.',
    'active', 'f1000000-0000-4000-8000-00000000d010', 'b1000000-0000-4000-8000-00000000d010',
    'a1100000-0000-4000-8000-00000000d010', 'a1500000-0000-4000-8000-00000000d018',
    '{"origin":"demo_seed","synthetic":true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.knowledge_candidates SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d015' WHERE id = 'a1500000-0000-4000-8000-00000000d015';
UPDATE public.knowledge_candidates SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d016' WHERE id = 'a1500000-0000-4000-8000-00000000d016';
UPDATE public.knowledge_candidates SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d017' WHERE id = 'a1500000-0000-4000-8000-00000000d017';
UPDATE public.knowledge_candidates SET promoted_knowledge_object_id = 'a1600000-0000-4000-8000-00000000d018' WHERE id = 'a1500000-0000-4000-8000-00000000d018';

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d013', id
FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Mining & Metals'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d013', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'capacity'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d015', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Sustainability'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d015', id
FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Consumer Goods'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d016', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Cost Reduction'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d016', id
FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Energy'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d016', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'cost'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d017', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Operational Excellence'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d017', id
FROM public.knowledge_tags WHERE category = 'GEOGRAPHY' AND canonical_name = 'Brazil'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d018', id
FROM public.knowledge_tags WHERE category = 'INDUSTRY' AND canonical_name = 'Mining & Metals'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d018', id
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Asset Productivity'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_tags (workspace_id, knowledge_object_id, tag_id)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1600000-0000-4000-8000-00000000d018', id
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'ramp-up'
ON CONFLICT (knowledge_object_id, tag_id) DO NOTHING;

INSERT INTO public.knowledge_object_relations (
  workspace_id, source_object_id, target_object_id, relation_type, source_snapshot_id, status
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d013',
    'a1600000-0000-4000-8000-00000000d018',
    'demonstrates_capability',
    'f1000000-0000-4000-8000-00000000d010',
    'active'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1600000-0000-4000-8000-00000000d011',
    'a1600000-0000-4000-8000-00000000d017',
    'supports_service',
    'f1000000-0000-4000-8000-00000000d010',
    'active'
  )
ON CONFLICT (source_object_id, target_object_id, relation_type) DO NOTHING;

INSERT INTO public.account_intelligence_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id,
  proposed_headline, proposed_executive_summary, proposed_strategic_direction, proposed_pressure_summary,
  proposed_investment_summary, proposed_operating_context_summary, proposed_risk_summary, proposed_change_summary,
  proposed_sections, proposed_period_start, proposed_period_end, proposed_tensions, proposed_themes, proposed_signal_links,
  candidate_fingerprint, extraction_model_run_id, status, metadata
) VALUES
  (
    'a1910000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'Natura: Company describes a strategic growth plan in Brazil',
    'Dataset de demonstração. Com base em 2 Signals ativos: um plano estratégico planned e um programa de sustentabilidade announced. Nada disto é tratado como fato institucional atual.',
    'Company describes a strategic growth plan in Brazil [planned · planned].',
    NULL,
    NULL,
    'Company describes a strategic growth plan in Brazil [planned · planned]. Company announces a sustainability program [recent · announced].',
    NULL,
    'Company describes a strategic growth plan in Brazil [planned · planned]. Company announces a sustainability program [recent · announced].',
    '{"strategic_priorities":"Company describes a strategic growth plan in Brazil [planned · planned].","sustainability_context":"Company announces a sustainability program [recent · announced].","unresolved_questions":"Company describes a strategic growth plan in Brazil remains planned; it is not treated as completed."}'::jsonb,
    NULL, NULL, '[]'::jsonb, '[]'::jsonb,
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d021","relationship_type":"primary","weight":8},{"signal_id":"a1700000-0000-4000-8000-00000000d022","relationship_type":"supporting","weight":7}]'::jsonb,
    'demo-fp-ai-natura', 'a1100000-0000-4000-8000-00000000d020', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1910000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'Vale: Company announces capex investment in Brazil capacity',
    'Dataset de demonstração. Com base em 2 Signals ativos announced: investimento de capital e aumento de capacidade. Não se infere solidez financeira.',
    NULL,
    'Company announces an operational capacity increase [recent · announced].',
    'Company announces capex investment in Brazil capacity [recent · announced].',
    'Company announces capex investment in Brazil capacity [recent · announced]. Company announces an operational capacity increase [recent · announced].',
    NULL,
    'Company announces capex investment in Brazil capacity [recent · announced]. Company announces an operational capacity increase [recent · announced].',
    '{"investments_and_expansion":"Company announces capex investment in Brazil capacity [recent · announced].","operational_pressures":"Company announces an operational capacity increase [recent · announced]."}'::jsonb,
    NULL, NULL, '[]'::jsonb, '[]'::jsonb,
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d023","relationship_type":"primary","weight":10},{"signal_id":"a1700000-0000-4000-8000-00000000d024","relationship_type":"supporting","weight":8}]'::jsonb,
    'demo-fp-ai-vale', 'a1100000-0000-4000-8000-00000000d021', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1910000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'Raízen: Company announces a restructuring program',
    'Dataset de demonstração. Com base em 2 Signals ativos: reestruturação announced e pressão financeira reported_actual. A tensão é registrada; não se conclui que o investimento falhará.',
    NULL,
    NULL,
    NULL,
    'Company announces a restructuring program [recent · announced]. Company reports financial pressure in this demo preview [ongoing · reported_actual].',
    'Company reports financial pressure in this demo preview [ongoing · reported_actual].',
    'Company announces a restructuring program [recent · announced]. Company reports financial pressure in this demo preview [ongoing · reported_actual].',
    '{"transformation_themes":"Company announces a restructuring program [recent · announced].","financial_context":"Company reports financial pressure in this demo preview [ongoing · reported_actual]."}'::jsonb,
    NULL, NULL,
    '[{"signal_a_id":"a1700000-0000-4000-8000-00000000d025","signal_b_id":"a1700000-0000-4000-8000-00000000d026","tension_type":"investment_vs_financial_constraint","explanation":"Restructuring coexists with reported financial pressure."}]'::jsonb,
    '[]'::jsonb,
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d025","relationship_type":"primary","weight":10},{"signal_id":"a1700000-0000-4000-8000-00000000d026","relationship_type":"supporting","weight":8}]'::jsonb,
    'demo-fp-ai-raizen', 'a1100000-0000-4000-8000-00000000d022', 'promoted', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.account_intelligence (
  id, workspace_id, company_id, status, headline, executive_summary, strategic_direction, pressure_summary,
  investment_summary, operating_context_summary, risk_summary, change_summary, sections,
  origin_model_run_id, origin_candidate_id, version, metadata
)
SELECT
  proposed.id,
  c.workspace_id,
  c.company_id,
  'active',
  c.proposed_headline,
  c.proposed_executive_summary,
  c.proposed_strategic_direction,
  c.proposed_pressure_summary,
  c.proposed_investment_summary,
  c.proposed_operating_context_summary,
  c.proposed_risk_summary,
  c.proposed_change_summary,
  c.proposed_sections,
  c.extraction_model_run_id,
  c.id,
  1,
  '{"origin":"demo_seed"}'::jsonb
FROM public.account_intelligence_candidates c
JOIN (
  VALUES
    ('a1900000-0000-4000-8000-00000000d021'::uuid, 'a1910000-0000-4000-8000-00000000d021'::uuid),
    ('a1900000-0000-4000-8000-00000000d022'::uuid, 'a1910000-0000-4000-8000-00000000d022'::uuid),
    ('a1900000-0000-4000-8000-00000000d023'::uuid, 'a1910000-0000-4000-8000-00000000d023'::uuid)
) AS proposed(id, candidate_id) ON proposed.candidate_id = c.id
ON CONFLICT (id) DO NOTHING;

UPDATE public.account_intelligence_candidates SET promoted_account_intelligence_id = 'a1900000-0000-4000-8000-00000000d021' WHERE id = 'a1910000-0000-4000-8000-00000000d021';
UPDATE public.account_intelligence_candidates SET promoted_account_intelligence_id = 'a1900000-0000-4000-8000-00000000d022' WHERE id = 'a1910000-0000-4000-8000-00000000d022';
UPDATE public.account_intelligence_candidates SET promoted_account_intelligence_id = 'a1900000-0000-4000-8000-00000000d023' WHERE id = 'a1910000-0000-4000-8000-00000000d023';

INSERT INTO public.account_intelligence_signals (workspace_id, account_intelligence_id, signal_id, relationship_type, weight)
SELECT workspace_id, promoted_account_intelligence_id, (link->>'signal_id')::uuid, link->>'relationship_type', (link->>'weight')::integer
FROM public.account_intelligence_candidates,
     jsonb_array_elements(proposed_signal_links) AS link
WHERE id IN (
  'a1910000-0000-4000-8000-00000000d021',
  'a1910000-0000-4000-8000-00000000d022',
  'a1910000-0000-4000-8000-00000000d023'
)
ON CONFLICT (account_intelligence_id, signal_id) DO NOTHING;

INSERT INTO public.account_tensions (
  workspace_id, account_intelligence_id, signal_a_id, signal_b_id, tension_type, explanation, status
) VALUES (
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1900000-0000-4000-8000-00000000d023',
  'a1700000-0000-4000-8000-00000000d025',
  'a1700000-0000-4000-8000-00000000d026',
  'investment_vs_financial_constraint',
  'Restructuring coexists with reported financial pressure.',
  'active'
)
ON CONFLICT (account_intelligence_id, signal_a_id, signal_b_id, tension_type) DO NOTHING;

INSERT INTO public.account_intelligence_themes (
  workspace_id, account_intelligence_id, tag_id, signal_count, weighted_importance, last_seen_at
)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1900000-0000-4000-8000-00000000d021', id, 1, 'medium', now()
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Sustainability'
ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;

INSERT INTO public.account_intelligence_themes (
  workspace_id, account_intelligence_id, tag_id, signal_count, weighted_importance, last_seen_at
)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1900000-0000-4000-8000-00000000d021', id, 1, 'medium', now()
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Strategy'
ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;

INSERT INTO public.account_intelligence_themes (
  workspace_id, account_intelligence_id, tag_id, signal_count, weighted_importance, last_seen_at
)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1900000-0000-4000-8000-00000000d022', id, 2, 'high', now()
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'capacity'
ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;

INSERT INTO public.account_intelligence_themes (
  workspace_id, account_intelligence_id, tag_id, signal_count, weighted_importance, last_seen_at
)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1900000-0000-4000-8000-00000000d022', id, 1, 'medium', now()
FROM public.knowledge_tags WHERE category = 'CAPABILITY_DOMAIN' AND canonical_name = 'Asset Productivity'
ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;

INSERT INTO public.account_intelligence_themes (
  workspace_id, account_intelligence_id, tag_id, signal_count, weighted_importance, last_seen_at
)
SELECT '0e8f0e50-b2a1-4c3d-9e7f-000000000001', 'a1900000-0000-4000-8000-00000000d023', id, 2, 'high', now()
FROM public.knowledge_tags WHERE category = 'BUSINESS_PROBLEM' AND canonical_name = 'cost'
ON CONFLICT (account_intelligence_id, tag_id) DO NOTHING;

INSERT INTO public.efeso_fit_candidates (
  id, workspace_id, company_id, knowledge_object_id, analysis_id, research_run_id, source_snapshot_id,
  proposed_components, proposed_rationale, proposed_fit_level, proposed_fit_score, candidate_fingerprint,
  status, metadata
) VALUES
  (
    'a1940000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'a1600000-0000-4000-8000-00000000d015',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    '[{"component_type":"industry_match","component_value":"Consumer Goods","contribution":2,"explanation":"Company industry maps to Consumer Goods.","source_type":"knowledge_tag","source_id":null},{"component_type":"capability_match","component_value":"Sustainability","contribution":2,"explanation":"Sustainability program signal matches this capability.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d022"},{"component_type":"signal_type_match","component_value":"sustainability_program","contribution":1,"explanation":"Signal type maps to Sustainability.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d022"}]'::jsonb,
    'Matched because: industry_match=Consumer Goods (2); capability_match=Sustainability (2); signal_type_match=sustainability_program (1).',
    'medium', 5, 'demo-fp-fit-natura-sust', 'promoted',
    '{"origin":"demo_seed","signal_matches":[{"signal_id":"a1700000-0000-4000-8000-00000000d022","match_type":"capability","match_strength":"medium","explanation":"Sustainability program."}]}'::jsonb
  ),
  (
    'a1940000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'a1600000-0000-4000-8000-00000000d013',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    '[{"component_type":"industry_match","component_value":"Mining & Metals","contribution":2,"explanation":"Company industry maps to Mining & Metals.","source_type":"knowledge_tag","source_id":null},{"component_type":"business_problem_match","component_value":"capacity","contribution":3,"explanation":"Capacity signals overlap Asset Productivity.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d024"},{"component_type":"signal_type_match","component_value":"capacity_increase","contribution":2,"explanation":"capacity_increase maps to Asset Productivity.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d024"},{"component_type":"recurring_theme_match","component_value":"capacity","contribution":2,"explanation":"Recurring theme capacity.","source_type":"account_theme","source_id":null},{"component_type":"case_relevance","component_value":"Mining ramp-up case","contribution":2,"explanation":"Related mining ramp-up case.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d018"}]'::jsonb,
    'Matched because: company industry = Mining & Metals; recent signal = capacity_increase; recurring theme = capacity; EFESO has related mining ramp-up case; EFESO has documented Asset Productivity capability.',
    'high', 11, 'demo-fp-fit-vale-asset', 'promoted',
    '{"origin":"demo_seed","signal_matches":[{"signal_id":"a1700000-0000-4000-8000-00000000d024","match_type":"capability","match_strength":"strong","explanation":"capacity_increase."},{"signal_id":"a1700000-0000-4000-8000-00000000d023","match_type":"industry","match_strength":"strong","explanation":"Mining & Metals."}]}'::jsonb
  ),
  (
    'a1940000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'a1600000-0000-4000-8000-00000000d016',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    '[{"component_type":"industry_match","component_value":"Energy","contribution":2,"explanation":"Company industry maps to Energy.","source_type":"knowledge_tag","source_id":null},{"component_type":"business_problem_match","component_value":"cost","contribution":2,"explanation":"Restructuring and financial pressure map to cost.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"},{"component_type":"signal_type_match","component_value":"restructuring, financial_pressure","contribution":2,"explanation":"Signal types map to Cost Reduction.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"}]'::jsonb,
    'Matched because: industry_match=Energy (2); business_problem_match=cost (2); signal_type_match=restructuring (2).',
    'medium', 6, 'demo-fp-fit-raizen-cost', 'promoted',
    '{"origin":"demo_seed","signal_matches":[{"signal_id":"a1700000-0000-4000-8000-00000000d025","match_type":"business_problem","match_strength":"medium","explanation":"cost."}]}'::jsonb
  ),
  (
    'a1940000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'a1600000-0000-4000-8000-00000000d012',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    '[{"component_type":"capability_match","component_value":"Transformation","contribution":1,"explanation":"Restructuring maps to Transformation.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"},{"component_type":"methodology_match","component_value":"BOOST Methodology","contribution":1,"explanation":"Methodology overlaps transformation tags.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d012"}]'::jsonb,
    'Matched because: capability_match=Transformation (1); methodology_match=BOOST Methodology (1).',
    'low', 2, 'demo-fp-fit-raizen-boost', 'promoted',
    '{"origin":"demo_seed","signal_matches":[{"signal_id":"a1700000-0000-4000-8000-00000000d025","match_type":"methodology","match_strength":"weak","explanation":"Transformation overlap."}]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.efeso_fits (
  id, workspace_id, company_id, knowledge_object_id, status, fit_level, fit_score, fit_reason_summary,
  origin_candidate_id, version, metadata
) VALUES
  (
    'a1930000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'a1600000-0000-4000-8000-00000000d015',
    'active', 'medium', 5,
    'Matched because: industry_match=Consumer Goods (2); capability_match=Sustainability (2); signal_type_match=sustainability_program (1).',
    'a1940000-0000-4000-8000-00000000d021', 1, '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1930000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'a1600000-0000-4000-8000-00000000d013',
    'active', 'high', 11,
    'Matched because: company industry = Mining & Metals; recent signal = capacity_increase; recurring theme = capacity; EFESO has related mining ramp-up case; EFESO has documented Asset Productivity capability.',
    'a1940000-0000-4000-8000-00000000d022', 1, '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1930000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'a1600000-0000-4000-8000-00000000d016',
    'active', 'medium', 6,
    'Matched because: industry_match=Energy (2); business_problem_match=cost (2); signal_type_match=restructuring (2).',
    'a1940000-0000-4000-8000-00000000d023', 1, '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1930000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'a1600000-0000-4000-8000-00000000d012',
    'active', 'low', 2,
    'Matched because: capability_match=Transformation (1); methodology_match=BOOST Methodology (1).',
    'a1940000-0000-4000-8000-00000000d024', 1, '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.efeso_fit_candidates SET promoted_fit_id = 'a1930000-0000-4000-8000-00000000d021' WHERE id = 'a1940000-0000-4000-8000-00000000d021';
UPDATE public.efeso_fit_candidates SET promoted_fit_id = 'a1930000-0000-4000-8000-00000000d022' WHERE id = 'a1940000-0000-4000-8000-00000000d022';
UPDATE public.efeso_fit_candidates SET promoted_fit_id = 'a1930000-0000-4000-8000-00000000d023' WHERE id = 'a1940000-0000-4000-8000-00000000d023';
UPDATE public.efeso_fit_candidates SET promoted_fit_id = 'a1930000-0000-4000-8000-00000000d024' WHERE id = 'a1940000-0000-4000-8000-00000000d024';

INSERT INTO public.efeso_fit_components (
  workspace_id, efeso_fit_id, component_type, component_value, contribution, explanation, source_type, source_id
)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  f.id,
  comp->>'component_type',
  comp->>'component_value',
  (comp->>'contribution')::integer,
  comp->>'explanation',
  coalesce(comp->>'source_type', 'knowledge_object'),
  NULLIF(comp->>'source_id', '')::uuid
FROM public.efeso_fits f
JOIN public.efeso_fit_candidates c ON c.promoted_fit_id = f.id
CROSS JOIN LATERAL jsonb_array_elements(c.proposed_components) AS comp
WHERE f.id IN (
  'a1930000-0000-4000-8000-00000000d021',
  'a1930000-0000-4000-8000-00000000d022',
  'a1930000-0000-4000-8000-00000000d023',
  'a1930000-0000-4000-8000-00000000d024'
);

INSERT INTO public.signal_knowledge_matches (
  workspace_id, signal_id, knowledge_object_id, match_type, match_strength, status, explanation, origin_fit_id
) VALUES
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1700000-0000-4000-8000-00000000d022',
    'a1600000-0000-4000-8000-00000000d015',
    'capability', 'medium', 'active', 'Sustainability program.',
    'a1930000-0000-4000-8000-00000000d021'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1700000-0000-4000-8000-00000000d024',
    'a1600000-0000-4000-8000-00000000d013',
    'capability', 'strong', 'active', 'capacity_increase.',
    'a1930000-0000-4000-8000-00000000d022'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1700000-0000-4000-8000-00000000d023',
    'a1600000-0000-4000-8000-00000000d013',
    'industry', 'strong', 'active', 'Mining & Metals.',
    'a1930000-0000-4000-8000-00000000d022'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1700000-0000-4000-8000-00000000d025',
    'a1600000-0000-4000-8000-00000000d016',
    'business_problem', 'medium', 'active', 'cost.',
    'a1930000-0000-4000-8000-00000000d023'
  ),
  (
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1700000-0000-4000-8000-00000000d025',
    'a1600000-0000-4000-8000-00000000d012',
    'methodology', 'weak', 'active', 'Transformation overlap.',
    'a1930000-0000-4000-8000-00000000d024'
  )
ON CONFLICT (signal_id, knowledge_object_id, match_type) DO NOTHING;

INSERT INTO public.efeso_fit_candidates (
  id, workspace_id, company_id, knowledge_object_id, analysis_id, research_run_id, source_snapshot_id,
  proposed_components, proposed_rationale, proposed_fit_level, proposed_fit_score, candidate_fingerprint,
  status, metadata
) VALUES (
  'a1940000-0000-4000-8000-00000000d025',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'a1600000-0000-4000-8000-00000000d011',
  'c1000000-0000-4000-8000-00000000d001',
  'd1000000-0000-4000-8000-00000000d001',
  'f1000000-0000-4000-8000-00000000d001',
  '[{"component_type":"capability_match","component_value":"Operational Excellence","contribution":2,"explanation":"Strategic plan maps to execution capability.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d021"},{"component_type":"signal_type_match","component_value":"strategic_plan","contribution":2,"explanation":"strategic_plan maps to strategy execution.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d021"}]'::jsonb,
  'Matched because: capability_match=Operational Excellence (2); signal_type_match=strategic_plan (2).',
  'medium', 4, 'demo-fp-fit-natura-oe', 'promoted',
  '{"origin":"demo_seed"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.efeso_fits (
  id, workspace_id, company_id, knowledge_object_id, status, fit_level, fit_score, fit_reason_summary,
  origin_candidate_id, version, metadata
) VALUES (
  'a1930000-0000-4000-8000-00000000d025',
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'a1600000-0000-4000-8000-00000000d011',
  'active', 'medium', 4,
  'Matched because: capability_match=Operational Excellence (2); signal_type_match=strategic_plan (2).',
  'a1940000-0000-4000-8000-00000000d025', 1, '{"origin":"demo_seed"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.efeso_fit_candidates SET promoted_fit_id = 'a1930000-0000-4000-8000-00000000d025' WHERE id = 'a1940000-0000-4000-8000-00000000d025';

INSERT INTO public.efeso_fit_components (
  workspace_id, efeso_fit_id, component_type, component_value, contribution, explanation, source_type, source_id
)
SELECT
  '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
  'a1930000-0000-4000-8000-00000000d025',
  comp->>'component_type',
  comp->>'component_value',
  (comp->>'contribution')::integer,
  comp->>'explanation',
  coalesce(comp->>'source_type', 'knowledge_object'),
  NULLIF(comp->>'source_id', '')::uuid
FROM public.efeso_fit_candidates,
     jsonb_array_elements(proposed_components) AS comp
WHERE id = 'a1940000-0000-4000-8000-00000000d025';

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash, metadata
) VALUES
  (
    'a1100000-0000-4000-8000-00000000d030',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'opportunity_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-opp-natura', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d031',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'opportunity_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-opp-vale', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d032',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'opportunity_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-opp-raizen', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.opportunity_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, source_snapshot_id,
  proposed_title, proposed_summary, proposed_opportunity_type, proposed_maturity, proposed_relevance_level,
  proposed_urgency_level, proposed_confidence_tier, proposed_assertion_mode, proposed_rationale, proposed_geography,
  proposed_account_intelligence_id, proposed_primary_efeso_fit_id, proposed_signal_links, proposed_fit_links,
  proposed_knowledge_links, proposed_rationale_blocks, candidate_fingerprint, generation_model_run_id, status, metadata
) VALUES
  (
    'a2110000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'Potencial oportunidade em ramp-up associada à expansão de capacidade',
    'Observado: aumento de capacidade anunciado. Uma necessidade de ramp-up pode emergir. Capabilities relevantes da EFESO incluem Asset Productivity. Sustentado por 2 Signals e Fit alto. Incerteza: a necessidade operacional não foi confirmada explicitamente pelo cliente.',
    'ramp_up', 'developing', 'high', 'medium', 'inferred', 'announced',
    'signal_trigger: Company announces an operational capacity increase. account_context: capacity and ramp-up recur. efeso_relevance: Asset Productivity = High Fit. uncertainty: Client has not explicitly stated a ramp-up challenge.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d022', 'a1930000-0000-4000-8000-00000000d022',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d024","relationship_type":"trigger"},{"signal_id":"a1700000-0000-4000-8000-00000000d023","relationship_type":"trigger"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d022","relationship_type":"primary"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d013","relationship_type":"capability"},{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d018","relationship_type":"case"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Aumento de capacidade operacional anunciado.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d024"},{"rationale_type":"account_context","statement":"Capacidade e ramp-up recorrem nos Signals recentes.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d022"},{"rationale_type":"efeso_relevance","statement":"Asset Productivity = High Fit.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d022"},{"rationale_type":"supporting_case","statement":"A EFESO tem um caso relevante de ramp-up em Mining & Metals.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d018"},{"rationale_type":"urgency_reason","statement":"O Signal desencadeador está announced e recente neste dataset de demonstração.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d024"},{"rationale_type":"uncertainty","statement":"O cliente não afirmou explicitamente um desafio de ramp-up.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d024"}]'::jsonb,
    'demo-fp-opp-vale-ramp', 'a1100000-0000-4000-8000-00000000d031', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2110000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'Potencial oportunidade em produtividade de ativos associada a capex e capacidade',
    'Observado: investimento de capital e aumento de capacidade anunciados. Uma necessidade de produtividade de ativos pode emergir. Capabilities relevantes da EFESO incluem Asset Productivity. Incerteza: a dor operacional não foi confirmada pelo cliente.',
    'asset_productivity', 'developing', 'high', 'medium', 'inferred', 'announced',
    'signal_trigger: capex and capacity. efeso_relevance: Asset Productivity high. uncertainty: need not confirmed.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d022', 'a1930000-0000-4000-8000-00000000d022',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d023","relationship_type":"trigger"},{"signal_id":"a1700000-0000-4000-8000-00000000d024","relationship_type":"trigger"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d022","relationship_type":"primary"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d013","relationship_type":"capability"},{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d018","relationship_type":"case"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Investimento de capital em capacidade anunciado.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d023"},{"rationale_type":"account_context","statement":"Capacidade recorre nos Signals recentes.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d022"},{"rationale_type":"efeso_relevance","statement":"Asset Productivity = High Fit.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d022"},{"rationale_type":"supporting_case","statement":"A EFESO tem um caso relevante de ramp-up em Mining & Metals.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d018"},{"rationale_type":"urgency_reason","statement":"Os Signals estão announced neste dataset de demonstração.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d023"},{"rationale_type":"uncertainty","statement":"A necessidade operacional não foi confirmada explicitamente pelo cliente.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d023"}]'::jsonb,
    'demo-fp-opp-vale-asset', 'a1100000-0000-4000-8000-00000000d031', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2110000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'Potencial oportunidade em redução de custo associada à pressão financeira',
    'Observado: pressão financeira reportada e reestruturação anunciada. Uma necessidade de redução de custo pode emergir. Capabilities relevantes da EFESO incluem Cost Reduction. Incerteza: o cliente não anunciou um programa de custo.',
    'cost_reduction', 'developing', 'medium', 'high', 'inferred', 'announced',
    'signal_trigger: financial pressure. efeso_relevance: Cost Reduction medium. uncertainty: no cost program announced.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d023', 'a1930000-0000-4000-8000-00000000d023',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d026","relationship_type":"trigger"},{"signal_id":"a1700000-0000-4000-8000-00000000d025","relationship_type":"supporting"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d023","relationship_type":"primary"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d016","relationship_type":"capability"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Pressão financeira reportada neste preview.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d026"},{"rationale_type":"account_context","statement":"Reestruturação coexiste com pressão financeira.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d023"},{"rationale_type":"efeso_relevance","statement":"Cost Reduction = Medium Fit.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d023"},{"rationale_type":"supporting_case","statement":"Capabilities relevantes da EFESO incluem Cost Reduction.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d016"},{"rationale_type":"urgency_reason","statement":"Janela de reestruturação e pressão financeira recentes neste dataset.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"},{"rationale_type":"uncertainty","statement":"O cliente não anunciou um programa de redução de custo.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d026"}]'::jsonb,
    'demo-fp-opp-raizen-cost', 'a1100000-0000-4000-8000-00000000d032', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2110000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'Potencial oportunidade de apoio à reestruturação',
    'Observado: programa de reestruturação anunciado. Um apoio à transformação pode tornar-se relevante. Capabilities relevantes da EFESO incluem BOOST Methodology. Incerteza: não se inventam layoffs nem um programa de corte não suportado.',
    'restructuring_support', 'developing', 'medium', 'high', 'supported', 'announced',
    'signal_trigger: restructuring announced. efeso_relevance: BOOST. uncertainty: no layoffs invented.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d023', 'a1930000-0000-4000-8000-00000000d024',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d025","relationship_type":"trigger"},{"signal_id":"a1700000-0000-4000-8000-00000000d026","relationship_type":"supporting"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d024","relationship_type":"primary"},{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d023","relationship_type":"supporting"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d012","relationship_type":"methodology"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Programa de reestruturação anunciado.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"},{"rationale_type":"account_context","statement":"Reestruturação coexiste com pressão financeira.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d023"},{"rationale_type":"efeso_relevance","statement":"BOOST Methodology = Low Fit, usado como metodologia de apoio à transformação.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d024"},{"rationale_type":"supporting_case","statement":"Capabilities relevantes da EFESO incluem a methodology BOOST.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d012"},{"rationale_type":"urgency_reason","statement":"A reestruturação anunciada define uma janela temporal.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"},{"rationale_type":"uncertainty","statement":"Não há evidência de layoffs nem de um programa de corte adicional.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d025"}]'::jsonb,
    'demo-fp-opp-raizen-restruct', 'a1100000-0000-4000-8000-00000000d032', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2110000-0000-4000-8000-00000000d025',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'Potencial oportunidade em sustentabilidade associada ao programa anunciado',
    'Observado: programa de sustentabilidade anunciado. Uma necessidade de execução sustentável pode emergir. Capabilities relevantes da EFESO incluem Sustainability. Incerteza: o recorte operacional não foi confirmado pelo cliente.',
    'sustainability', 'developing', 'medium', 'medium', 'supported', 'announced',
    'signal_trigger: sustainability program. efeso_relevance: Sustainability medium. uncertainty: operational cut not confirmed.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d021', 'a1930000-0000-4000-8000-00000000d021',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d022","relationship_type":"trigger"},{"signal_id":"a1700000-0000-4000-8000-00000000d021","relationship_type":"contextual"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d021","relationship_type":"primary"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d015","relationship_type":"capability"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Programa de sustentabilidade anunciado.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d022"},{"rationale_type":"account_context","statement":"Sustentabilidade e estratégia recorrem nos Signals.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d021"},{"rationale_type":"efeso_relevance","statement":"Sustainability = Medium Fit.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d021"},{"rationale_type":"supporting_case","statement":"Capabilities relevantes da EFESO incluem Sustainability.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d015"},{"rationale_type":"urgency_reason","statement":"O programa está announced neste dataset de demonstração.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d022"},{"rationale_type":"uncertainty","statement":"O recorte operacional do programa não foi confirmado pelo cliente.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d022"}]'::jsonb,
    'demo-fp-opp-natura-sust', 'a1100000-0000-4000-8000-00000000d030', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2110000-0000-4000-8000-00000000d026',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'Potencial oportunidade em execução de estratégia associada ao plano de crescimento',
    'Observado: plano estratégico de crescimento descrito como planned. Uma necessidade de execução pode emergir. Capabilities relevantes da EFESO incluem Operational Excellence. Incerteza: o plano permanece planned e não é tratado como concluído.',
    'strategy_execution', 'emerging', 'medium', 'low', 'inferred', 'planned',
    'signal_trigger: strategic plan planned. efeso_relevance: Operational Excellence medium. uncertainty: remains planned.',
    'Brazil', 'a1900000-0000-4000-8000-00000000d021', 'a1930000-0000-4000-8000-00000000d025',
    '[{"signal_id":"a1700000-0000-4000-8000-00000000d021","relationship_type":"trigger"}]'::jsonb,
    '[{"efeso_fit_id":"a1930000-0000-4000-8000-00000000d025","relationship_type":"primary"}]'::jsonb,
    '[{"knowledge_object_id":"a1600000-0000-4000-8000-00000000d011","relationship_type":"capability"}]'::jsonb,
    '[{"rationale_type":"signal_trigger","statement":"Plano estratégico de crescimento descrito como planned.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d021"},{"rationale_type":"account_context","statement":"O plano permanece planned; não é tratado como concluído.","source_type":"account_intelligence","source_id":"a1900000-0000-4000-8000-00000000d021"},{"rationale_type":"efeso_relevance","statement":"Operational Excellence = Medium Fit.","source_type":"efeso_fit","source_id":"a1930000-0000-4000-8000-00000000d025"},{"rationale_type":"supporting_case","statement":"Capabilities relevantes da EFESO incluem Operational Excellence.","source_type":"knowledge_object","source_id":"a1600000-0000-4000-8000-00000000d011"},{"rationale_type":"urgency_reason","statement":"O evento permanece planned.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d021"},{"rationale_type":"uncertainty","statement":"O plano estratégico permanece planned e não é tratado como execução em curso.","source_type":"signal","source_id":"a1700000-0000-4000-8000-00000000d021"}]'::jsonb,
    'demo-fp-opp-natura-strategy', 'a1100000-0000-4000-8000-00000000d030', 'promoted', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.opportunities (
  id, workspace_id, company_id, title, summary, status, opportunity_type, maturity, relevance_level,
  urgency_level, confidence_tier, assertion_mode, geography, account_intelligence_id, primary_efeso_fit_id,
  origin_opportunity_candidate_id, origin_model_run_id, version, metadata
)
SELECT
  proposed.id,
  c.workspace_id,
  c.company_id,
  c.proposed_title,
  c.proposed_summary,
  'active',
  c.proposed_opportunity_type,
  c.proposed_maturity,
  c.proposed_relevance_level,
  c.proposed_urgency_level,
  c.proposed_confidence_tier,
  c.proposed_assertion_mode,
  c.proposed_geography,
  c.proposed_account_intelligence_id,
  c.proposed_primary_efeso_fit_id,
  c.id,
  c.generation_model_run_id,
  1,
  jsonb_build_object('origin', 'demo_seed', 'fingerprint', c.candidate_fingerprint)
FROM public.opportunity_candidates c
JOIN (
  VALUES
    ('a2100000-0000-4000-8000-00000000d021'::uuid, 'a2110000-0000-4000-8000-00000000d021'::uuid),
    ('a2100000-0000-4000-8000-00000000d022'::uuid, 'a2110000-0000-4000-8000-00000000d022'::uuid),
    ('a2100000-0000-4000-8000-00000000d023'::uuid, 'a2110000-0000-4000-8000-00000000d023'::uuid),
    ('a2100000-0000-4000-8000-00000000d024'::uuid, 'a2110000-0000-4000-8000-00000000d024'::uuid),
    ('a2100000-0000-4000-8000-00000000d025'::uuid, 'a2110000-0000-4000-8000-00000000d025'::uuid),
    ('a2100000-0000-4000-8000-00000000d026'::uuid, 'a2110000-0000-4000-8000-00000000d026'::uuid)
) AS proposed(id, candidate_id) ON proposed.candidate_id = c.id
ON CONFLICT (id) DO NOTHING;

UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d021' WHERE id = 'a2110000-0000-4000-8000-00000000d021';
UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d022' WHERE id = 'a2110000-0000-4000-8000-00000000d022';
UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d023' WHERE id = 'a2110000-0000-4000-8000-00000000d023';
UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d024' WHERE id = 'a2110000-0000-4000-8000-00000000d024';
UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d025' WHERE id = 'a2110000-0000-4000-8000-00000000d025';
UPDATE public.opportunity_candidates SET promoted_opportunity_id = 'a2100000-0000-4000-8000-00000000d026' WHERE id = 'a2110000-0000-4000-8000-00000000d026';

INSERT INTO public.opportunity_signals (workspace_id, opportunity_id, signal_id, relationship_type)
SELECT workspace_id, promoted_opportunity_id, (link->>'signal_id')::uuid, link->>'relationship_type'
FROM public.opportunity_candidates,
     jsonb_array_elements(proposed_signal_links) AS link
WHERE id IN (
  'a2110000-0000-4000-8000-00000000d021',
  'a2110000-0000-4000-8000-00000000d022',
  'a2110000-0000-4000-8000-00000000d023',
  'a2110000-0000-4000-8000-00000000d024',
  'a2110000-0000-4000-8000-00000000d025',
  'a2110000-0000-4000-8000-00000000d026'
)
ON CONFLICT (opportunity_id, signal_id) DO NOTHING;

INSERT INTO public.opportunity_efeso_fits (workspace_id, opportunity_id, efeso_fit_id, relationship_type)
SELECT workspace_id, promoted_opportunity_id, (link->>'efeso_fit_id')::uuid, link->>'relationship_type'
FROM public.opportunity_candidates,
     jsonb_array_elements(proposed_fit_links) AS link
WHERE id IN (
  'a2110000-0000-4000-8000-00000000d021',
  'a2110000-0000-4000-8000-00000000d022',
  'a2110000-0000-4000-8000-00000000d023',
  'a2110000-0000-4000-8000-00000000d024',
  'a2110000-0000-4000-8000-00000000d025',
  'a2110000-0000-4000-8000-00000000d026'
)
ON CONFLICT (opportunity_id, efeso_fit_id) DO NOTHING;

INSERT INTO public.opportunity_knowledge_objects (workspace_id, opportunity_id, knowledge_object_id, relationship_type)
SELECT workspace_id, promoted_opportunity_id, (link->>'knowledge_object_id')::uuid, link->>'relationship_type'
FROM public.opportunity_candidates,
     jsonb_array_elements(proposed_knowledge_links) AS link
WHERE id IN (
  'a2110000-0000-4000-8000-00000000d021',
  'a2110000-0000-4000-8000-00000000d022',
  'a2110000-0000-4000-8000-00000000d023',
  'a2110000-0000-4000-8000-00000000d024',
  'a2110000-0000-4000-8000-00000000d025',
  'a2110000-0000-4000-8000-00000000d026'
)
ON CONFLICT (opportunity_id, knowledge_object_id, relationship_type) DO NOTHING;

INSERT INTO public.opportunity_rationales (workspace_id, opportunity_id, rationale_type, statement, source_type, source_id)
SELECT workspace_id, promoted_opportunity_id, block->>'rationale_type', block->>'statement', NULLIF(block->>'source_type', ''), NULLIF(block->>'source_id', '')::uuid
FROM public.opportunity_candidates,
     jsonb_array_elements(proposed_rationale_blocks) AS block
WHERE id IN (
  'a2110000-0000-4000-8000-00000000d021',
  'a2110000-0000-4000-8000-00000000d022',
  'a2110000-0000-4000-8000-00000000d023',
  'a2110000-0000-4000-8000-00000000d024',
  'a2110000-0000-4000-8000-00000000d025',
  'a2110000-0000-4000-8000-00000000d026'
);

-- Sprint 8 — Relationship Intelligence + Recommended Actions (synthetic demo_seed).
INSERT INTO public.relationship_persons (
  id, workspace_id, display_name, organization, role_title, person_type, status, metadata
) VALUES
  (
    'a2200000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'Demo Partner A', 'EFESO', 'Partner', 'efeso_internal', 'active',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2200000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'Demo Consultant B', 'EFESO', 'Consultant', 'efeso_internal', 'active',
    '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2200000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'Demo Client Contact A', 'Demo Account', 'Executive contact', 'client_contact', 'active',
    '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.account_relationships (
  id, workspace_id, company_id, relationship_status, relationship_strength, data_quality,
  last_known_interaction_at, relationship_summary, source_type, status, version, metadata
) VALUES
  (
    'a2210000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'active_client', 'strong', 'verified', '2026-03-15T00:00:00Z',
    'Cliente ativo de demonstração com responsável da conta explícito.',
    'demo_seed', 'active', 1, '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2210000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'prospect', 'unknown', 'partial', NULL,
    'Prospect de demonstração. Dados de relacionamento indisponíveis além do status prospect.',
    'demo_seed', 'active', 1, '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2210000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'former_client', 'medium', 'partial', '2024-06-01T00:00:00Z',
    'Ex-cliente de demonstração. Força média registrada; sem responsável da conta atual.',
    'demo_seed', 'active', 1, '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.company_relationship_contacts (
  id, workspace_id, company_id, relationship_person_id, relationship_role, strength,
  last_interaction_at, source_type, status
) VALUES
  (
    'a2220000-0000-4000-8000-00000000d001',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'a2200000-0000-4000-8000-00000000d001',
    'account_owner', 'strong', '2026-03-15T00:00:00Z', 'demo_seed', 'active'
  ),
  (
    'a2220000-0000-4000-8000-00000000d002',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'a2200000-0000-4000-8000-00000000d002',
    'relationship_holder', 'medium', '2026-03-15T00:00:00Z', 'demo_seed', 'active'
  ),
  (
    'a2220000-0000-4000-8000-00000000d003',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'a2200000-0000-4000-8000-00000000d003',
    'executive_contact', 'unknown', NULL, 'demo_seed', 'active'
  ),
  (
    'a2220000-0000-4000-8000-00000000d004',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'a2200000-0000-4000-8000-00000000d002',
    'former_contact', 'medium', '2024-06-01T00:00:00Z', 'demo_seed', 'active'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.model_runs (
  id, workspace_id, analysis_id, research_run_id, source_snapshot_id,
  task_type, provider, model_name, prompt_version, schema_version, status, input_hash, metadata
) VALUES
  (
    'a1100000-0000-4000-8000-00000000d040',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'f1000000-0000-4000-8000-00000000d002',
    'relationship_action_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-act-vale', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d041',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'f1000000-0000-4000-8000-00000000d003',
    'relationship_action_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-act-raizen', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a1100000-0000-4000-8000-00000000d042',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'f1000000-0000-4000-8000-00000000d001',
    'relationship_action_generation', 'fake', 'demo-seed', 'demo-seed-v1', 'demo-seed-schema-v1', 'completed',
    'demo-input-hash-act-natura', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recommended_action_candidates (
  id, workspace_id, company_id, analysis_id, research_run_id, opportunity_id,
  proposed_action_type, proposed_title, proposed_rationale, proposed_priority, proposed_confidence_tier,
  proposed_opportunity_links, proposed_relationship_links, proposed_knowledge_links, proposed_rationale_blocks,
  candidate_fingerprint, generation_model_run_id, status, metadata
) VALUES
  (
    'a2300000-0000-4000-8000-00000000d021',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'a2100000-0000-4000-8000-00000000d021',
    'contact_account_owner',
    'Alinhar com o responsável da conta registrado',
    'Oportunidade de alta relevância. Relacionamento forte com responsável da conta explícito. Sugestão estruturada, sem contato externo automático.',
    'medium', 'direct',
    '[{"opportunity_id":"a2100000-0000-4000-8000-00000000d021","relationship_type":"primary"}]'::jsonb,
    '[{"account_relationship_id":"a2210000-0000-4000-8000-00000000d001","relationship_type":"informs"}]'::jsonb,
    '[]'::jsonb,
    '[{"rationale_type":"opportunity_context","statement":"Oportunidade de ramp-up com relevância alta.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"relationship_context","statement":"Cliente ativo, força strong, responsável da conta Demo Partner A.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d001"},{"rationale_type":"urgency_context","statement":"Urgência alta na oportunidade persistida.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"efeso_context","statement":"Fit EFESO em Asset Productivity.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"uncertainty","statement":"A ação é uma sugestão estruturada e não executa contato automático.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d001"}]'::jsonb,
    'demo-fp-act-vale-owner', 'a1100000-0000-4000-8000-00000000d040', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2300000-0000-4000-8000-00000000d022',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-00000000d002',
    'd1000000-0000-4000-8000-00000000d002',
    'a2100000-0000-4000-8000-00000000d021',
    'align_internal_team',
    'Alinhar o time interno sobre a oportunidade',
    'Alta relevância comercial com relacionamento forte. Próximo passo interno, sem contato direto com o cliente.',
    'medium', 'supported',
    '[{"opportunity_id":"a2100000-0000-4000-8000-00000000d021","relationship_type":"supporting"}]'::jsonb,
    '[{"account_relationship_id":"a2210000-0000-4000-8000-00000000d001","relationship_type":"informs"}]'::jsonb,
    '[]'::jsonb,
    '[{"rationale_type":"opportunity_context","statement":"Oportunidade de ramp-up com relevância alta.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"relationship_context","statement":"Relacionamento strong com holders internos conhecidos.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d001"},{"rationale_type":"urgency_context","statement":"Urgência alta.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"efeso_context","statement":"Fit EFESO em Asset Productivity.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d021"},{"rationale_type":"uncertainty","statement":"A ação é uma sugestão estruturada e não executa contato automático.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d001"}]'::jsonb,
    'demo-fp-act-vale-align', 'a1100000-0000-4000-8000-00000000d040', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2300000-0000-4000-8000-00000000d023',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-00000000d003',
    'd1000000-0000-4000-8000-00000000d003',
    'a2100000-0000-4000-8000-00000000d023',
    'validate_relationship',
    'Validar relacionamento com a conta',
    'Oportunidade persistida com relacionamento unknown. Dados de relacionamento indisponíveis. Não se infere fraqueza nem se escolhe um responsável.',
    'medium', 'inferred',
    '[{"opportunity_id":"a2100000-0000-4000-8000-00000000d023","relationship_type":"primary"}]'::jsonb,
    '[{"account_relationship_id":"a2210000-0000-4000-8000-00000000d002","relationship_type":"informs"}]'::jsonb,
    '[]'::jsonb,
    '[{"rationale_type":"opportunity_context","statement":"Oportunidade de redução de custo com relevância alta.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d023"},{"rationale_type":"relationship_context","statement":"Dados de relacionamento indisponíveis.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d002"},{"rationale_type":"urgency_context","statement":"Urgência da oportunidade persistida.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d023"},{"rationale_type":"efeso_context","statement":"Fit EFESO associado à oportunidade.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d023"},{"rationale_type":"uncertainty","statement":"Dados de relacionamento indisponíveis. Ausência de dado não significa ausência de relacionamento.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d002"}]'::jsonb,
    'demo-fp-act-raizen-validate', 'a1100000-0000-4000-8000-00000000d041', 'promoted', '{"origin":"demo_seed"}'::jsonb
  ),
  (
    'a2300000-0000-4000-8000-00000000d024',
    '0e8f0e50-b2a1-4c3d-9e7f-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-00000000d001',
    'd1000000-0000-4000-8000-00000000d001',
    'a2100000-0000-4000-8000-00000000d025',
    'reconnect_existing_relationship',
    'Retomar relacionamento interno existente',
    'Ex-cliente com força média registrada. Oportunidade de relevância média. Sem responsável da conta atual.',
    'medium', 'supported',
    '[{"opportunity_id":"a2100000-0000-4000-8000-00000000d025","relationship_type":"primary"}]'::jsonb,
    '[{"account_relationship_id":"a2210000-0000-4000-8000-00000000d003","relationship_type":"informs"}]'::jsonb,
    '[]'::jsonb,
    '[{"rationale_type":"opportunity_context","statement":"Oportunidade de sustentabilidade com relevância média.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d025"},{"rationale_type":"relationship_context","statement":"Former client, força medium. Responsável interno não identificado.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d003"},{"rationale_type":"urgency_context","statement":"Urgência média.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d025"},{"rationale_type":"efeso_context","statement":"Fit EFESO em Sustainability.","source_type":"opportunity","source_id":"a2100000-0000-4000-8000-00000000d025"},{"rationale_type":"uncertainty","statement":"A ação é uma sugestão estruturada e não executa contato automático.","source_type":"account_relationship","source_id":"a2210000-0000-4000-8000-00000000d003"}]'::jsonb,
    'demo-fp-act-natura-reconnect', 'a1100000-0000-4000-8000-00000000d042', 'promoted', '{"origin":"demo_seed"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recommended_actions (
  id, workspace_id, company_id, opportunity_id, action_type, title, rationale, status, priority,
  confidence_tier, relationship_context_id, origin_action_candidate_id, origin_model_run_id, version, metadata
)
SELECT
  proposed.id,
  c.workspace_id,
  c.company_id,
  c.opportunity_id,
  c.proposed_action_type,
  c.proposed_title,
  c.proposed_rationale,
  'active',
  c.proposed_priority,
  c.proposed_confidence_tier,
  CASE
    WHEN jsonb_typeof(c.proposed_relationship_links) = 'array'
         AND jsonb_array_length(c.proposed_relationship_links) > 0
    THEN (c.proposed_relationship_links->0->>'account_relationship_id')::uuid
    ELSE NULL
  END,
  c.id,
  c.generation_model_run_id,
  1,
  jsonb_build_object('origin', 'demo_seed', 'fingerprint', c.candidate_fingerprint)
FROM public.recommended_action_candidates c
JOIN (
  VALUES
    ('a2310000-0000-4000-8000-00000000d021'::uuid, 'a2300000-0000-4000-8000-00000000d021'::uuid),
    ('a2310000-0000-4000-8000-00000000d022'::uuid, 'a2300000-0000-4000-8000-00000000d022'::uuid),
    ('a2310000-0000-4000-8000-00000000d023'::uuid, 'a2300000-0000-4000-8000-00000000d023'::uuid),
    ('a2310000-0000-4000-8000-00000000d024'::uuid, 'a2300000-0000-4000-8000-00000000d024'::uuid)
) AS proposed(id, candidate_id) ON proposed.candidate_id = c.id
ON CONFLICT (id) DO NOTHING;

UPDATE public.recommended_action_candidates SET promoted_action_id = 'a2310000-0000-4000-8000-00000000d021' WHERE id = 'a2300000-0000-4000-8000-00000000d021';
UPDATE public.recommended_action_candidates SET promoted_action_id = 'a2310000-0000-4000-8000-00000000d022' WHERE id = 'a2300000-0000-4000-8000-00000000d022';
UPDATE public.recommended_action_candidates SET promoted_action_id = 'a2310000-0000-4000-8000-00000000d023' WHERE id = 'a2300000-0000-4000-8000-00000000d023';
UPDATE public.recommended_action_candidates SET promoted_action_id = 'a2310000-0000-4000-8000-00000000d024' WHERE id = 'a2300000-0000-4000-8000-00000000d024';

INSERT INTO public.recommended_action_opportunities (workspace_id, action_id, opportunity_id, relationship_type)
SELECT workspace_id, promoted_action_id, (link->>'opportunity_id')::uuid, link->>'relationship_type'
FROM public.recommended_action_candidates,
     jsonb_array_elements(proposed_opportunity_links) AS link
WHERE id IN (
  'a2300000-0000-4000-8000-00000000d021',
  'a2300000-0000-4000-8000-00000000d022',
  'a2300000-0000-4000-8000-00000000d023',
  'a2300000-0000-4000-8000-00000000d024'
)
ON CONFLICT (action_id, opportunity_id, relationship_type) DO NOTHING;

INSERT INTO public.recommended_action_relationships (workspace_id, action_id, account_relationship_id, relationship_type)
SELECT workspace_id, promoted_action_id, (link->>'account_relationship_id')::uuid, link->>'relationship_type'
FROM public.recommended_action_candidates,
     jsonb_array_elements(proposed_relationship_links) AS link
WHERE id IN (
  'a2300000-0000-4000-8000-00000000d021',
  'a2300000-0000-4000-8000-00000000d022',
  'a2300000-0000-4000-8000-00000000d023',
  'a2300000-0000-4000-8000-00000000d024'
)
ON CONFLICT (action_id, account_relationship_id, relationship_type) DO NOTHING;

INSERT INTO public.recommended_action_rationales (workspace_id, action_id, rationale_type, statement, source_type, source_id)
SELECT workspace_id, promoted_action_id, block->>'rationale_type', block->>'statement', NULLIF(block->>'source_type', ''), NULLIF(block->>'source_id', '')::uuid
FROM public.recommended_action_candidates,
     jsonb_array_elements(proposed_rationale_blocks) AS block
WHERE id IN (
  'a2300000-0000-4000-8000-00000000d021',
  'a2300000-0000-4000-8000-00000000d022',
  'a2300000-0000-4000-8000-00000000d023',
  'a2300000-0000-4000-8000-00000000d024'
);
