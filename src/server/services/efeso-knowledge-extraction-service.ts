import "server-only";
import {
  KNOWLEDGE_EXTRACTION_PROMPT_VERSION,
  KNOWLEDGE_EXTRACTION_SCHEMA_VERSION,
  KNOWLEDGE_VALIDATION_PROMPT_VERSION,
  KNOWLEDGE_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getExtractionModel, getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { KNOWLEDGE_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/knowledge-extraction-v1";
import { KNOWLEDGE_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/knowledge-semantic-validation-v1";
import { knowledgeExtractionOutputSchema } from "@/server/ai/schemas/knowledge-extraction-schema";
import { knowledgeValidationOutputSchema } from "@/server/ai/schemas/knowledge-validation-schema";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import { executeStructuredModelRun } from "@/server/extraction/model-run-service";
import { canTransition } from "@/server/extraction/promotion-policy";
import {
  getBlockById,
  getClaimByOriginCandidate,
  listBlocksForSnapshot,
  listCandidateEvidence,
  listCandidatesForSnapshot,
} from "@/server/extraction/pipeline-persistence";
import type { SourceContentBlockRow } from "@/server/extraction/pipeline-rows";
import { locateExactQuote } from "@/server/extraction/quote";
import { buildExtractionWindows } from "@/server/parsers/windowing";
import type { ContentBlockType } from "@/server/parsers/types";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAdminUserId } from "@/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import {
  hasBlockingKnowledgeFailure,
  runKnowledgeDeterministicValidators,
} from "@/server/knowledge/deterministic-validators";
import { extractedKnowledgeToDraft, serializeKnowledgeExtractionWindow, serializeKnowledgeValidationInput } from "@/server/knowledge/extraction-input";
import { computeKnowledgeCandidateFingerprint } from "@/server/knowledge/fingerprint";
import {
  findKnowledgeCandidateByFingerprint,
  getSnapshotRow,
  insertKnowledgeCandidate,
  insertKnowledgeCandidateEvidence,
  insertKnowledgeObjectClaim,
  insertKnowledgeValidations,
  listExistingObjectNames,
  listKnowledgeCandidateEvidence,
  listKnowledgeCandidatesForSnapshot,
  listKnowledgeValidations,
  listSnapshotsWithBlocks,
  snapshotExists,
  updateKnowledgeCandidateOutcome,
  type KnowledgeCandidateRow,
} from "@/server/knowledge/persistence";
import { decideKnowledgeCandidateStatus } from "@/server/knowledge/promotion-policy";
import { knowledgeSemanticOutputToRecords } from "@/server/knowledge/semantic-validators";
import { coreKnowledgeName, mapSuggestedTag } from "@/server/knowledge/taxonomy";
import type { KnowledgeCandidateDraft, KnowledgeCitedBlock } from "@/server/knowledge/types";
import type { KnowledgeCandidateView, KnowledgeExtractionSummary } from "@/types/efeso-knowledge";
import type { ValidationRecord } from "@/server/extraction/validation-types";

export type PromoteKnowledgeFn = (candidateId: string) => Promise<string>;

export async function promoteKnowledgeCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_knowledge_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_knowledge_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Knowledge promotion RPC returned no object id.");
  return String(data);
}

