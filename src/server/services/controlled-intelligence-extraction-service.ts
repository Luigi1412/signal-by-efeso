import "server-only";
import {
  CLAIM_EXTRACTION_PROMPT_VERSION,
  CLAIM_EXTRACTION_SCHEMA_VERSION,
  CLAIM_VALIDATION_PROMPT_VERSION,
  CLAIM_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import {
  getExtractionModel,
  getLanguageModelProviderName,
  getValidationModel,
  isControlledExtractionEnabled,
} from "@/server/ai/config";
import {
  ControlledExtractionDisabledError,
  DocumentNeedsOcrError,
  DocumentParseError,
  DocumentTooLargeError,
  PromotionError,
  UnsupportedDocumentTypeError,
} from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { CLAIM_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/claim-extraction-v1";
import {
  CLAIM_SEMANTIC_VALIDATION_BATCH_INSTRUCTIONS,
  CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS,
} from "@/server/ai/prompts/claim-semantic-validation-v1";
import { claimExtractionOutputSchema } from "@/server/ai/schemas/claim-extraction-schema";
import {
  claimValidationBatchOutputSchema,
  claimValidationOutputSchema,
  type ClaimValidationOutput,
} from "@/server/ai/schemas/claim-validation-schema";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import { hasBlockingDeterministicFailure, runDeterministicValidators } from "@/server/extraction/deterministic-validators";
import {
  claimCandidateToDraft,
  extractedClaimToDraft,
  serializeExtractionWindow,
  serializeValidationBatchInput,
  serializeValidationInput,
} from "@/server/extraction/extraction-input";
import { computeCandidateFingerprint } from "@/server/extraction/fingerprint";
import { executeStructuredModelRun } from "@/server/extraction/model-run-service";
import { canTransition, decideCandidateStatus } from "@/server/extraction/promotion-policy";
import {
  findCandidateByFingerprint,
  getBlockById,
  insertCandidateEvidence,
  insertClaimCandidate,
  insertContentBlocks,
  insertValidations,
  listBlocksForParser,
  listCandidateEvidence,
  listCandidatesForSnapshot,
  listValidationsForCandidate,
  updateCandidateOutcome,
} from "@/server/extraction/pipeline-persistence";
import type { ClaimCandidateRow, ClaimCandidateValidationRow, SourceContentBlockRow } from "@/server/extraction/pipeline-rows";
import { locateExactQuote } from "@/server/extraction/quote";
import { semanticOutputToRecords } from "@/server/extraction/semantic-validators";
import { detectControlledUpload } from "@/server/extraction/upload";
import { parseControlledDocument } from "@/server/parsers";
import { getFastPassWindowOptions, selectFastPassBlocks } from "@/server/parsers/fast-window";
import { buildExtractionWindows } from "@/server/parsers/windowing";
import type { ContentBlockType } from "@/server/parsers/types";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAdminUserId } from "@/server/session";
import { captureSourceSnapshot, registerSource } from "@/server/services/evidence-foundation-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import type { CandidateDraft, CitedBlock, ValidationRecord } from "@/server/extraction/validation-types";
import type {
  ControlledExtractionSummary,
  ExtractionCandidateView,
} from "@/types/controlled-extraction";

export type { ControlledExtractionSummary, ExtractionCandidateView };

export interface PromoteCandidateFn {
  (candidateId: string): Promise<string>;
}

export async function promoteCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_claim_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_claim_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Promotion RPC returned no claim id.");
  return String(data);
}

