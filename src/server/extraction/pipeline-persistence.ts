import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { sha256Utf8Text } from "@/server/extraction/sha256";
import type { ParsedContentBlock } from "@/server/parsers/types";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import { asRow, asRowList, type ClaimCandidateEvidenceRow, type ClaimCandidateRow, type ClaimCandidateValidationRow, type ModelRunRow, type SourceContentBlockRow } from "./pipeline-rows";

function admin() {
  return createPipelineAdminClient();
}

export async function listBlocksForSnapshot(snapshotId: string): Promise<SourceContentBlockRow[]> {
  const { data, error } = await admin()
    .from("source_content_blocks")
    .select("*")
    .eq("source_snapshot_id", snapshotId)
    .order("parser_version", { ascending: true })
    .order("block_index", { ascending: true });
  if (error) throw error;
  return asRowList<SourceContentBlockRow>(data);
}

export async function listBlocksForParser(
  snapshotId: string,
  parserName: string,
  parserVersion: string,
): Promise<SourceContentBlockRow[]> {
  const { data, error } = await admin()
    .from("source_content_blocks")
    .select("*")
    .eq("source_snapshot_id", snapshotId)
    .eq("parser_name", parserName)
    .eq("parser_version", parserVersion)
    .order("block_index", { ascending: true });
  if (error) throw error;
  return asRowList<SourceContentBlockRow>(data);
}

export async function insertContentBlocks(input: {
  workspaceId: string;
  sourceSnapshotId: string;
  parserName: string;
  parserVersion: string;
  blocks: ParsedContentBlock[];
}): Promise<SourceContentBlockRow[]> {
  if (input.blocks.length === 0) return [];
  const rows = input.blocks.map((block) => ({
    workspace_id: input.workspaceId,
    source_snapshot_id: input.sourceSnapshotId,
    block_index: block.blockIndex,
    block_type: block.blockType,
    text_content: block.textContent,
    content_hash: sha256Utf8Text(block.textContent),
    page_number: block.pageNumber,
    section_title: block.sectionTitle,
    locator: block.locator,
    parser_name: input.parserName,
    parser_version: input.parserVersion,
    parse_confidence: block.parseConfidence,
    metadata: block.metadata,
  }));
  const { data, error } = await admin().from("source_content_blocks").insert(rows).select("*");
  if (error) throw error;
  return asRowList<SourceContentBlockRow>(data).sort((a, b) => a.block_index - b.block_index);
}

export async function createRunningModelRun(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  taskType: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  inputManifest: Record<string, unknown>;
  inputHash: string;
}): Promise<ModelRunRow> {
  const { data, error } = await admin()
    .from("model_runs")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      task_type: input.taskType,
      provider: input.provider,
      model_name: input.modelName,
      prompt_version: input.promptVersion,
      schema_version: input.schemaVersion,
      status: "running",
      input_manifest: input.inputManifest,
      input_hash: input.inputHash,
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<ModelRunRow>(data);
}

