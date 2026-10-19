import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { asRow, asRowList } from "@/server/extraction/pipeline-rows";
import type { ValidationRecord } from "@/server/extraction/validation-types";

function admin() {
  return createPipelineAdminClient();
}

export interface KnowledgeCandidateRow {
  id: string;
  workspace_id: string;
  analysis_id: string;
  research_run_id: string;
  source_snapshot_id: string;
  extraction_model_run_id: string;
  candidate_type: string;
  canonical_name: string;
  normalized_name: string;
  proposed_description: string;
  candidate_fingerprint: string;
  attributed_to_efeso: boolean;
  proposed_tags: unknown;
  proposed_aliases: unknown;
  proposed_relations: unknown;
  metadata: Record<string, unknown>;
  status: string;
  rejection_reason_code: string | null;
  rejection_reason_text: string | null;
  promoted_knowledge_object_id: string | null;
  created_at: string;
}

export interface KnowledgeObjectRow {
  id: string;
  workspace_id: string;
  object_type: string;
  canonical_name: string;
  normalized_name: string;
  short_description: string;
  status: string;
  source_snapshot_id: string;
  primary_content_block_id: string | null;
  origin_model_run_id: string | null;
  origin_candidate_id: string | null;
  supersedes_object_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeObjectAliasRow {
  knowledge_object_id: string;
  alias: string;
  normalized_alias: string;
}

export interface KnowledgeTagRow {
  id: string;
  category: string;
  canonical_name: string;
  normalized_name: string;
}

export async function insertKnowledgeCandidate(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  extractionModelRunId: string;
  candidateType: string;
  canonicalName: string;
  normalizedName: string;
  proposedDescription: string;
  fingerprint: string;
  attributedToEfeso: boolean;
  proposedTags: unknown;
  proposedAliases: unknown;
  proposedRelations: unknown;
  metadata: Record<string, unknown>;
}): Promise<KnowledgeCandidateRow> {
  const { data, error } = await admin()
    .from("knowledge_candidates")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      research_run_id: input.researchRunId,
      source_snapshot_id: input.sourceSnapshotId,
      extraction_model_run_id: input.extractionModelRunId,
      candidate_type: input.candidateType,
      canonical_name: input.canonicalName,
      normalized_name: input.normalizedName,
      proposed_description: input.proposedDescription,
      candidate_fingerprint: input.fingerprint,
      attributed_to_efeso: input.attributedToEfeso,
      proposed_tags: input.proposedTags,
      proposed_aliases: input.proposedAliases,
      proposed_relations: input.proposedRelations,
      metadata: input.metadata,
      status: "pending_validation",
    })
    .select("*")
    .single();
  if (error) throw error;
  return asRow<KnowledgeCandidateRow>(data);
}