export async function runControlledExtractionFromUpload(input: {
  analysisId: string;
  researchRunId: string;
  fileName: string;
  bytes: Uint8Array;
  declaredMime?: string | null;
  publisherName: string;
  sourceType: string;
  sourceTier: string;
  canonicalUrl?: string | null;
  provider?: LanguageModelProvider;
  promote?: PromoteCandidateFn;
}): Promise<ControlledExtractionSummary> {
  if (!isControlledExtractionEnabled()) throw new ControlledExtractionDisabledError();
  await requireAdminUserId();
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const analysis = await analysisRepository.getAnalysisById(workspace.id, input.analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");
  const run = await researchRunRepository.getResearchRun(workspace.id, input.researchRunId);
  if (!run || run.analysis_id !== analysis.id) throw new Error("RESEARCH_RUN_NOT_FOUND");

  const detected = detectControlledUpload({
    fileName: input.fileName,
    bytes: input.bytes,
    declaredMime: input.declaredMime,
  });
  if (!detected.ok) throw new UnsupportedDocumentTypeError(detected.reason);

  const source = await registerSource({
    publisherName: input.publisherName,
    sourceType: input.sourceType as never,
    sourceTier: input.sourceTier as never,
    canonicalUrl: input.canonicalUrl || undefined,
    researchRunId: run.id,
    discoveryMethod: "upload",
    researchWave: "manual",
    disposition: "retained",
  });

  const parsed = await parseControlledDocument(input.bytes, {
    mimeType: detected.mimeType,
    fileName: input.fileName,
  });
  if (!parsed.ok) {
    if (parsed.code === "UNSUPPORTED_NEEDS_OCR") throw new DocumentNeedsOcrError();
    if (parsed.code === "DOCUMENT_TOO_LARGE" || parsed.code === "TOO_MANY_PAGES") {
      throw new DocumentTooLargeError(parsed.message);
    }
    if (parsed.code === "UNSUPPORTED_TYPE") throw new UnsupportedDocumentTypeError(parsed.message);
    throw new DocumentParseError(parsed.message);
  }

  const capture = await captureSourceSnapshot({
    sourceId: source.id,
    capturedByResearchRunId: run.id,
    title: input.fileName,
    snapshotMode: "full",
    mimeType: detected.mimeType,
    pageCount: parsed.pageCount,
    originalFileName: input.fileName,
    normalizedText: parsed.blocks.map((block) => block.textContent).join("\n\n"),
    originalFileBytes: input.bytes,
  });

  return executeControlledExtraction({
    workspaceId: workspace.id,
    analysisId: analysis.id,
    researchRunId: run.id,
    companyId: analysis.company_id,
    sourceSnapshotId: capture.snapshot.id,
    sourceId: source.id,
    reusedSnapshot: capture.reused,
    parserName: parsed.parserName,
    parserVersion: parsed.parserVersion,
    blocks: parsed.blocks,
    provider: input.provider ?? getLanguageModelProvider(),
    promote: input.promote ?? promoteCandidateViaSessionRpc,
  });
}

export type SemanticBatchReport = {
  called: boolean;
  zodOk: boolean;
  fallbackReason: string | null;
  batchMs: number | null;
  fallbackCount: number;
  fallbackMs: number[];
  candidateCount: number;
};

export async function executeControlledExtraction(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  companyId: string;
  sourceSnapshotId: string;
  sourceId: string;
  reusedSnapshot: boolean;
  parserName: string;
  parserVersion: string;
  companyName?: string | null;
  blocks: {
    blockIndex: number;
    blockType: ContentBlockType;
    textContent: string;
    pageNumber: number | null;
    sectionTitle: string | null;
    locator: Record<string, unknown>;
    parseConfidence: number | null;
    metadata: Record<string, unknown>;
  }[];
  provider: LanguageModelProvider;
  promote: PromoteCandidateFn;
  onAfterDecision?: () => Promise<void>;
  onBatchReport?: (report: SemanticBatchReport) => Promise<void>;
}): Promise<ControlledExtractionSummary> {
  let persisted = await listBlocksForParser(input.sourceSnapshotId, input.parserName, input.parserVersion);
  if (persisted.length === 0) {
    persisted = await insertContentBlocks({
      workspaceId: input.workspaceId,
      sourceSnapshotId: input.sourceSnapshotId,
      parserName: input.parserName,
      parserVersion: input.parserVersion,
      blocks: input.blocks,
    });
  }

  const existingCandidates = (await listCandidatesForSnapshot(input.sourceSnapshotId)).filter(
    (row) => row.analysis_id === input.analysisId,
  );
  if (existingCandidates.length > 0) {
    const pending = existingCandidates.filter((row) => row.status === "pending_validation");
    if (pending.length > 0) {
      const drafts: Array<{ candidate: ClaimCandidateRow; draft: CandidateDraft }> = [];
      for (const candidate of pending) {
        const evidence = await listCandidateEvidence(candidate.id);
        drafts.push({ candidate, draft: claimCandidateToDraft(candidate, evidence) });
      }
      try {
        await validateWindowCandidates({
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          researchRunId: input.researchRunId,
          sourceSnapshotId: input.sourceSnapshotId,
          pending: drafts,
          windowRows: persisted,
          allBlocks: persisted,
          provider: input.provider,
          promote: input.promote,
          companyName: input.companyName ?? null,
          onAfterDecision: input.onAfterDecision,
        });
      } catch {
        // Keep persisted candidates; remaining pending units resume on the next tick.
      }
    }
    return summarizeSnapshot({
      snapshotId: input.sourceSnapshotId,
      sourceId: input.sourceId,
      reusedSnapshot: true,
      parserName: input.parserName,
      parserVersion: input.parserVersion,
      blockCount: persisted.length,
      windowCount: 0,
    });
  }

  const mappedBlocks = persisted.map((block) => ({
    blockIndex: block.block_index,
    blockType: block.block_type as ContentBlockType,
    textContent: block.text_content,
    pageNumber: block.page_number,
    sectionTitle: block.section_title,
    locator: (block.locator ?? {}) as Record<string, unknown>,
    parseConfidence: block.parse_confidence,
    metadata: (block.metadata ?? {}) as Record<string, unknown>,
  }));
  const limits = getFastPassWindowOptions(getLanguageModelProviderName());
  const focused = selectFastPassBlocks(mappedBlocks, limits);
  const windows = buildExtractionWindows(focused, {
    maxChars: limits.maxCharsPerWindow,
    overlapBlocks: 1,
  }).slice(0, limits.maxWindows);

  const processedIds = new Set<string>();

  const processWindows = async (extractionWindows: typeof windows) => {
    for (const window of extractionWindows) {
      const windowRows = window.blocks
        .map((parsed) => persisted.find((row) => row.block_index === parsed.blockIndex))
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
          fast_pass: true,
        },
        request: {
          taskType: "claim_extraction",
          model: getExtractionModel(),
          reasoningEffort: "low",
          promptVersion: CLAIM_EXTRACTION_PROMPT_VERSION,
          schemaVersion: CLAIM_EXTRACTION_SCHEMA_VERSION,
          schema: claimExtractionOutputSchema,
          schemaName: "claim_extraction",
          instructions: CLAIM_EXTRACTION_INSTRUCTIONS,
          input: serializeExtractionWindow(windowRows),
        },
      });

      const pending: Array<{ candidate: ClaimCandidateRow; draft: CandidateDraft }> = [];
      for (const claim of extraction.claims) {
        let draft: CandidateDraft;
        try {
          draft = extractedClaimToDraft(claim);
        } catch {
          continue;
        }
        let candidate: ClaimCandidateRow;
        try {
          candidate = await persistCandidate({
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          researchRunId: input.researchRunId,
          companyId: input.companyId,
          sourceSnapshotId: input.sourceSnapshotId,
          originModelRunId: run.id,
          draft,
          modelExtractionConfidence: claim.model_extraction_confidence,
          windowRows,
        });
        } catch {
          continue;
        }
        if (processedIds.has(candidate.id)) {
          await attachCitations({
            workspaceId: input.workspaceId,
            candidateId: candidate.id,
            sourceSnapshotId: input.sourceSnapshotId,
            originModelRunId: run.id,
            draft,
            windowRows,
          });
          continue;
        }
        processedIds.add(candidate.id);
        if (candidate.status === "promoted" || candidate.status === "rejected" || candidate.status !== "pending_validation") {
          continue;
        }
        const existingValidations = await listValidationsForCandidate(candidate.id);
        if (existingValidations.length > 0) continue;
        pending.push({ candidate, draft });
      }

      try {
        await validateWindowCandidates({
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          researchRunId: input.researchRunId,
          sourceSnapshotId: input.sourceSnapshotId,
          pending,
          windowRows,
          allBlocks: persisted,
          provider: input.provider,
          promote: input.promote,
          companyName: input.companyName ?? null,
          onAfterDecision: input.onAfterDecision,
          onBatchReport: input.onBatchReport,
        });
      } catch {
        // Keep persisted candidates even if semantic validation of the window fails.
      }
    }
  };

  await processWindows(windows);

  if (processedIds.size === 0 && mappedBlocks.length > 0) {
    const usedIndexes = new Set(windows.flatMap((window) => window.blocks.map((block) => block.blockIndex)));
    const leftover = mappedBlocks.filter((block) => !usedIndexes.has(block.blockIndex));
    if (leftover.length > 0) {
      const extraFocused = selectFastPassBlocks(leftover, limits);
      const extraWindows = buildExtractionWindows(extraFocused, {
        maxChars: limits.maxCharsPerWindow,
        overlapBlocks: 1,
      }).slice(0, 1);
      await processWindows(extraWindows);
    }
  }

  return summarizeSnapshot({
    snapshotId: input.sourceSnapshotId,
    sourceId: input.sourceId,
    reusedSnapshot: input.reusedSnapshot,
    parserName: input.parserName,
    parserVersion: input.parserVersion,
    blockCount: persisted.length,
    windowCount: windows.length,
  });
}

