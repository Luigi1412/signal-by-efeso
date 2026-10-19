import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ValidationRecord } from "@/server/extraction/validation-types";

function admin() {
  return createPipelineAdminClient();
}

export interface SignalCandidateRow {
  id: string;
  workspace_id: string;
  company_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string | null;
  proposed_signal_type: string;
  proposed_signal_nature: string;
  proposed_title: string;
  proposed_summary: string;
  proposed_importance: string;
  proposed_assertion_mode: string;
  proposed_confidence_tier: string | null;
  proposed_event_date: string | null;
  proposed_effective_period_start: string | null;
  proposed_effective_period_end: string | null;
  proposed_geography: string | null;
  proposed_metric_name: string | null;
  proposed_numeric_value: number | null;
  proposed_unit: string | null;
  proposed_currency_code: string | null;
  proposed_core_event: string;
  proposed_tags: unknown;
  proposed_companies: unknown;
  proposed_parent_signal_id: string | null;
  candidate_fingerprint: string;
  extraction_model_run_id: string;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_signal_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SignalRow {
  id: string;
  workspace_id: string;
  company_id: string;
  signal_type: string;
  signal_nature: string;
  title: string;
  summary: string;
  status: string;
  importance: string;
  confidence_tier: string;
  assertion_mode: string;
  event_date: string | null;
  effective_period_start: string | null;
  effective_period_end: string | null;
  geography: string | null;
  metric_name: string | null;
  numeric_value: number | null;
  unit: string | null;
  currency_code: string | null;
  signal_fingerprint: string;
  source_snapshot_id: string | null;
  origin_signal_candidate_id: string | null;
  origin_model_run_id: string | null;
  parent_signal_id: string | null;
  supersedes_signal_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function insertSignalCandidate(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string | null;
  signalType: string;
  signalNature: string;
  title: string;
  summary: string;
  importance: string;
  assertionMode: string;
  confidenceTier: string | null;
  eventDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  geography: string | null;
  metricName: string | null;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  coreEvent: string;
  tags: unknown;
  companies: unknown;
  parentSignalId: string | null;
  fingerprint: string;
  extractionModelRunId: string;
  metadata?: Record<string, unknown>;
}): Promise<SignalCandidateRow> {
  const { data, error } = await admin()
    .from("signal_candidates")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      proposed_signal_type: input.signalType,
      proposed_signal_nature: input.signalNature,
      proposed_title: input.title,
      proposed_summary: input.summary,
      proposed_importance: input.importance,
      proposed_assertion_mode: input.assertionMode,
      proposed_confidence_tier: input.confidenceTier,
      proposed_event_date: input.eventDate,
      proposed_effective_period_start: input.periodStart,
      proposed_effective_period_end: input.periodEnd,
      proposed_geography: input.geography,
      proposed_metric_name: input.metricName,
      proposed_numeric_value: input.numericValue,
      proposed_unit: input.unit,
      proposed_currency_code: input.currencyCode,
      proposed_core_event: input.coreEvent,
      proposed_tags: input.tags,
      proposed_companies: input.companies,
      proposed_parent_signal_id: input.parentSignalId,
      candidate_fingerprint: input.fingerprint,
      extraction_model_run_id: input.extractionModelRunId,
      status: "pending_validation",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<SignalCandidateRow>(data);
}

export async function findSignalCandidateByFingerprint(
  workspaceId: string,
  companyId: string,
  fingerprint: string,
): Promise<SignalCandidateRow | null> {
  const { data, error } = await admin()
    .from("signal_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<SignalCandidateRow>(data) : null;
}

export async function insertSignalCandidateClaims(input: {
  workspaceId: string;
  candidateId: string;
  claims: { claimId: string; relationshipType: string }[];
}): Promise<void> {
  if (input.claims.length === 0) return;
  const { error } = await admin().from("signal_candidate_claims").insert(
    input.claims.map((claim) => ({
      workspace_id: input.workspaceId,
      signal_candidate_id: input.candidateId,
      claim_id: claim.claimId,
      relationship_type: claim.relationshipType,
    })),
  );
  if (error) throw error;
}

export async function insertSignalValidations(input: {
  workspaceId: string;
  candidateId: string;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("signal_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      signal_candidate_id: input.candidateId,
      validator_code: record.validatorCode,
      validator_version: record.validatorVersion,
      validator_type: record.validatorType,
      result: record.result,
      severity: record.severity,
      model_run_id: record.modelRunId ?? null,
      message: record.message,
      details: record.details,
    })),
  );
  if (error) throw error;
}

export async function updateSignalCandidateConfidence(id: string, confidenceTier: string | null): Promise<void> {
  const { error } = await admin()
    .from("signal_candidates")
    .update({ proposed_confidence_tier: confidenceTier })
    .eq("id", id);
  if (error) throw error;
}

export async function updateSignalCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("signal_candidates")
    .update({
      status: input.status,
      rejection_reason_code: input.rejectionReasonCode,
      rejection_reason_text: input.rejectionReasonText,
      validated_at: input.status === "validated" ? new Date().toISOString() : null,
    })
    .eq("id", input.id)
    .eq("status", input.fromStatus);
  if (error) throw error;
}

export async function listSignalCandidatesForAnalysis(analysisId: string): Promise<SignalCandidateRow[]> {
  const { data, error } = await admin()
    .from("signal_candidates")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<SignalCandidateRow>(data);
}