export async function findKnowledgeCandidateByFingerprint(
  workspaceId: string,
  snapshotId: string,
  fingerprint: string,
): Promise<KnowledgeCandidateRow | null> {
  const { data, error } = await admin()
    .from("knowledge_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_snapshot_id", snapshotId)
    .eq("candidate_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<KnowledgeCandidateRow>(data) : null;
}

export async function insertKnowledgeCandidateEvidence(input: {
  workspaceId: string;
  knowledgeCandidateId: string;
  sourceContentBlockId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  citationOrder: number;
  exactQuote: string;
  charStart: number | null;
  charEnd: number | null;
}): Promise<void> {
  const { error } = await admin().from("knowledge_candidate_evidence").insert({
    workspace_id: input.workspaceId,
    knowledge_candidate_id: input.knowledgeCandidateId,
    source_content_block_id: input.sourceContentBlockId,
    source_snapshot_id: input.sourceSnapshotId,
    origin_model_run_id: input.originModelRunId,
    citation_order: input.citationOrder,
    exact_quote: input.exactQuote,
    char_start: input.charStart,
    char_end: input.charEnd,
  });
  if (error && error.code !== "23505") throw error;
}

export async function insertKnowledgeValidations(input: {
  workspaceId: string;
  knowledgeCandidateId: string;
  validationRound: number;
  records: ValidationRecord[];
}): Promise<void> {
  if (input.records.length === 0) return;
  const { error } = await admin().from("knowledge_candidate_validations").insert(
    input.records.map((record) => ({
      workspace_id: input.workspaceId,
      knowledge_candidate_id: input.knowledgeCandidateId,
      validation_round: input.validationRound,
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

export async function listKnowledgeValidations(candidateId: string) {
  const { data, error } = await admin()
    .from("knowledge_candidate_validations")
    .select("*")
    .eq("knowledge_candidate_id", candidateId)
    .order("validation_round", { ascending: true });
  if (error) throw error;
  return asRowList<{
    validator_code: string;
    result: string;
    severity: string;
    message: string | null;
    details: Record<string, unknown>;
    validation_round: number;
  }>(data);
}

export async function listKnowledgeCandidateEvidence(candidateId: string) {
  const { data, error } = await admin()
    .from("knowledge_candidate_evidence")
    .select("*")
    .eq("knowledge_candidate_id", candidateId)
    .order("citation_order", { ascending: true });
  if (error) throw error;
  return asRowList<{
    exact_quote: string;
    source_content_block_id: string;
    char_start: number | null;
    char_end: number | null;
  }>(data);
}

export async function updateKnowledgeCandidateOutcome(input: {
  id: string;
  fromStatus: string;
  status: "validated" | "needs_review" | "rejected";
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}): Promise<void> {
  const { error } = await admin()
    .from("knowledge_candidates")
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

export async function listKnowledgeCandidatesForSnapshot(snapshotId: string): Promise<KnowledgeCandidateRow[]> {
  const { data, error } = await admin()
    .from("knowledge_candidates")
    .select("*")
    .eq("source_snapshot_id", snapshotId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return asRowList<KnowledgeCandidateRow>(data);
}

export async function listActiveKnowledgeObjects(workspaceId: string): Promise<KnowledgeObjectRow[]> {
  const { data, error } = await admin()
    .from("efeso_knowledge_objects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("canonical_name", { ascending: true });
  if (error) throw error;
  return asRowList<KnowledgeObjectRow>(data);
}

export async function listKnowledgeObjectsForWorkspace(workspaceId: string): Promise<KnowledgeObjectRow[]> {
  const { data, error } = await admin()
    .from("efeso_knowledge_objects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("canonical_name", { ascending: true });
  if (error) throw error;
  return asRowList<KnowledgeObjectRow>(data);
}

export async function getKnowledgeObject(workspaceId: string, id: string): Promise<KnowledgeObjectRow | null> {
  const { data, error } = await admin()
    .from("efeso_knowledge_objects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? asRow<KnowledgeObjectRow>(data) : null;
}

export async function listAliasesForObject(objectId: string): Promise<KnowledgeObjectAliasRow[]> {
  const { data, error } = await admin()
    .from("knowledge_object_aliases")
    .select("knowledge_object_id, alias, normalized_alias")
    .eq("knowledge_object_id", objectId);
  if (error) throw error;
  return asRowList<KnowledgeObjectAliasRow>(data);
}

export async function listAliasesForWorkspace(workspaceId: string): Promise<KnowledgeObjectAliasRow[]> {
  const { data, error } = await admin()
    .from("knowledge_object_aliases")
    .select("knowledge_object_id, alias, normalized_alias")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return asRowList<KnowledgeObjectAliasRow>(data);
}

export async function listTags(): Promise<KnowledgeTagRow[]> {
  const { data, error } = await admin().from("knowledge_tags").select("*").order("canonical_name");
  if (error) throw error;
  return asRowList<KnowledgeTagRow>(data);
}

export async function snapshotExists(workspaceId: string, snapshotId: string): Promise<boolean> {
  const { data, error } = await admin()
    .from("source_snapshots")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getSnapshotRow(workspaceId: string, snapshotId: string) {
  const { data, error } = await admin()
    .from("source_snapshots")
    .select("id, workspace_id, source_id, title, captured_by_research_run_id")
    .eq("workspace_id", workspaceId)
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? asRow<{
        id: string;
        workspace_id: string;
        source_id: string;
        title: string | null;
        captured_by_research_run_id: string | null;
      }>(data)
    : null;
}

export async function listExistingObjectNames(workspaceId: string): Promise<string[]> {
  const objects = await listKnowledgeObjectsForWorkspace(workspaceId);
  return objects.map((row) => row.canonical_name);
}

export async function listClaimsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await admin().from("claims").select("id, statement").in("id", ids);
  if (error) throw error;
  return asRowList<{ id: string; statement: string }>(data);
}

export async function listObjectTags(objectId: string) {
  const { data, error } = await admin()
    .from("knowledge_object_tags")
    .select("tag_id, knowledge_tags(category, canonical_name)")
    .eq("knowledge_object_id", objectId);
  if (error) throw error;
  return (data ?? []) as {
    tag_id: string;
    knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
  }[];
}

export async function listObjectRelations(objectId: string) {
  const { data, error } = await admin()
    .from("knowledge_object_relations")
    .select("*")
    .or(`source_object_id.eq.${objectId},target_object_id.eq.${objectId}`);
  if (error) throw error;
  return asRowList<{
    id: string;
    source_object_id: string;
    target_object_id: string;
    relation_type: string;
    status: string;
  }>(data);
}

export async function listObjectClaims(objectId: string) {
  const { data, error } = await admin()
    .from("knowledge_object_claims")
    .select("claim_id, relationship_type")
    .eq("knowledge_object_id", objectId);
  if (error) throw error;
  return asRowList<{ claim_id: string; relationship_type: string }>(data);
}

export async function insertKnowledgeObjectClaim(input: {
  workspaceId: string;
  knowledgeObjectId: string;
  claimId: string;
  relationshipType: string;
}): Promise<void> {
  const { error } = await admin().from("knowledge_object_claims").insert({
    workspace_id: input.workspaceId,
    knowledge_object_id: input.knowledgeObjectId,
    claim_id: input.claimId,
    relationship_type: input.relationshipType,
  });
  if (error && error.code !== "23505") throw error;
}

export async function listSnapshotsWithBlocks(workspaceId: string) {
  const { data, error } = await admin()
    .from("source_snapshots")
    .select("id, title, captured_at, captured_by_research_run_id, source_id")
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return asRowList<{
    id: string;
    title: string | null;
    captured_at: string;
    captured_by_research_run_id: string | null;
    source_id: string;
  }>(data);
}