async function persistCandidate(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  companyId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  draft: CandidateDraft;
  modelExtractionConfidence: number | null;
  windowRows: SourceContentBlockRow[];
}): Promise<ClaimCandidateRow> {
  const fingerprint = computeCandidateFingerprint({
    sourceSnapshotId: input.sourceSnapshotId,
    proposedStatement: input.draft.proposedStatement,
    claimCategory: input.draft.claimCategory,
    assertionMode: input.draft.assertionMode,
    entityId: input.draft.entityId,
    geographyLevel: input.draft.geographyLevel,
    countryCode: input.draft.countryCode,
    stateRegion: input.draft.stateRegion,
    city: input.draft.city,
    periodType: input.draft.periodType,
    periodStart: input.draft.periodStart,
    periodEnd: input.draft.periodEnd,
    asOfDate: input.draft.asOfDate,
    metricName: input.draft.metricName,
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
    currencyCode: input.draft.currencyCode,
    scale: input.draft.scale,
  });

  const existing = await findCandidateByFingerprint(input.sourceSnapshotId, fingerprint, input.analysisId);
  if (existing) {
    await attachCitations({
      workspaceId: input.workspaceId,
      candidateId: existing.id,
      sourceSnapshotId: input.sourceSnapshotId,
      originModelRunId: input.originModelRunId,
      draft: input.draft,
      windowRows: input.windowRows,
    });
    return existing;
  }

  try {
    return await insertCandidateRow(input, fingerprint);
  } catch (error) {
    if (!input.draft.entityId) throw error;
    input.draft.entityId = null;
    const retryFingerprint = computeCandidateFingerprint({
      sourceSnapshotId: input.sourceSnapshotId,
      proposedStatement: input.draft.proposedStatement,
      claimCategory: input.draft.claimCategory,
      assertionMode: input.draft.assertionMode,
      entityId: null,
      geographyLevel: input.draft.geographyLevel,
      countryCode: input.draft.countryCode,
      stateRegion: input.draft.stateRegion,
      city: input.draft.city,
      periodType: input.draft.periodType,
      periodStart: input.draft.periodStart,
      periodEnd: input.draft.periodEnd,
      asOfDate: input.draft.asOfDate,
      metricName: input.draft.metricName,
      numericValue: input.draft.numericValue,
      unit: input.draft.unit,
      currencyCode: input.draft.currencyCode,
      scale: input.draft.scale,
    });
    const existingRetry = await findCandidateByFingerprint(input.sourceSnapshotId, retryFingerprint, input.analysisId);
    if (existingRetry) {
      await attachCitations({
        workspaceId: input.workspaceId,
        candidateId: existingRetry.id,
        sourceSnapshotId: input.sourceSnapshotId,
        originModelRunId: input.originModelRunId,
        draft: input.draft,
        windowRows: input.windowRows,
      });
      return existingRetry;
    }
    return insertCandidateRow({ ...input, draft: { ...input.draft, entityId: null } }, retryFingerprint);
  }
}

