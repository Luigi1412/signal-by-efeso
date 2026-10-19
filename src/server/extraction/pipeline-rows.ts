export interface SourceContentBlockRow {
  id: string;
  workspace_id: string;
  source_snapshot_id: string;
  block_index: number;
  block_type: string;
  text_content: string;
  content_hash: string;
  page_number: number | null;
  section_title: string | null;
  locator: Record<string, unknown>;
  parser_name: string;
  parser_version: string;
  parse_confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ModelRunRow {
  id: string;
  workspace_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string | null;
  task_type: string;
  provider: string;
  model_name: string;
  model_version: string | null;
  provider_response_id: string | null;
  prompt_version: string;
  schema_version: string;
  status: string;
  input_manifest: Record<string, unknown>;
  input_hash: string;
  output_hash: string | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ClaimCandidateRow {
  id: string;
  workspace_id: string;
  analysis_id: string;
  research_run_id: string;
  company_id: string;
  source_snapshot_id: string;
  origin_model_run_id: string;
  candidate_fingerprint: string;
  proposed_statement: string;
  claim_category: string;
  claim_type: string;
  assertion_mode: string;
  entity_id: string | null;
  geography_level: string | null;
  country_code: string | null;
  state_region: string | null;
  city: string | null;
  period_type: string | null;
  period_start: string | null;
  period_end: string | null;
  as_of_date: string | null;
  metric_name: string | null;
  numeric_value: number | null;
  unit: string | null;
  currency_code: string | null;
  scale: string | null;
  model_extraction_confidence: number | null;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  validated_at: string | null;
  promoted_at: string | null;
  created_at: string;
}

export interface ClaimCandidateEvidenceRow {
  id: string;
  workspace_id: string;
  claim_candidate_id: string;
  source_content_block_id: string;
  source_snapshot_id: string;
  origin_model_run_id: string;
  citation_order: number;
  exact_quote: string;
  char_start: number | null;
  char_end: number | null;
  relationship: string;
  proposed_directness: string | null;
  created_at: string;
}

export interface ClaimCandidateValidationRow {
  id: string;
  workspace_id: string;
  claim_candidate_id: string;
  validation_round: number;
  validator_code: string;
  validator_version: string;
  validator_type: string;
  result: string;
  severity: string;
  model_run_id: string | null;
  message: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function asRow<T>(data: unknown): T {
  return data as T;
}

export function asRowList<T>(data: unknown): T[] {
  return (data as T[] | null) ?? [];
}