export async function runKnowledgeExtractionForSnapshot(input: {
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  provider?: LanguageModelProvider;
  promote?: PromoteKnowledgeFn;
}): Promise<KnowledgeExtractionSummary> {
  if (!isControlledExtractionEnabled()) throw new ControlledExtractionDisabledError();
  await requireAdminUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const analysis = await analysisRepository.getAnalysisById(workspace.id, input.analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");
  const run = await researchRunRepository.getResearchRun(workspace.id, input.researchRunId);
  if (!run || run.analysis_id !== analysis.id) throw new Error("RESEARCH_RUN_NOT_FOUND");

  const snapshot = await getSnapshotRow(workspace.id, input.sourceSnapshotId);
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const blocks = await listBlocksForSnapshot(input.sourceSnapshotId);
  if (blocks.length === 0) throw new Error("SOURCE_CONTENT_BLOCKS_NOT_FOUND");

  return executeKnowledgeExtraction({
    workspaceId: workspace.id,
    analysisId: analysis.id,
    researchRunId: run.id,
    sourceSnapshotId: snapshot.id,
    sourceId: snapshot.source_id,
    blocks,
    provider: input.provider ?? getLanguageModelProvider(),
    promote: input.promote ?? promoteKnowledgeCandidateViaSessionRpc,
  });
}

export async function executeKnowledgeExtraction(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  sourceId: string;
  blocks: SourceContentBlockRow[];
  provider: LanguageModelProvider;
  promote: PromoteKnowledgeFn;
}): Promise<KnowledgeExtractionSummary> {
  const windows = buildExtractionWindows(
    input.blocks.map((block) => ({
      blockIndex: block.block_index,
      blockType: block.block_type as ContentBlockType,
      textContent: block.text_content,
      pageNumber: block.page_number,
      sectionTitle: block.section_title,
      locator: (block.locator ?? {}) as Record<string, unknown>,
      parseConfidence: block.parse_confidence,
      metadata: (block.metadata ?? {}) as Record<string, unknown>,
    })),
  );

  const processedIds = new Set<string>();
  const existingNames = await listExistingObjectNames(input.workspaceId);

  for (const window of windows) {
    const windowRows = window.blocks
      .map((parsed) => input.blocks.find((row) => row.block_index === parsed.blockIndex))
      .filter((row): row is SourceContentBlockRow => Boolean(row));
    if (windowRows.length === 0) continue;

    const { run, parsed: extraction } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: {
        source_snapshot_id: input.sourceSnapshotId,
        window_index: window.windowIndex,
        block_ids: windowRows.map((row) => row.id),
      },
      request: {
        taskType: "knowledge_extraction",
        model: getExtractionModel(),
        reasoningEffort: "low",
        promptVersion: KNOWLEDGE_EXTRACTION_PROMPT_VERSION,
        schemaVersion: KNOWLEDGE_EXTRACTION_SCHEMA_VERSION,
        schema: knowledgeExtractionOutputSchema,
        schemaName: "knowledge_extraction",
        instructions: KNOWLEDGE_EXTRACTION_INSTRUCTIONS,
        input: serializeKnowledgeExtractionWindow(windowRows),
      },
    });

    for (const object of extraction.objects) {
      const draft = extractedKnowledgeToDraft(object);
      const candidate = await persistKnowledgeCandidate({
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        researchRunId: input.researchRunId,
        sourceSnapshotId: input.sourceSnapshotId,
        originModelRunId: run.id,
        draft,
      });
      await attachKnowledgeCitations({
        workspaceId: input.workspaceId,
        candidateId: candidate.id,
        sourceSnapshotId: input.sourceSnapshotId,
        originModelRunId: run.id,
        draft,
        windowRows,
      });
      if (processedIds.has(candidate.id)) continue;
      processedIds.add(candidate.id);
      await validateAndMaybePromoteKnowledge({
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        researchRunId: input.researchRunId,
        sourceSnapshotId: input.sourceSnapshotId,
        candidate,
        draft,
        windowRows,
        existingNames,
        provider: input.provider,
        promote: input.promote,
      });
    }
  }

  return summarizeKnowledgeSnapshot({
    snapshotId: input.sourceSnapshotId,
    sourceId: input.sourceId,
    blockCount: input.blocks.length,
    windowCount: windows.length,
  });
}

async function persistKnowledgeCandidate(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  draft: KnowledgeCandidateDraft;
}): Promise<KnowledgeCandidateRow> {
  const fingerprint = computeKnowledgeCandidateFingerprint({
    workspaceId: input.workspaceId,
    objectType: input.draft.objectType,
    canonicalName: input.draft.canonicalName,
  });
  const existing = await findKnowledgeCandidateByFingerprint(input.workspaceId, input.sourceSnapshotId, fingerprint);
  if (existing) return existing;

  const mappedTags: { category: string; canonical_name: string }[] = [];
  for (const tag of input.draft.tags) {
    const mapped = mapSuggestedTag(tag.category, tag.name);
    if (mapped.ok) mappedTags.push({ category: mapped.category, canonical_name: mapped.canonicalName });
  }

  return insertKnowledgeCandidate({
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    sourceSnapshotId: input.sourceSnapshotId,
    extractionModelRunId: input.originModelRunId,
    candidateType: input.draft.objectType,
    canonicalName: input.draft.canonicalName,
    normalizedName: coreKnowledgeName(input.draft.canonicalName),
    proposedDescription: input.draft.description,
    fingerprint,
    attributedToEfeso: input.draft.attributedToEfeso,
    proposedTags: mappedTags,
    proposedAliases: input.draft.aliases,
    proposedRelations: input.draft.relations.map((relation) => ({
      relation_type: relation.relationType,
      target_name: relation.targetName,
      target_type: relation.targetType,
    })),
    metadata: {
      testimonial_author: input.draft.testimonialAuthor,
      testimonial_organization: input.draft.testimonialOrganization,
    },
  });
}