async function insertCandidateRow(
  input: {
    workspaceId: string;
    analysisId: string;
    researchRunId: string;
    companyId: string;
    sourceSnapshotId: string;
    originModelRunId: string;
    draft: CandidateDraft;
    modelExtractionConfidence: number | null;
    windowRows: SourceContentBlockRow[];
  },
  fingerprint: string,
): Promise<ClaimCandidateRow> {
  const created = await insertClaimCandidate({
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    companyId: input.companyId,
    sourceSnapshotId: input.sourceSnapshotId,
    originModelRunId: input.originModelRunId,
    fingerprint,
    proposedStatement: input.draft.proposedStatement,
    claimCategory: input.draft.claimCategory,
    claimType: input.draft.claimType,
    assertionMode: input.draft.assertionMode,
    entityId: input.draft.entityId,
    geographyLevel: input.draft.geographyLevel,
    countryCode: input.draft.countryCode,
    stateRegion: input.draft.stateRegion,
    city: input.draft.city,
    periodType: input.draft.periodType,
    periodStart: input.draft.periodStart,
    periodEnd: input.draft.periodEnd,
    asOfDate: input.draft.asOfDate,
    metricName: input.draft.metricName,
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
    currencyCode: input.draft.currencyCode,
    scale: input.draft.scale,
    modelExtractionConfidence: input.modelExtractionConfidence,
  });
  await attachCitations({
    workspaceId: input.workspaceId,
    candidateId: created.id,
    sourceSnapshotId: input.sourceSnapshotId,
    originModelRunId: input.originModelRunId,
    draft: input.draft,
    windowRows: input.windowRows,
  });
  return created;
}

