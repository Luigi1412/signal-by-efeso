import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import type { AccountNarrativeDraft, AccountSignalLinkDraft, AccountThemeDraft, AccountTensionDraft, FitComponentDraft, SignalKnowledgeMatchDraft } from "./types";

function admin() {
  return createPipelineAdminClient();
}

export interface AccountIntelligenceCandidateRow {
  id: string;
  workspace_id: string;
  company_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string | null;
  proposed_headline: string;
  proposed_executive_summary: string;
  proposed_strategic_direction: string | null;
  proposed_pressure_summary: string | null;
  proposed_investment_summary: string | null;
  proposed_operating_context_summary: string | null;
  proposed_risk_summary: string | null;
  proposed_change_summary: string | null;
  proposed_sections: Record<string, string>;
  proposed_period_start: string | null;
  proposed_period_end: string | null;
  proposed_tensions: unknown;
  proposed_themes: unknown;
  proposed_signal_links: unknown;
  candidate_fingerprint: string;
  extraction_model_run_id: string;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_account_intelligence_id: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AccountIntelligenceRow {
  id: string;
  workspace_id: string;
  company_id: string;
  status: string;
  generated_at: string;
  period_start: string | null;
  period_end: string | null;
  headline: string;
  executive_summary: string;
  strategic_direction: string | null;
  pressure_summary: string | null;
  investment_summary: string | null;
  operating_context_summary: string | null;
  risk_summary: string | null;
  change_summary: string | null;
  sections: Record<string, string>;
  origin_model_run_id: string | null;
  origin_candidate_id: string | null;
  version: number;
  supersedes_account_intelligence_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EfesoFitCandidateRow {
  id: string;
  workspace_id: string;
  company_id: string;
  knowledge_object_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string | null;
  proposed_components: unknown;
  proposed_rationale: string;
  proposed_fit_level: string;
  proposed_fit_score: number;
  candidate_fingerprint: string;
  model_run_id: string | null;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_fit_id: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EfesoFitRow {
  id: string;
  workspace_id: string;
  company_id: string;
  knowledge_object_id: string;
  status: string;
  fit_level: string;
  fit_score: number | null;
  fit_reason_summary: string;
  origin_model_run_id: string | null;
  origin_candidate_id: string | null;
  version: number;
  supersedes_fit_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function insertAccountIntelligenceCandidate(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string | null;
  draft: AccountNarrativeDraft;
  tensions: AccountTensionDraft[];
  themes: AccountThemeDraft[];
  signalLinks: AccountSignalLinkDraft[];
  fingerprint: string;
  extractionModelRunId: string;
  metadata?: Record<string, unknown>;
}): Promise<AccountIntelligenceCandidateRow> {
  const { data, error } = await admin()
    .from("account_intelligence_candidates")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      proposed_headline: input.draft.headline,
      proposed_executive_summary: input.draft.executiveSummary,
      proposed_strategic_direction: input.draft.strategicDirection,
      proposed_pressure_summary: input.draft.pressureSummary,
      proposed_investment_summary: input.draft.investmentSummary,
      proposed_operating_context_summary: input.draft.operatingContextSummary,
      proposed_risk_summary: input.draft.riskSummary,
      proposed_change_summary: input.draft.changeSummary,
      proposed_sections: input.draft.sections,
      proposed_period_start: input.draft.periodStart,
      proposed_period_end: input.draft.periodEnd,
      proposed_tensions: input.tensions.map((tension) => ({
        signal_a_id: tension.signalAId,
        signal_b_id: tension.signalBId,
        tension_type: tension.tensionType,
        explanation: tension.explanation,
      })),
      proposed_themes: input.themes.map((theme) => ({
        tag_id: theme.tagId,
        category: theme.category,
        canonical_name: theme.canonicalName,
        signal_count: theme.signalCount,
        weighted_importance: theme.weightedImportance,
        last_seen_at: theme.lastSeenAt,
        supporting_signal_ids: theme.supportingSignalIds,
      })),
      proposed_signal_links: input.signalLinks.map((link) => ({
        signal_id: link.signalId,
        relationship_type: link.relationshipType,
        weight: link.weight,
      })),
      candidate_fingerprint: input.fingerprint,
      extraction_model_run_id: input.extractionModelRunId,
      status: "pending_validation",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<AccountIntelligenceCandidateRow>(data);
}

export async function findAccountIntelligenceCandidateByFingerprint(
  workspaceId: string,
  companyId: string,
  fingerprint: string,
): Promise<AccountIntelligenceCandidateRow | null> {
  const { data, error } = await admin()
    .from("account_intelligence_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<AccountIntelligenceCandidateRow>(data) : null;
}

export async function insertAccountIntelligenceValidations(input: {
  workspaceId: string;
  candidateId: string;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("account_intelligence_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      account_intelligence_candidate_id: input.candidateId,
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

export async function listAccountIntelligenceValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("account_intelligence_candidate_validations")
    .select("*")
    .eq("account_intelligence_candidate_id", candidateId)
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

export async function updateAccountIntelligenceCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("account_intelligence_candidates")
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

export async function listAccountIntelligenceCandidatesForCompany(companyId: string) {
  const { data, error } = await admin()
    .from("account_intelligence_candidates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<AccountIntelligenceCandidateRow>(data);
}

export async function listActiveAccountIntelligenceFingerprints(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("account_intelligence")
    .select("origin_candidate_id")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  const candidateIds = (data ?? [])
    .map((row) => (row as { origin_candidate_id: string | null }).origin_candidate_id)
    .filter((value): value is string => Boolean(value));
  if (candidateIds.length === 0) return [];
  const { data: fingerprints, error: fingerprintError } = await admin()
    .from("account_intelligence_candidates")
    .select("candidate_fingerprint")
    .in("id", candidateIds);
  if (fingerprintError) throw fingerprintError;
  return (fingerprints ?? [])
    .map((row) => (row as { candidate_fingerprint: string }).candidate_fingerprint)
    .filter(Boolean);
}

export async function getActiveAccountIntelligence(workspaceId: string, companyId: string): Promise<AccountIntelligenceRow | null> {
  const { data, error } = await admin()
    .from("account_intelligence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<AccountIntelligenceRow>(data) : null;
}

export async function listAccountIntelligenceHistory(workspaceId: string, companyId: string): Promise<AccountIntelligenceRow[]> {
  const { data, error } = await admin()
    .from("account_intelligence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .in("status", ["active", "archived"])
    .order("version", { ascending: false });
  if (error) throw error;
  return asRowList<AccountIntelligenceRow>(data);
}

export async function listAccountIntelligenceForWorkspace(workspaceId: string): Promise<AccountIntelligenceRow[]> {
  const { data, error } = await admin()
    .from("account_intelligence")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return asRowList<AccountIntelligenceRow>(data);
}

export async function listAccountIntelligenceSignals(accountIntelligenceId: string) {
  const { data, error } = await admin()
    .from("account_intelligence_signals")
    .select("*")
    .eq("account_intelligence_id", accountIntelligenceId);
  if (error) throw error;
  return asRowList<{ signal_id: string; relationship_type: string; weight: number }>(data);
}

export async function listAccountTensions(accountIntelligenceId: string) {
  const { data, error } = await admin()
    .from("account_tensions")
    .select("*")
    .eq("account_intelligence_id", accountIntelligenceId);
  if (error) throw error;
  return asRowList<{
    id: string;
    signal_a_id: string;
    signal_b_id: string;
    tension_type: string;
    explanation: string;
    status: string;
  }>(data);
}

export async function listAccountIntelligenceThemes(accountIntelligenceId: string) {
  const { data, error } = await admin()
    .from("account_intelligence_themes")
    .select("tag_id, signal_count, weighted_importance, last_seen_at, knowledge_tags(category, canonical_name)")
    .eq("account_intelligence_id", accountIntelligenceId);
  if (error) throw error;
  return (data ?? []) as {
    tag_id: string;
    signal_count: number;
    weighted_importance: string;
    last_seen_at: string | null;
    knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
  }[];
}

export async function insertEfesoFitCandidate(input: {
  workspaceId: string;
  companyId: string;
  knowledgeObjectId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string | null;
  components: FitComponentDraft[];
  rationale: string;
  fitLevel: string;
  fitScore: number;
  fingerprint: string;
  modelRunId: string | null;
  matches: SignalKnowledgeMatchDraft[];
}): Promise<EfesoFitCandidateRow> {
  const { data, error } = await admin()
    .from("efeso_fit_candidates")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      knowledge_object_id: input.knowledgeObjectId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      proposed_components: input.components.map((component) => ({
        component_type: component.componentType,
        component_value: component.componentValue,
        contribution: component.contribution,
        explanation: component.explanation,
        source_type: component.sourceType,
        source_id: component.sourceId,
      })),
      proposed_rationale: input.rationale,
      proposed_fit_level: input.fitLevel,
      proposed_fit_score: input.fitScore,
      candidate_fingerprint: input.fingerprint,
      model_run_id: input.modelRunId,
      status: "pending_validation",
      metadata: { signal_matches: input.matches.map((match) => ({
        signal_id: match.signalId,
        match_type: match.matchType,
        match_strength: match.matchStrength,
        explanation: match.explanation,
      })) },
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<EfesoFitCandidateRow>(data);
}

export async function findEfesoFitCandidateByFingerprint(
  workspaceId: string,
  companyId: string,
  knowledgeObjectId: string,
  fingerprint: string,
): Promise<EfesoFitCandidateRow | null> {
  const { data, error } = await admin()
    .from("efeso_fit_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("knowledge_object_id", knowledgeObjectId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<EfesoFitCandidateRow>(data) : null;
}

export async function insertEfesoFitValidations(input: {
  workspaceId: string;
  candidateId: string;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("efeso_fit_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      efeso_fit_candidate_id: input.candidateId,
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

export async function listEfesoFitValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("efeso_fit_candidate_validations")
    .select("*")
    .eq("efeso_fit_candidate_id", candidateId)
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

export async function updateEfesoFitCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("efeso_fit_candidates")
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

export async function listEfesoFitCandidatesForCompany(companyId: string) {
  const { data, error } = await admin()
    .from("efeso_fit_candidates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<EfesoFitCandidateRow>(data);
}

export async function listActiveEfesoFitsForCompany(workspaceId: string, companyId: string): Promise<EfesoFitRow[]> {
  const { data, error } = await admin()
    .from("efeso_fits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("fit_level", { ascending: true });
  if (error) throw error;
  return asRowList<EfesoFitRow>(data);
}

export async function listActiveEfesoFitsForWorkspace(workspaceId: string): Promise<EfesoFitRow[]> {
  const { data, error } = await admin()
    .from("efeso_fits")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw error;
  return asRowList<EfesoFitRow>(data);
}

export async function listEfesoFitComponents(fitId: string) {
  const { data, error } = await admin().from("efeso_fit_components").select("*").eq("efeso_fit_id", fitId);
  if (error) throw error;
  return asRowList<{
    component_type: string;
    component_value: string;
    contribution: number;
    explanation: string;
    source_type: string;
    source_id: string | null;
  }>(data);
}

export async function listSignalKnowledgeMatchesForCompany(workspaceId: string, knowledgeObjectId: string) {
  const { data, error } = await admin()
    .from("signal_knowledge_matches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("knowledge_object_id", knowledgeObjectId)
    .in("status", ["active", "validated"]);
  if (error) throw error;
  return asRowList<{
    signal_id: string;
    match_type: string;
    match_strength: string;
    explanation: string;
    status: string;
  }>(data);
}

export async function listSignalKnowledgeMatchesForSignal(signalId: string) {
  const { data, error } = await admin()
    .from("signal_knowledge_matches")
    .select("*")
    .eq("signal_id", signalId)
    .in("status", ["active", "validated"]);
  if (error) throw error;
  return asRowList<{
    knowledge_object_id: string;
    match_type: string;
    match_strength: string;
    explanation: string;
  }>(data);
}
