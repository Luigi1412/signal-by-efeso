import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import type { OpportunityDraft } from "./types";

function admin() {
  return createPipelineAdminClient();
}

export interface OpportunityCandidateRow {
  id: string;
  workspace_id: string;
  company_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string | null;
  proposed_title: string;
  proposed_summary: string;
  proposed_opportunity_type: string;
  proposed_maturity: string;
  proposed_relevance_level: string;
  proposed_urgency_level: string;
  proposed_confidence_tier: string;
  proposed_assertion_mode: string;
  proposed_rationale: string;
  proposed_geography: string | null;
  proposed_account_intelligence_id: string | null;
  proposed_primary_efeso_fit_id: string | null;
  proposed_parent_opportunity_id: string | null;
  proposed_signal_links: unknown;
  proposed_fit_links: unknown;
  proposed_knowledge_links: unknown;
  proposed_rationale_blocks: unknown;
  candidate_fingerprint: string;
  generation_model_run_id: string | null;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_opportunity_id: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OpportunityRow {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  summary: string;
  status: string;
  opportunity_type: string;
  maturity: string;
  relevance_level: string;
  urgency_level: string;
  confidence_tier: string;
  assertion_mode: string;
  geography: string | null;
  account_intelligence_id: string | null;
  primary_efeso_fit_id: string | null;
  origin_opportunity_candidate_id: string | null;
  origin_model_run_id: string | null;
  parent_opportunity_id: string | null;
  supersedes_opportunity_id: string | null;
  dismissal_reason: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function payloadFromDraft(draft: OpportunityDraft) {
  return {
    proposed_title: draft.title,
    proposed_summary: draft.summary,
    proposed_opportunity_type: draft.opportunityType,
    proposed_maturity: draft.maturity,
    proposed_relevance_level: draft.relevanceLevel,
    proposed_urgency_level: draft.urgencyLevel,
    proposed_confidence_tier: draft.confidenceTier,
    proposed_assertion_mode: draft.assertionMode,
    proposed_rationale: draft.rationale,
    proposed_geography: draft.geography,
    proposed_account_intelligence_id: draft.accountIntelligenceId,
    proposed_primary_efeso_fit_id: draft.primaryEfesoFitId,
    proposed_parent_opportunity_id: draft.parentOpportunityId,
    proposed_signal_links: draft.signalLinks.map((link) => ({
      signal_id: link.signalId,
      relationship_type: link.relationshipType,
    })),
    proposed_fit_links: draft.fitLinks.map((link) => ({
      efeso_fit_id: link.efesoFitId,
      relationship_type: link.relationshipType,
    })),
    proposed_knowledge_links: draft.knowledgeLinks.map((link) => ({
      knowledge_object_id: link.knowledgeObjectId,
      relationship_type: link.relationshipType,
    })),
    proposed_rationale_blocks: draft.rationaleBlocks.map((block) => ({
      rationale_type: block.rationaleType,
      statement: block.statement,
      source_type: block.sourceType,
      source_id: block.sourceId,
    })),
  };
}

export async function insertOpportunityCandidate(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string | null;
  draft: OpportunityDraft;
  fingerprint: string;
  generationModelRunId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<OpportunityCandidateRow> {
  const { data, error } = await admin()
    .from("opportunity_candidates")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      ...payloadFromDraft(input.draft),
      candidate_fingerprint: input.fingerprint,
      generation_model_run_id: input.generationModelRunId,
      status: "pending_validation",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<OpportunityCandidateRow>(data);
}

export async function findOpportunityCandidateByFingerprint(
  workspaceId: string,
  companyId: string,
  fingerprint: string,
): Promise<OpportunityCandidateRow | null> {
  const { data, error } = await admin()
    .from("opportunity_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<OpportunityCandidateRow>(data) : null;
}

export async function insertOpportunityValidations(input: {
  workspaceId: string;
  candidateId: string;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("opportunity_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      opportunity_candidate_id: input.candidateId,
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

export async function listOpportunityValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("opportunity_candidate_validations")
    .select("*")
    .eq("opportunity_candidate_id", candidateId)
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

export async function updateOpportunityCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("opportunity_candidates")
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

export async function listOpportunityCandidatesForCompany(companyId: string) {
  const { data, error } = await admin()
    .from("opportunity_candidates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<OpportunityCandidateRow>(data);
}

export async function listActiveOpportunityFingerprints(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("opportunities")
    .select("origin_opportunity_candidate_id, metadata")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  const rows = asRowList<{ origin_opportunity_candidate_id: string | null; metadata: Record<string, unknown> }>(data);
  const fingerprints = rows
    .map((row) => (typeof row.metadata?.fingerprint === "string" ? row.metadata.fingerprint : null))
    .filter((value): value is string => Boolean(value));
  const candidateIds = rows
    .map((row) => row.origin_opportunity_candidate_id)
    .filter((value): value is string => Boolean(value));
  if (candidateIds.length === 0) return fingerprints;
  const { data: candidates, error: candidateError } = await admin()
    .from("opportunity_candidates")
    .select("candidate_fingerprint")
    .in("id", candidateIds);
  if (candidateError) throw candidateError;
  return [
    ...fingerprints,
    ...asRowList<{ candidate_fingerprint: string }>(candidates).map((row) => row.candidate_fingerprint),
  ];
}

export async function listActiveOpportunityHypotheses(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("opportunities")
    .select("title, summary")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return asRowList<{ title: string; summary: string }>(data).map((row) => `${row.title} ${row.summary}`);
}

export async function listActiveOpportunities(workspaceId: string): Promise<OpportunityRow[]> {
  const { data, error } = await admin()
    .from("opportunities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<OpportunityRow>(data);
}

export async function listActiveOpportunitiesForCompany(workspaceId: string, companyId: string): Promise<OpportunityRow[]> {
  const { data, error } = await admin()
    .from("opportunities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<OpportunityRow>(data);
}

export async function getOpportunity(workspaceId: string, id: string): Promise<OpportunityRow | null> {
  const { data, error } = await admin()
    .from("opportunities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<OpportunityRow>(data) : null;
}

export async function listOpportunitySignals(opportunityId: string) {
  const { data, error } = await admin()
    .from("opportunity_signals")
    .select("*")
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
  return asRowList<{ signal_id: string; relationship_type: string }>(data);
}

export async function listOpportunityFits(opportunityId: string) {
  const { data, error } = await admin()
    .from("opportunity_efeso_fits")
    .select("*")
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
  return asRowList<{ efeso_fit_id: string; relationship_type: string }>(data);
}

export async function listOpportunityKnowledge(opportunityId: string) {
  const { data, error } = await admin()
    .from("opportunity_knowledge_objects")
    .select("*")
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
  return asRowList<{ knowledge_object_id: string; relationship_type: string }>(data);
}

export async function listOpportunityRationales(opportunityId: string) {
  const { data, error } = await admin()
    .from("opportunity_rationales")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<{
    rationale_type: string;
    statement: string;
    source_type: string | null;
    source_id: string | null;
  }>(data);
}