async function attachCitations(input: {
  workspaceId: string;
  candidateId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  draft: CandidateDraft;
  windowRows: SourceContentBlockRow[];
}): Promise<void> {
  const byId = new Map(input.windowRows.map((row) => [row.id, row]));
  let order = 0;
  for (const citation of input.draft.citations) {
    const block = byId.get(citation.blockId);
    if (!block) continue;
    if (!citation.exactQuote.trim()) continue;
    const location = locateExactQuote(block.text_content, citation.exactQuote);
    await insertCandidateEvidence({
      workspaceId: input.workspaceId,
      claimCandidateId: input.candidateId,
      sourceContentBlockId: block.id,
      sourceSnapshotId: input.sourceSnapshotId,
      originModelRunId: input.originModelRunId,
      citationOrder: order,
      exactQuote: citation.exactQuote,
      charStart: location.found && !location.ambiguous ? location.charStart : null,
      charEnd: location.found && !location.ambiguous ? location.charEnd : null,
      relationship: citation.relationship ?? "supports",
    });
    order += 1;
  }
}

async function validateWindowCandidates(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  pending: Array<{ candidate: ClaimCandidateRow; draft: CandidateDraft }>;
  windowRows: SourceContentBlockRow[];
  allBlocks: SourceContentBlockRow[];
  provider: LanguageModelProvider;
  promote: PromoteCandidateFn;
  companyName?: string | null;
  onAfterDecision?: () => Promise<void>;
  onBatchReport?: (report: SemanticBatchReport) => Promise<void>;
}): Promise<void> {
  const semanticReady: Array<{
    candidate: ClaimCandidateRow;
    draft: CandidateDraft;
    deterministic: ValidationRecord[];
    cited: SourceContentBlockRow[];
    adjacent: { blockId: string; text: string }[];
  }> = [];

  for (const item of input.pending) {
    const prepared = await persistDeterministicValidations({
      workspaceId: input.workspaceId,
      candidate: item.candidate,
      draft: item.draft,
      windowRows: input.windowRows,
    });
    if (!prepared) continue;
    if (prepared.alreadySemantic) {
      await finalizeCandidateDecision({
        ...input,
        candidate: item.candidate,
        draft: item.draft,
        allValidations: [...prepared.deterministic, ...prepared.semantic],
      });
      if (input.onAfterDecision) await input.onAfterDecision();
      continue;
    }
    if (hasBlockingDeterministicFailure(prepared.deterministic)) {
      await finalizeCandidateDecision({
        ...input,
        candidate: item.candidate,
        draft: item.draft,
        allValidations: prepared.deterministic,
      });
      if (input.onAfterDecision) await input.onAfterDecision();
      continue;
    }
    semanticReady.push({
      candidate: item.candidate,
      draft: item.draft,
      deterministic: prepared.deterministic,
      cited: prepared.cited,
      adjacent: adjacentContext(prepared.cited, input.allBlocks),
    });
  }

  if (semanticReady.length === 0) return;

  const byIndex = new Map<number, (typeof semanticReady)[number]>();
  const byId = new Map<string, (typeof semanticReady)[number]>();
  semanticReady.forEach((item, index) => {
    byIndex.set(index, item);
    byId.set(item.candidate.id, item);
  });

  const report: SemanticBatchReport = {
    called: semanticReady.length > 1,
    zodOk: false,
    fallbackReason: null,
    batchMs: null,
    fallbackCount: 0,
    fallbackMs: [],
    candidateCount: semanticReady.length,
  };

  let batchOk = false;
  if (semanticReady.length > 1) {
    const batchStarted = Date.now();
    try {
      const { run, parsed } = await executeStructuredModelRun({
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        researchRunId: input.researchRunId,
        sourceSnapshotId: input.sourceSnapshotId,
        provider: input.provider,
        inputManifest: {
          source_snapshot_id: input.sourceSnapshotId,
          claim_candidate_ids: semanticReady.map((item) => item.candidate.id),
          batch: true,
        },
        request: {
          taskType: "claim_semantic_validation",
          model: getValidationModel(),
          reasoningEffort: "medium",
          promptVersion: CLAIM_VALIDATION_PROMPT_VERSION,
          schemaVersion: CLAIM_VALIDATION_SCHEMA_VERSION,
          schema: claimValidationBatchOutputSchema,
          schemaName: "claim_semantic_validation_batch",
          instructions: CLAIM_SEMANTIC_VALIDATION_BATCH_INSTRUCTIONS,
          input: serializeValidationBatchInput(
            semanticReady.map((item) => ({
              candidate: item.draft,
              candidateId: item.candidate.id,
              companyName: input.companyName,
              citedBlocks: item.cited,
              adjacentContext: item.adjacent,
            })),
          ),
        },
      });
      report.batchMs = Date.now() - batchStarted;
      const seen = new Set<string>();
      for (const [index, row] of parsed.items.entries()) {
        const target = (row.candidate_id ? byId.get(row.candidate_id) : undefined) ?? byIndex.get(row.candidate_index) ?? byIndex.get(index);
        if (!target || seen.has(target.candidate.id)) continue;
        seen.add(target.candidate.id);
        const wrapped: ClaimValidationOutput = {
          schema_version: parsed.schema_version,
          validators: row.validators,
        };
        const semantic = semanticOutputToRecords(wrapped, run.id);
        await insertValidations({
          workspaceId: input.workspaceId,
          claimCandidateId: target.candidate.id,
          validationRound: 2,
          records: semantic,
        });
        await finalizeCandidateDecision({
          ...input,
          candidate: target.candidate,
          draft: target.draft,
          allValidations: [...target.deterministic, ...semantic],
        });
        if (input.onAfterDecision) await input.onAfterDecision();
      }
      batchOk = seen.size === semanticReady.length;
      report.zodOk = true;
      if (!batchOk) {
        report.fallbackReason = `incomplete_batch_items:${seen.size}/${semanticReady.length}`;
      }
    } catch (error) {
      report.batchMs = Date.now() - batchStarted;
      report.zodOk = false;
      report.fallbackReason = error instanceof Error ? error.message.slice(0, 400) : "batch_failed";
      batchOk = false;
    }
  }

  if (semanticReady.length === 1 || !batchOk) {
    for (const item of semanticReady) {
      const existing = await listValidationsForCandidate(item.candidate.id);
      if (existing.some((row) => row.validator_type === "model")) continue;
      const started = Date.now();
      await runSingleSemanticValidation({ ...input, ...item, companyName: input.companyName });
      report.fallbackCount += 1;
      report.fallbackMs.push(Date.now() - started);
      if (input.onAfterDecision) await input.onAfterDecision();
      break;
    }
  }

  if (input.onBatchReport) await input.onBatchReport(report);
}