export async function completeModelRun(input: {
  id: string;
  status: "completed" | "failed" | "incomplete" | "cancelled";
  modelVersion?: string | null;
  providerResponseId?: string | null;
  outputHash?: string | null;
  inputTokens?: number | null;
  cachedInputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ModelRunRow> {
  const { data, error } = await admin()
    .from("model_runs")
    .update({
      status: input.status,
      model_version: input.modelVersion ?? null,
      provider_response_id: input.providerResponseId ?? null,
      output_hash: input.outputHash ?? null,
      input_tokens: input.inputTokens ?? null,
      cached_input_tokens: input.cachedInputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return asRow<ModelRunRow>(data);
}

export async function findCandidateByFingerprint(
  sourceSnapshotId: string,
  fingerprint: string,
  analysisId?: string,
): Promise<ClaimCandidateRow | null> {
  let query = admin()
    .from("claim_candidates")
    .select("*")
    .eq("source_snapshot_id", sourceSnapshotId)
    .eq("candidate_fingerprint", fingerprint);
  if (analysisId) query = query.eq("analysis_id", analysisId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? asRow<ClaimCandidateRow>(data) : null;
}

export async function insertClaimCandidate(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  companyId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  fingerprint: string;
  proposedStatement: string;
  claimCategory: string;
  claimType: string;
  assertionMode: string;
  entityId: string | null;
  geographyLevel: string | null;
  countryCode: string | null;
  stateRegion: string | null;
  city: string | null;
  periodType: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  asOfDate: string | null;
  metricName: string | null;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  scale: string | null;
  modelExtractionConfidence: number | null;
}): Promise<ClaimCandidateRow> {
  const { data, error } = await admin()
    .from("claim_candidates")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      company_id: input.companyId,
      source_snapshot_id: input.sourceSnapshotId,
      origin_model_run_id: input.originModelRunId,
      candidate_fingerprint: input.fingerprint,
      proposed_statement: input.proposedStatement,
      claim_category: input.claimCategory,
      claim_type: input.claimType,
      assertion_mode: input.assertionMode,
      entity_id: input.entityId,
      geography_level: input.geographyLevel,
      country_code: input.countryCode,
      state_region: input.stateRegion,
      city: input.city,
      period_type: input.periodType,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      as_of_date: input.asOfDate,
      metric_name: input.metricName,
      numeric_value: input.numericValue,
      unit: input.unit,
      currency_code: input.currencyCode,
      scale: input.scale,
      model_extraction_confidence: input.modelExtractionConfidence,
      status: "pending_validation",
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<ClaimCandidateRow>(data);
}

export async function updateCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<ClaimCandidateRow> {
  const { data, error } = await admin()
    .from("claim_candidates")
    .update({
      status: input.status,
      rejection_reason_code: input.rejectionReasonCode,
      rejection_reason_text: input.rejectionReasonText,
      validated_at: input.status === "validated" ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .eq("status", input.fromStatus)
    .select("*")
    .single();
  if (error) throw error;
  return asRow<ClaimCandidateRow>(data);
}

export async function insertCandidateEvidence(input: {
  workspaceId: string;
  claimCandidateId: string;
  sourceContentBlockId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  citationOrder: number;
  exactQuote: string;
  charStart: number | null;
  charEnd: number | null;
  relationship: "supports" | "contextualizes";
}): Promise<ClaimCandidateEvidenceRow | null> {
  const { data, error } = await admin()
    .from("claim_candidate_evidence")
    .insert({
      workspace_id: input.workspaceId,
      claim_candidate_id: input.claimCandidateId,
      source_content_block_id: input.sourceContentBlockId,
      source_snapshot_id: input.sourceSnapshotId,
      origin_model_run_id: input.originModelRunId,
      citation_order: input.citationOrder,
      exact_quote: input.exactQuote,
      char_start: input.charStart,
      char_end: input.charEnd,
      relationship: input.relationship,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return asRow<ClaimCandidateEvidenceRow>(data);
}

export async function listCandidateEvidence(candidateId: string): Promise<ClaimCandidateEvidenceRow[]> {
  const { data, error } = await admin()
    .from("claim_candidate_evidence")
    .select("*")
    .eq("claim_candidate_id", candidateId)
    .order("citation_order", { ascending: true });
  if (error) throw error;
  return asRowList<ClaimCandidateEvidenceRow>(data);
}

export async function insertValidations(input: {
  workspaceId: string;
  claimCandidateId: string;
  validationRound: number;
  records: ValidationRecord[];
}): Promise<ClaimCandidateValidationRow[]> {
  if (input.records.length === 0) return [];
  const rows = input.records.map((record) => ({
    workspace_id: input.workspaceId,
    claim_candidate_id: input.claimCandidateId,
    validation_round: input.validationRound,
    validator_code: record.validatorCode,
    validator_version: record.validatorVersion,
    validator_type: record.validatorType,
    result: record.result,
    severity: record.severity,
    model_run_id: record.modelRunId ?? null,
    message: record.message,
    details: record.details,
  }));
  const { data, error } = await admin().from("claim_candidate_validations").insert(rows).select("*");
  if (error) throw error;
  return asRowList<ClaimCandidateValidationRow>(data);
}

export async function failStaleRunningModelRuns(analysisId: string): Promise<number> {
  const { data, error } = await admin()
    .from("model_runs")
    .update({
      status: "failed",
      error_code: "stale_resume",
      error_message: "Interrupted model run closed on resume.",
      completed_at: new Date().toISOString(),
    })
    .eq("analysis_id", analysisId)
    .eq("status", "running")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function listCandidatesForSnapshot(sourceSnapshotId: string): Promise<ClaimCandidateRow[]> {
  const { data, error } = await admin()
    .from("claim_candidates")
    .select("*")
    .eq("source_snapshot_id", sourceSnapshotId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<ClaimCandidateRow>(data);
}

export async function listCandidatesForAnalysis(analysisId: string): Promise<ClaimCandidateRow[]> {
  const { data, error } = await admin()
    .from("claim_candidates")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<ClaimCandidateRow>(data);
}

export async function listValidationsForCandidate(candidateId: string): Promise<ClaimCandidateValidationRow[]> {
  const { data, error } = await admin()
    .from("claim_candidate_validations")
    .select("*")
    .eq("claim_candidate_id", candidateId)
    .order("validation_round", { ascending: true });
  if (error) throw error;
  return asRowList<ClaimCandidateValidationRow>(data);
}

export async function getBlockById(blockId: string): Promise<SourceContentBlockRow | null> {
  const { data, error } = await admin().from("source_content_blocks").select("*").eq("id", blockId).maybeSingle();
  if (error) throw error;
  return data ? asRow<SourceContentBlockRow>(data) : null;
}

export async function getClaimByOriginCandidate(candidateId: string): Promise<{ id: string } | null> {
  const { data, error } = await admin()
    .from("claims")
    .select("id")
    .eq("origin_claim_candidate_id", candidateId)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<{ id: string }>(data) : null;
}
