import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import type { ActionDraft } from "./types";

function admin() {
  return createPipelineAdminClient();
}

export interface RecommendedActionCandidateRow {
  id: string;
  workspace_id: string;
  company_id: string;
  analysis_id: string;
  research_run_id: string;
  opportunity_id: string | null;
  proposed_action_type: string;
  proposed_title: string;
  proposed_rationale: string;
  proposed_priority: string;
  proposed_confidence_tier: string;
  proposed_opportunity_links: unknown;
  proposed_relationship_links: unknown;
  proposed_knowledge_links: unknown;
  proposed_rationale_blocks: unknown;
  candidate_fingerprint: string;
  generation_model_run_id: string | null;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_action_id: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecommendedActionRow {
  id: string;
  workspace_id: string;
  company_id: string;
  opportunity_id: string | null;
  action_type: string;
  title: string;
  rationale: string;
  status: string;
  priority: string;
  confidence_tier: string;
  relationship_context_id: string | null;
  origin_action_candidate_id: string | null;
  origin_model_run_id: string | null;
  supersedes_action_id: string | null;
  dismissal_reason: string | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function payloadFromDraft(draft: ActionDraft) {
  return {
    opportunity_id: draft.opportunityId,
    proposed_action_type: draft.actionType,
    proposed_title: draft.title,
    proposed_rationale: draft.rationale,
    proposed_priority: draft.priority,
    proposed_confidence_tier: draft.confidenceTier,
    proposed_opportunity_links: draft.opportunityLinks.map((link) => ({
      opportunity_id: link.opportunityId,
      relationship_type: link.relationshipType,
    })),
    proposed_relationship_links: draft.relationshipLinks.map((link) => ({
      account_relationship_id: link.accountRelationshipId,
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

export async function insertActionCandidate(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  draft: ActionDraft;
  fingerprint: string;
  generationModelRunId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<RecommendedActionCandidateRow> {
  const { data, error } = await admin()
    .from("recommended_action_candidates")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      ...payloadFromDraft(input.draft),
      candidate_fingerprint: input.fingerprint,
      generation_model_run_id: input.generationModelRunId,
      status: "pending_validation",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<RecommendedActionCandidateRow>(data);
}

export async function findActionCandidateByFingerprint(
  workspaceId: string,
  companyId: string,
  fingerprint: string,
): Promise<RecommendedActionCandidateRow | null> {
  const { data, error } = await admin()
    .from("recommended_action_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<RecommendedActionCandidateRow>(data) : null;
}

export async function insertActionValidations(input: {
  workspaceId: string;
  candidateId: string;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("recommended_action_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      recommended_action_candidate_id: input.candidateId,
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

export async function listActionValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("recommended_action_candidate_validations")
    .select("*")
    .eq("recommended_action_candidate_id", candidateId)
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

export async function updateActionCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("recommended_action_candidates")
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

export async function listActionCandidatesForCompany(companyId: string) {
  const { data, error } = await admin()
    .from("recommended_action_candidates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<RecommendedActionCandidateRow>(data);
}

export async function listActiveActionFingerprints(workspaceId: string, companyId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("recommended_actions")
    .select("metadata")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const metadata = (row as { metadata?: { fingerprint?: string } }).metadata;
      return metadata?.fingerprint ?? "";
    })
    .filter(Boolean);
}

export async function listActiveActions(workspaceId: string): Promise<RecommendedActionRow[]> {
  const { data, error } = await admin()
    .from("recommended_actions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "completed", "dismissed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<RecommendedActionRow>(data);
}

export async function listActiveActionsForCompany(workspaceId: string, companyId: string): Promise<RecommendedActionRow[]> {
  const { data, error } = await admin()
    .from("recommended_actions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return asRowList<RecommendedActionRow>(data);
}

export async function getRecommendedAction(workspaceId: string, id: string): Promise<RecommendedActionRow | null> {
  const { data, error } = await admin()
    .from("recommended_actions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<RecommendedActionRow>(data) : null;
}

export async function listActionOpportunities(actionId: string) {
  const { data, error } = await admin()
    .from("recommended_action_opportunities")
    .select("*")
    .eq("action_id", actionId);
  if (error) throw error;
  return asRowList<{ opportunity_id: string; relationship_type: string }>(data);
}

export async function listActionRelationships(actionId: string) {
  const { data, error } = await admin()
    .from("recommended_action_relationships")
    .select("*")
    .eq("action_id", actionId);
  if (error) throw error;
  return asRowList<{ account_relationship_id: string; relationship_type: string }>(data);
}

export async function listActionKnowledge(actionId: string) {
  const { data, error } = await admin()
    .from("recommended_action_knowledge_objects")
    .select("*")
    .eq("action_id", actionId);
  if (error) throw error;
  return asRowList<{ knowledge_object_id: string; relationship_type: string }>(data);
}

export async function listActionRationales(actionId: string) {
  const { data, error } = await admin()
    .from("recommended_action_rationales")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at");
  if (error) throw error;
  return asRowList<{
    rationale_type: string;
    statement: string;
    source_type: string | null;
    source_id: string | null;
  }>(data);
}