async function persistDeterministicValidations(input: {
  workspaceId: string;
  candidate: ClaimCandidateRow;
  draft: CandidateDraft;
  windowRows: SourceContentBlockRow[];
}): Promise<{
  deterministic: ValidationRecord[];
  semantic: ValidationRecord[];
  cited: SourceContentBlockRow[];
  alreadySemantic: boolean;
} | null> {
  if (input.candidate.status !== "pending_validation") return null;
  const cited = input.draft.citations
    .map((citation) => input.windowRows.find((row) => row.id === citation.blockId))
    .filter((row): row is SourceContentBlockRow => Boolean(row));
  const existingValidations = await listValidationsForCandidate(input.candidate.id);
  if (existingValidations.length > 0) {
    const deterministic = existingValidations.filter((row) => row.validator_type !== "model").map(validationRowToRecord);
    const semantic = existingValidations.filter((row) => row.validator_type === "model").map(validationRowToRecord);
    return { deterministic, semantic, cited, alreadySemantic: semantic.length > 0 };
  }

  const blocksById = new Map<string, CitedBlock>(
    input.windowRows.map((row) => [
      row.id,
      {
        id: row.id,
        textContent: row.text_content,
        pageNumber: row.page_number,
        sectionTitle: row.section_title,
        sourceSnapshotId: row.source_snapshot_id,
      },
    ]),
  );
  const deterministic = runDeterministicValidators({ draft: input.draft, blocksById });
  await insertValidations({
    workspaceId: input.workspaceId,
    claimCandidateId: input.candidate.id,
    validationRound: 1,
    records: deterministic,
  });
  return { deterministic, semantic: [], cited, alreadySemantic: false };
}