async function attachKnowledgeCitations(input: {
  workspaceId: string;
  candidateId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  draft: KnowledgeCandidateDraft;
  windowRows: SourceContentBlockRow[];
}): Promise<void> {
  const byId = new Map(input.windowRows.map((row) => [row.id, row]));
  let order = 0;
  for (const citation of input.draft.citations) {
    const block = byId.get(citation.blockId);
    if (!block) continue;
    const location = locateExactQuote(block.text_content, citation.exactQuote);
    await insertKnowledgeCandidateEvidence({
      workspaceId: input.workspaceId,
      knowledgeCandidateId: input.candidateId,
      sourceContentBlockId: block.id,
      sourceSnapshotId: input.sourceSnapshotId,
      originModelRunId: input.originModelRunId,
      citationOrder: order,
      exactQuote: citation.exactQuote,
      charStart: location.found && !location.ambiguous ? location.charStart : null,
      charEnd: location.found && !location.ambiguous ? location.charEnd : null,
    });
    order += 1;
  }
}

async function validateAndMaybePromoteKnowledge(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  candidate: KnowledgeCandidateRow;
  draft: KnowledgeCandidateDraft;
  windowRows: SourceContentBlockRow[];
  existingNames: string[];
  provider: LanguageModelProvider;
  promote: PromoteKnowledgeFn;
}): Promise<void> {
  if (input.candidate.status === "promoted" || input.candidate.status === "rejected") return;
  if (input.candidate.status !== "pending_validation") return;

  const existingValidations = await listKnowledgeValidations(input.candidate.id);
  if (existingValidations.length > 0) return;

  const snapshotOk = await snapshotExists(input.workspaceId, input.sourceSnapshotId);
  const blocksById = new Map<string, KnowledgeCitedBlock>(
    input.windowRows.map((row) => [
      row.id,
      { id: row.id, textContent: row.text_content, sourceSnapshotId: row.source_snapshot_id },
    ]),
  );

  const deterministic = runKnowledgeDeterministicValidators({
    draft: input.draft,
    snapshotExists: snapshotOk,
    blocksById,
    existingObjectNames: input.existingNames,
  });
  await insertKnowledgeValidations({
    workspaceId: input.workspaceId,
    knowledgeCandidateId: input.candidate.id,
    validationRound: 1,
    records: deterministic,
  });

  let allValidations: ValidationRecord[] = [...deterministic];

  if (!hasBlockingKnowledgeFailure(deterministic)) {
    const cited = input.draft.citations
      .map((citation) => input.windowRows.find((row) => row.id === citation.blockId))
      .filter((row): row is SourceContentBlockRow => Boolean(row));
    const { run, parsed } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: {
        source_snapshot_id: input.sourceSnapshotId,
        knowledge_candidate_id: input.candidate.id,
        block_ids: cited.map((row) => row.id),
      },
      request: {
        taskType: "knowledge_validation",
        model: getValidationModel(),
        reasoningEffort: "medium",
        promptVersion: KNOWLEDGE_VALIDATION_PROMPT_VERSION,
        schemaVersion: KNOWLEDGE_VALIDATION_SCHEMA_VERSION,
        schema: knowledgeValidationOutputSchema,
        schemaName: "knowledge_validation",
        instructions: KNOWLEDGE_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: serializeKnowledgeValidationInput({
          draft: input.draft,
          citedBlocks: cited,
          existingObjectNames: input.existingNames,
        }),
      },
    });
    const semantic = knowledgeSemanticOutputToRecords(parsed, run.id);
    await insertKnowledgeValidations({
      workspaceId: input.workspaceId,
      knowledgeCandidateId: input.candidate.id,
      validationRound: 2,
      records: semantic,
    });
    allValidations = [...allValidations, ...semantic];
  }

  const evidence = await listKnowledgeCandidateEvidence(input.candidate.id);
  const decision = decideKnowledgeCandidateStatus({
    hasSupportingCitation: evidence.length > 0,
    attributedToEfeso: input.draft.attributedToEfeso,
    validations: allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;

  await updateKnowledgeCandidateOutcome({
    id: input.candidate.id,
    fromStatus: "pending_validation",
    status: decision.status,
    rejectionReasonCode: decision.rejectionReasonCode,
    rejectionReasonText: decision.rejectionReasonText,
  });

  if (decision.status === "validated") {
    const objectId = await input.promote(input.candidate.id);
    await linkRelatedClaims({
      workspaceId: input.workspaceId,
      snapshotId: input.sourceSnapshotId,
      knowledgeCandidateId: input.candidate.id,
      knowledgeObjectId: objectId,
      objectType: input.candidate.candidate_type,
      canonicalName: input.candidate.canonical_name,
    });
  }
}

async function linkRelatedClaims(input: {
  workspaceId: string;
  snapshotId: string;
  knowledgeCandidateId: string;
  knowledgeObjectId: string;
  objectType: string;
  canonicalName: string;
}): Promise<void> {
  const knowledgeEvidence = await listKnowledgeCandidateEvidence(input.knowledgeCandidateId);
  const knowledgeBlocks = new Set(knowledgeEvidence.map((row) => row.source_content_block_id));
  const claimCandidates = await listCandidatesForSnapshot(input.snapshotId);
  const needle = input.canonicalName.toLowerCase();

  for (const candidate of claimCandidates) {
    if (candidate.status !== "promoted") continue;
    const claim = await getClaimByOriginCandidate(candidate.id);
    if (!claim) continue;
    const claimEvidence = await listCandidateEvidence(candidate.id);
    const overlap = claimEvidence.some((row) => knowledgeBlocks.has(row.source_content_block_id));
    const nameHit = candidate.proposed_statement.toLowerCase().includes(needle);
    if (!overlap && !nameHit) continue;
    const relationshipType =
      input.objectType === "result"
        ? "quantifies"
        : input.objectType === "case"
          ? "demonstrates"
          : nameHit
            ? "defines"
            : "supports";
    await insertKnowledgeObjectClaim({
      workspaceId: input.workspaceId,
      knowledgeObjectId: input.knowledgeObjectId,
      claimId: claim.id,
      relationshipType,
    });
  }
}

async function summarizeKnowledgeSnapshot(input: {
  snapshotId: string;
  sourceId: string;
  blockCount: number;
  windowCount: number;
}): Promise<KnowledgeExtractionSummary> {
  const candidates = await listKnowledgeCandidatesForSnapshot(input.snapshotId);
  const views: KnowledgeCandidateView[] = [];
  const objectIds = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.promoted_knowledge_object_id) objectIds.add(candidate.promoted_knowledge_object_id);
    const evidence = await listKnowledgeCandidateEvidence(candidate.id);
    const validations = await listKnowledgeValidations(candidate.id);
    const citations = [];
    for (const row of evidence) {
      const block = await getBlockById(row.source_content_block_id);
      citations.push({
        exactQuote: row.exact_quote,
        pageNumber: block?.page_number ?? null,
        sectionTitle: block?.section_title ?? null,
        charStart: row.char_start,
        charEnd: row.char_end,
      });
    }
    views.push({
      id: candidate.id,
      objectType: candidate.candidate_type,
      canonicalName: candidate.canonical_name,
      description: candidate.proposed_description,
      status: candidate.status,
      attributedToEfeso: candidate.attributed_to_efeso,
      rejectionReasonCode: candidate.rejection_reason_code,
      rejectionReasonText: candidate.rejection_reason_text,
      originModelRunId: candidate.extraction_model_run_id,
      promotedKnowledgeObjectId: candidate.promoted_knowledge_object_id,
      proposedTags: candidate.proposed_tags,
      proposedAliases: candidate.proposed_aliases,
      proposedRelations: candidate.proposed_relations,
      citations,
      validations: validations.map((row) => ({
        validatorCode: row.validator_code,
        result: row.result,
        severity: row.severity,
        message: row.message,
        supportLevel: row.details?.support_level,
      })),
    });
  }

  return {
    snapshotId: input.snapshotId,
    sourceId: input.sourceId,
    blockCount: input.blockCount,
    windowCount: input.windowCount,
    candidateCount: views.length,
    promotedCount: views.filter((row) => row.status === "promoted").length,
    needsReviewCount: views.filter((row) => row.status === "needs_review").length,
    rejectedCount: views.filter((row) => row.status === "rejected").length,
    objectCount: objectIds.size,
    candidates: views,
  };
}

export async function getKnowledgeLabContext(): Promise<{
  analyses: { id: string; title: string; status: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  snapshots: { id: string; title: string | null; capturedAt: string; sourceId: string }[];
}> {
  await requireAdminUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const analyses = await analysisRepository.getRecentAnalyses(workspace.id, 30);
  const runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]> = {};
  for (const analysis of analyses) {
    const runs = await researchRunRepository.listResearchRunsForAnalysis(workspace.id, analysis.id);
    runsByAnalysis[analysis.id] = runs.map((run) => ({
      id: run.id,
      status: run.status,
      createdAt: run.created_at,
    }));
  }
  const snapshots = await listSnapshotsWithBlocks(workspace.id);
  return {
    analyses: analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
    })),
    runsByAnalysis,
    snapshots: snapshots.map((row) => ({
      id: row.id,
      title: row.title,
      capturedAt: row.captured_at,
      sourceId: row.source_id,
    })),
  };
}