export async function listSignalCandidateClaims(candidateId: string) {
  const { data, error } = await admin()
    .from("signal_candidate_claims")
    .select("*")
    .eq("signal_candidate_id", candidateId);
  if (error) throw error;
  return asRowList<{ claim_id: string; relationship_type: string }>(data);
}

export async function listSignalValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("signal_candidate_validations")
    .select("*")
    .eq("signal_candidate_id", candidateId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<{
    validator_code: string;
    result: string;
    severity: string;
    message: string | null;
    details: Record<string, unknown>;
    validator_version: string;
    validator_type: string;
    model_run_id: string | null;
  }>(data);
}

export async function listSignalsForWorkspace(workspaceId: string): Promise<SignalRow[]> {
  const { data, error } = await admin()
    .from("signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<SignalRow>(data);
}

export async function listSignalsForCompany(workspaceId: string, companyId: string): Promise<SignalRow[]> {
  const { data, error } = await admin()
    .from("signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<SignalRow>(data);
}

export async function getSignal(workspaceId: string, id: string): Promise<SignalRow | null> {
  const { data, error } = await admin()
    .from("signals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<SignalRow>(data) : null;
}

export async function listSignalClaims(signalId: string) {
  const { data, error } = await admin().from("signal_claims").select("*").eq("signal_id", signalId);
  if (error) throw error;
  return asRowList<{ claim_id: string; relationship_type: string }>(data);
}

export async function listSignalCompanies(signalId: string) {
  const { data, error } = await admin().from("signal_companies").select("*").eq("signal_id", signalId);
  if (error) throw error;
  return asRowList<{ company_id: string; role: string }>(data);
}

export async function listSignalTags(signalId: string) {
  const { data, error } = await admin()
    .from("signal_tags")
    .select("tag_id, knowledge_tags(category, canonical_name)")
    .eq("signal_id", signalId);
  if (error) throw error;
  return (data ?? []) as {
    tag_id: string;
    knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
  }[];
}

export async function listActiveSignalFingerprints(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("signals")
    .select("signal_fingerprint")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row) => String((row as { signal_fingerprint: string }).signal_fingerprint));
}

export async function listActiveSignalTitles(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("signals")
    .select("title")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row) => String((row as { title: string }).title));
}

export async function listClaimsForSignalExtraction(input: {
  workspaceId: string;
  companyId: string;
  analysisId?: string | null;
  claimIds?: string[] | null;
}) {
  let query = admin()
    .from("claims")
    .select(
      "id, workspace_id, company_id, statement, assertion_mode, claim_status, metric_name, numeric_value, unit, currency_code, country_code, state_region, city, geography_level, period_start, period_end, as_of_date, origin_claim_candidate_id",
    )
    .eq("workspace_id", input.workspaceId)
    .eq("company_id", input.companyId)
    .eq("claim_status", "active");
  if (input.analysisId) query = query.eq("analysis_id", input.analysisId);
  if (input.claimIds && input.claimIds.length > 0) query = query.in("id", input.claimIds);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<{
    id: string;
    workspace_id: string;
    company_id: string;
    statement: string;
    assertion_mode: string;
    claim_status: string;
    metric_name: string | null;
    numeric_value: number | null;
    unit: string | null;
    currency_code: string | null;
    country_code: string | null;
    state_region: string | null;
    city: string | null;
    geography_level: string | null;
    period_start: string | null;
    period_end: string | null;
    as_of_date: string | null;
    origin_claim_candidate_id: string | null;
  }>(data);
}

export async function getClaimCandidateSnapshot(candidateId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("claim_candidates")
    .select("source_snapshot_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (error) throw error;
  return data ? String((data as { source_snapshot_id: string }).source_snapshot_id) : null;
}

export async function listEvidenceQuotesForClaims(claimIds: string[]) {
  if (claimIds.length === 0) return [];
  const { data, error } = await admin()
    .from("claim_evidence")
    .select("claim_id, evidence_fragments(excerpt, source_snapshot_id)")
    .in("claim_id", claimIds);
  if (error) throw error;
  return (data ?? []) as {
    claim_id: string;
    evidence_fragments:
      | { excerpt: string; source_snapshot_id: string | null }
      | { excerpt: string; source_snapshot_id: string | null }[]
      | null;
  }[];
}

export async function listClaimsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await admin()
    .from("claims")
    .select("id, statement, assertion_mode")
    .in("id", ids);
  if (error) throw error;
  return asRowList<{ id: string; statement: string; assertion_mode: string }>(data);
}

export async function getCompanyRow(workspaceId: string, companyId: string) {
  const { data, error } = await admin()
    .from("companies")
    .select("id, display_name, slug, industry, primary_country_code, resolution_status, workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? asRow<{
        id: string;
        display_name: string;
        slug: string;
        industry: string | null;
        primary_country_code: string | null;
        resolution_status: string;
        workspace_id: string;
      }>(data)
    : null;
}

export async function listCompaniesForWorkspace(workspaceId: string) {
  const { data, error } = await admin()
    .from("companies")
    .select("id, display_name, slug, industry, updated_at")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return asRowList<{ id: string; display_name: string; slug: string; industry: string | null; updated_at: string }>(data);
}

export async function getSnapshotForRun(workspaceId: string, researchRunId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("source_snapshots")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("captured_by_research_run_id", researchRunId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? String((data as { id: string }).id) : null;
}