function validationRowToRecord(row: ClaimCandidateValidationRow): ValidationRecord {
  return {
    validatorCode: row.validator_code,
    validatorVersion: row.validator_version,
    validatorType: row.validator_type as ValidationRecord["validatorType"],
    result: row.result as ValidationRecord["result"],
    severity: row.severity as ValidationRecord["severity"],
    message: row.message,
    details: row.details ?? {},
    modelRunId: row.model_run_id,
  };
}

async function runSingleSemanticValidation(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  candidate: ClaimCandidateRow;
  draft: CandidateDraft;
  deterministic: ValidationRecord[];
  cited: SourceContentBlockRow[];
  adjacent: { blockId: string; text: string }[];
  provider: LanguageModelProvider;
  promote: PromoteCandidateFn;
  windowRows: SourceContentBlockRow[];
  companyName?: string | null;
}): Promise<void> {
  const { run, parsed } = await executeStructuredModelRun({
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    sourceSnapshotId: input.sourceSnapshotId,
    provider: input.provider,
    inputManifest: {
      source_snapshot_id: input.sourceSnapshotId,
      claim_candidate_id: input.candidate.id,
      block_ids: input.cited.map((row) => row.id),
    },
    request: {
      taskType: "claim_semantic_validation",
      model: getValidationModel(),
      reasoningEffort: "medium",
      promptVersion: CLAIM_VALIDATION_PROMPT_VERSION,
      schemaVersion: CLAIM_VALIDATION_SCHEMA_VERSION,
      schema: claimValidationOutputSchema,
      schemaName: "claim_semantic_validation",
      instructions: CLAIM_SEMANTIC_VALIDATION_INSTRUCTIONS,
      input: serializeValidationInput({
        candidate: input.draft,
        candidateId: input.candidate.id,
        companyName: input.companyName,
        citedBlocks: input.cited,
        adjacentContext: input.adjacent,
      }),
    },
  });
  const semantic = semanticOutputToRecords(parsed, run.id);
  await insertValidations({
    workspaceId: input.workspaceId,
    claimCandidateId: input.candidate.id,
    validationRound: 2,
    records: semantic,
  });
  await finalizeCandidateDecision({
    workspaceId: input.workspaceId,
    candidate: input.candidate,
    draft: input.draft,
    allValidations: [...input.deterministic, ...semantic],
    promote: input.promote,
  });
}

async function finalizeCandidateDecision(input: {
  workspaceId: string;
  candidate: ClaimCandidateRow;
  draft: CandidateDraft;
  allValidations: ValidationRecord[];
  promote: PromoteCandidateFn;
}): Promise<void> {
  const evidence = await listCandidateEvidence(input.candidate.id);
  const decision = decideCandidateStatus({
    claimType: input.candidate.claim_type,
    hasSupportingCitation: evidence.some((row) => row.relationship === "supports"),
    validations: input.allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;
  await updateCandidateOutcome({
    id: input.candidate.id,
    fromStatus: "pending_validation",
    status: decision.status,
    rejectionReasonCode: decision.rejectionReasonCode,
    rejectionReasonText: decision.rejectionReasonText,
  });
  if (decision.status === "validated") {
    await input.promote(input.candidate.id);
  }
}

function adjacentContext(
  cited: SourceContentBlockRow[],
  allBlocks: SourceContentBlockRow[],
): { blockId: string; text: string }[] {
  const byIndex = new Map(allBlocks.map((row) => [row.block_index, row]));
  const extras: { blockId: string; text: string }[] = [];
  const seen = new Set(cited.map((row) => row.id));
  for (const block of cited) {
    for (const neighborIndex of [block.block_index - 1, block.block_index + 1]) {
      const neighbor = byIndex.get(neighborIndex);
      if (!neighbor || seen.has(neighbor.id)) continue;
      if (neighbor.block_type === "header" || neighbor.block_type === "footer") continue;
      seen.add(neighbor.id);
      extras.push({ blockId: neighbor.id, text: neighbor.text_content.slice(0, 500) });
    }
  }
  return extras;
}

async function summarizeSnapshot(input: {
  snapshotId: string;
  sourceId: string;
  reusedSnapshot: boolean;
  parserName: string;
  parserVersion: string;
  blockCount: number;
  windowCount: number;
}): Promise<ControlledExtractionSummary> {
  const candidates = await listCandidatesForSnapshot(input.snapshotId);
  const views: ExtractionCandidateView[] = [];
  for (const candidate of candidates) {
    const evidence = await listCandidateEvidence(candidate.id);
    const validations = await listValidationsForCandidate(candidate.id);
    const citations = [];
    for (const row of evidence) {
      const block = await getBlockById(row.source_content_block_id);
      citations.push({
        exactQuote: row.exact_quote,
        pageNumber: block?.page_number ?? null,
        sectionTitle: block?.section_title ?? null,
        relationship: row.relationship,
      });
    }
    views.push({
      id: candidate.id,
      statement: candidate.proposed_statement,
      status: candidate.status,
      assertionMode: candidate.assertion_mode,
      claimCategory: candidate.claim_category,
      rejectionReasonCode: candidate.rejection_reason_code,
      rejectionReasonText: candidate.rejection_reason_text,
      originModelRunId: candidate.origin_model_run_id,
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
    reusedSnapshot: input.reusedSnapshot,
    parserName: input.parserName,
    parserVersion: input.parserVersion,
    blockCount: input.blockCount,
    windowCount: input.windowCount,
    candidateCount: views.length,
    promotedCount: views.filter((row) => row.status === "promoted").length,
    needsReviewCount: views.filter((row) => row.status === "needs_review").length,
    rejectedCount: views.filter((row) => row.status === "rejected").length,
    candidates: views,
  };
}

export async function getExtractionLabContext(): Promise<{
  analyses: { id: string; title: string; status: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
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
  return {
    analyses: analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
    })),
    runsByAnalysis,
  };
}
