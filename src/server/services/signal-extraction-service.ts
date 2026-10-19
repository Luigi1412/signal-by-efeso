import "server-only";
import {
  SIGNAL_EXTRACTION_PROMPT_VERSION,
  SIGNAL_EXTRACTION_SCHEMA_VERSION,
  SIGNAL_VALIDATION_PROMPT_VERSION,
  SIGNAL_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getExtractionModel, getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { SIGNAL_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/signal-extraction-v1";
import { SIGNAL_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/signal-semantic-validation-v1";
import { signalExtractionOutputSchema } from "@/server/ai/schemas/signal-extraction-schema";
import { signalValidationOutputSchema } from "@/server/ai/schemas/signal-validation-schema";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import { FakeLanguageModelProvider } from "@/server/ai/providers/fake-language-model-provider";
import { executeStructuredModelRun } from "@/server/extraction/model-run-service";
import { canTransition } from "@/server/extraction/promotion-policy";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAdminUserId } from "@/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { hasBlockingSignalFailure, runSignalDeterministicValidators } from "@/server/signals/deterministic-validators";
import { extractedSignalToDraft, serializeSignalExtractionInput, serializeSignalValidationInput } from "@/server/signals/extraction-input";
import { computeSignalFingerprint } from "@/server/signals/fingerprint";
import { deriveSignalImportance } from "@/server/signals/importance";
import {
  findSignalCandidateByFingerprint,
  getClaimCandidateSnapshot,
  getCompanyRow,
  getSnapshotForRun,
  insertSignalCandidate,
  insertSignalCandidateClaims,
  insertSignalValidations,
  listActiveSignalFingerprints,
  listActiveSignalTitles,
  listClaimsForSignalExtraction,
  listCompaniesForWorkspace,
  listSignalCandidateClaims,
  listSignalCandidatesForAnalysis,
  listSignalValidations,
  updateSignalCandidateConfidence,
  updateSignalCandidateOutcome,
  type SignalCandidateRow,
} from "@/server/signals/persistence";
import { decideSignalCandidateStatus, signalGroundingLevel } from "@/server/signals/promotion-policy";
import { signalSemanticOutputToRecords } from "@/server/signals/semantic-validators";
import type { SignalCandidateDraft, SignalCandidateView, SignalClaimContext, SignalExtractionSummary } from "@/server/signals/types";
import type { ValidationRecord } from "@/server/extraction/validation-types";

export type PromoteSignalFn = (candidateId: string) => Promise<string>;

export function emptySignalExtractionOutput() {
  return { schema_version: SIGNAL_EXTRACTION_SCHEMA_VERSION, signals: [] as const };
}

export async function promoteSignalCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_signal_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_signal_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Signal promotion RPC returned no signal id.");
  return String(data);
}

export function createLabFakeSignalProvider(): FakeLanguageModelProvider {
  return new FakeLanguageModelProvider([{ kind: "output", output: emptySignalExtractionOutput() }]);
}

export async function runSignalExtractionForCompany(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  claimIds?: string[];
  useFakeProvider?: boolean;
  provider?: LanguageModelProvider;
  promote?: PromoteSignalFn;
  pipelineActor?: boolean;
}): Promise<SignalExtractionSummary> {
  if (!input.pipelineActor) {
    if (!isControlledExtractionEnabled()) throw new ControlledExtractionDisabledError();
    await requireAdminUserId();
  }
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const analysis = await analysisRepository.getAnalysisById(workspace.id, input.analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");
  if (analysis.company_id !== input.companyId) throw new Error("COMPANY_ANALYSIS_MISMATCH");
  const run = await researchRunRepository.getResearchRun(workspace.id, input.researchRunId);
  if (!run || run.analysis_id !== analysis.id) throw new Error("RESEARCH_RUN_NOT_FOUND");

  const usedFake = Boolean(input.useFakeProvider) && !input.provider;
  const provider = input.provider ?? (usedFake ? createLabFakeSignalProvider() : getLanguageModelProvider());

  return executeSignalExtraction({
    workspaceId: workspace.id,
    companyId: input.companyId,
    analysisId: analysis.id,
    researchRunId: run.id,
    claimIds: input.claimIds,
    provider,
    usedFakeProvider: usedFake || provider.name === "fake",
    promote: input.promote ?? promoteSignalCandidateViaSessionRpc,
  });
}

export async function executeSignalExtraction(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  claimIds?: string[];
  provider: LanguageModelProvider;
  usedFakeProvider: boolean;
  promote: PromoteSignalFn;
}): Promise<SignalExtractionSummary> {
  const company = await getCompanyRow(input.workspaceId, input.companyId);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  const claimRows = await listClaimsForSignalExtraction({
    workspaceId: input.workspaceId,
    companyId: input.companyId,
    analysisId: input.analysisId,
    claimIds: input.claimIds,
  });
  if (claimRows.length === 0) throw new Error("CLAIMS_NOT_FOUND");

  const claims: SignalClaimContext[] = [];
  for (const row of claimRows) {
    const snapshotId = row.origin_claim_candidate_id
      ? await getClaimCandidateSnapshot(row.origin_claim_candidate_id)
      : null;
    claims.push({
      id: row.id,
      workspaceId: row.workspace_id,
      companyId: row.company_id,
      statement: row.statement,
      assertionMode: row.assertion_mode,
      claimStatus: row.claim_status,
      metricName: row.metric_name,
      numericValue: row.numeric_value,
      unit: row.unit,
      currencyCode: row.currency_code,
      countryCode: row.country_code,
      stateRegion: row.state_region,
      city: row.city,
      geographyLevel: row.geography_level,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      asOfDate: row.as_of_date,
      sourceSnapshotId: snapshotId,
      companyResolved: company.resolution_status === "resolved",
    });
  }

  const sourceSnapshotId =
    claims.find((claim) => claim.sourceSnapshotId)?.sourceSnapshotId ??
    (await getSnapshotForRun(input.workspaceId, input.researchRunId));
  if (!sourceSnapshotId) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const { run, parsed: extraction } = await executeStructuredModelRun({
    workspaceId: input.workspaceId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    sourceSnapshotId,
    provider: input.provider,
    inputManifest: {
      company_id: input.companyId,
      claim_ids: claims.map((claim) => claim.id),
      claim_count: claims.length,
    },
    request: {
      taskType: "signal_extraction",
      model: getExtractionModel(),
      reasoningEffort: "low",
      promptVersion: SIGNAL_EXTRACTION_PROMPT_VERSION,
      schemaVersion: SIGNAL_EXTRACTION_SCHEMA_VERSION,
      schema: signalExtractionOutputSchema,
      schemaName: "signal_extraction",
      instructions: SIGNAL_EXTRACTION_INSTRUCTIONS,
      input: serializeSignalExtractionInput({
        company: {
          id: company.id,
          displayName: company.display_name,
          slug: company.slug,
          industry: company.industry,
          countryCode: company.primary_country_code,
        },
        claims,
      }),
    },
  });

  const processed = new Set<string>();
  for (const extracted of extraction.signals) {
    const draft = extractedSignalToDraft(extracted);
    const candidate = await persistSignalCandidate({
      workspaceId: input.workspaceId,
      companyId: input.companyId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId,
      originModelRunId: run.id,
      draft,
    });
    if (processed.has(candidate.id)) continue;
    processed.add(candidate.id);
    await validateAndMaybePromoteSignal({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId,
      companyResolved: company.resolution_status === "resolved",
      companyId: input.companyId,
      candidate,
      draft,
      claims,
      provider: input.provider,
      promote: input.promote,
    });
  }

  return summarizeSignalExtraction({
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    claimCount: claims.length,
    usedFakeProvider: input.usedFakeProvider,
  });
}

async function persistSignalCandidate(input: {
  workspaceId: string;
  companyId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  originModelRunId: string;
  draft: SignalCandidateDraft;
}): Promise<SignalCandidateRow> {
  const fingerprint = computeSignalFingerprint({
    companyId: input.companyId,
    signalType: String(input.draft.signalType),
    coreEvent: input.draft.coreEvent || input.draft.title,
    geography: input.draft.geography,
    eventDate: input.draft.eventDate,
    periodStart: input.draft.effectivePeriodStart,
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
  });
  const existing = await findSignalCandidateByFingerprint(input.workspaceId, input.companyId, fingerprint);
  if (existing) return existing;

  const importance = deriveSignalImportance({
    signalType: String(input.draft.signalType),
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
    currencyCode: input.draft.currencyCode,
    title: input.draft.title,
    summary: input.draft.summary,
  });

  const candidate = await insertSignalCandidate({
    workspaceId: input.workspaceId,
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    sourceSnapshotId: input.sourceSnapshotId,
    signalType: String(input.draft.signalType),
    signalNature: String(input.draft.signalNature),
    title: input.draft.title,
    summary: input.draft.summary,
    importance,
    assertionMode: input.draft.assertionMode,
    confidenceTier: null,
    eventDate: input.draft.eventDate,
    periodStart: input.draft.effectivePeriodStart,
    periodEnd: input.draft.effectivePeriodEnd,
    geography: input.draft.geography,
    metricName: input.draft.metricName,
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
    currencyCode: input.draft.currencyCode,
    coreEvent: input.draft.coreEvent || input.draft.title,
    tags: input.draft.tags.map((tag) => ({ category: tag.category, canonical_name: tag.canonicalName })),
    companies: input.draft.companies.map((row) => ({ company_id: row.companyId, role: row.role })),
    parentSignalId: input.draft.parentSignalId,
    fingerprint,
    extractionModelRunId: input.originModelRunId,
  });

  await insertSignalCandidateClaims({
    workspaceId: input.workspaceId,
    candidateId: candidate.id,
    claims: input.draft.claims,
  });
  return candidate;
}

async function validateAndMaybePromoteSignal(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  companyId: string;
  companyResolved: boolean;
  candidate: SignalCandidateRow;
  draft: SignalCandidateDraft;
  claims: SignalClaimContext[];
  provider: LanguageModelProvider;
  promote: PromoteSignalFn;
}): Promise<void> {
  if (input.candidate.status === "promoted" || input.candidate.status === "rejected") return;
  if (input.candidate.status !== "pending_validation") return;

  const existing = await listSignalValidations(input.candidate.id);
  if (existing.length > 0) return;

  const claimsById = new Map(input.claims.map((claim) => [claim.id, claim]));
  const fingerprints = await listActiveSignalFingerprints(input.workspaceId, input.companyId);
  const existingTitles = await listActiveSignalTitles(input.workspaceId, input.companyId);

  const deterministic = runSignalDeterministicValidators({
    draft: input.draft,
    companyId: input.companyId,
    companyExists: true,
    companyResolved: input.companyResolved,
    workspaceId: input.workspaceId,
    claimsById,
    existingFingerprints: fingerprints,
    sourceSnapshotId: input.sourceSnapshotId,
  });
  await insertSignalValidations({
    workspaceId: input.workspaceId,
    candidateId: input.candidate.id,
    records: deterministic,
  });

  let allValidations: ValidationRecord[] = [...deterministic];
  if (!hasBlockingSignalFailure(deterministic)) {
    const cited = input.draft.claims
      .map((link) => claimsById.get(link.claimId))
      .filter((row): row is SignalClaimContext => Boolean(row));
    const { run, parsed } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: {
        signal_candidate_id: input.candidate.id,
        claim_ids: cited.map((claim) => claim.id),
      },
      request: {
        taskType: "signal_validation",
        model: getValidationModel(),
        reasoningEffort: "low",
        promptVersion: SIGNAL_VALIDATION_PROMPT_VERSION,
        schemaVersion: SIGNAL_VALIDATION_SCHEMA_VERSION,
        schema: signalValidationOutputSchema,
        schemaName: "signal_validation",
        instructions: SIGNAL_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: serializeSignalValidationInput({
          draft: input.draft,
          claims: cited,
          existingTitles,
        }),
      },
    });
    const semantic = signalSemanticOutputToRecords(parsed, run.id);
    await insertSignalValidations({
      workspaceId: input.workspaceId,
      candidateId: input.candidate.id,
      records: semantic,
    });
    allValidations = [...allValidations, ...semantic];
  }

  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: input.draft.claims.some((link) => link.relationshipType === "primary_evidence"),
    companyResolved: input.companyResolved,
    signalType: String(input.draft.signalType),
    validations: allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;

  const grounding = signalGroundingLevel(allValidations);
  await updateSignalCandidateConfidence(
    input.candidate.id,
    grounding === "direct" || grounding === "supported" || grounding === "mixed" ? grounding : null,
  );

  await updateSignalCandidateOutcome({
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

async function summarizeSignalExtraction(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  claimCount: number;
  usedFakeProvider: boolean;
}): Promise<SignalExtractionSummary> {
  const candidates = await listSignalCandidatesForAnalysis(input.analysisId);
  const views: SignalCandidateView[] = [];
  const signalIds = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.company_id !== input.companyId) continue;
    const [claimLinks, validations] = await Promise.all([
      listSignalCandidateClaims(candidate.id),
      listSignalValidations(candidate.id),
    ]);
    if (candidate.promoted_signal_id) signalIds.add(candidate.promoted_signal_id);
    views.push({
      id: candidate.id,
      signalType: candidate.proposed_signal_type,
      title: candidate.proposed_title,
      summary: candidate.proposed_summary,
      status: candidate.status,
      importance: candidate.proposed_importance,
      assertionMode: candidate.proposed_assertion_mode,
      geography: candidate.proposed_geography,
      rejectionReasonCode: candidate.rejection_reason_code,
      rejectionReasonText: candidate.rejection_reason_text,
      originModelRunId: candidate.extraction_model_run_id,
      promotedSignalId: candidate.promoted_signal_id,
      claims: claimLinks.map((row) => ({
        claimId: row.claim_id,
        relationshipType: row.relationship_type as SignalCandidateView["claims"][number]["relationshipType"],
      })),
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
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    claimCount: input.claimCount,
    candidateCount: views.length,
    promotedCount: views.filter((row) => row.status === "promoted").length,
    needsReviewCount: views.filter((row) => row.status === "needs_review").length,
    rejectedCount: views.filter((row) => row.status === "rejected").length,
    signalCount: signalIds.size,
    candidates: views,
    usedFakeProvider: input.usedFakeProvider,
  };
}

export async function getSignalLabContext(): Promise<{
  companies: { id: string; displayName: string; slug: string }[];
  analyses: { id: string; title: string; status: string; companyId: string }[];
  runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]>;
  claimsByAnalysis: Record<string, { id: string; statement: string; assertionMode: string }[]>;
}> {
  await requireAdminUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const analyses = await analysisRepository.getRecentAnalyses(workspace.id, 40);
  const runsByAnalysis: Record<string, { id: string; status: string; createdAt: string }[]> = {};
  const claimsByAnalysis: Record<string, { id: string; statement: string; assertionMode: string }[]> = {};
  for (const analysis of analyses) {
    const runs = await researchRunRepository.listResearchRunsForAnalysis(workspace.id, analysis.id);
    runsByAnalysis[analysis.id] = runs.map((run) => ({
      id: run.id,
      status: run.status,
      createdAt: run.created_at,
    }));
    const claims = await listClaimsForSignalExtraction({
      workspaceId: workspace.id,
      companyId: analysis.company_id,
      analysisId: analysis.id,
    });
    claimsByAnalysis[analysis.id] = claims.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      assertionMode: claim.assertion_mode,
    }));
  }
  return {
    companies: companies.map((company) => ({
      id: company.id,
      displayName: company.display_name,
      slug: company.slug,
    })),
    analyses: analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      companyId: analysis.company_id,
    })),
    runsByAnalysis,
    claimsByAnalysis,
  };
}

export async function listExistingCandidatesForAnalysis(analysisId: string): Promise<SignalCandidateView[]> {
  const candidates = await listSignalCandidatesForAnalysis(analysisId);
  const views: SignalCandidateView[] = [];
  for (const candidate of candidates) {
    const [claimLinks, validations] = await Promise.all([
      listSignalCandidateClaims(candidate.id),
      listSignalValidations(candidate.id),
    ]);
    views.push({
      id: candidate.id,
      signalType: candidate.proposed_signal_type,
      title: candidate.proposed_title,
      summary: candidate.proposed_summary,
      status: candidate.status,
      importance: candidate.proposed_importance,
      assertionMode: candidate.proposed_assertion_mode,
      geography: candidate.proposed_geography,
      rejectionReasonCode: candidate.rejection_reason_code,
      rejectionReasonText: candidate.rejection_reason_text,
      originModelRunId: candidate.extraction_model_run_id,
      promotedSignalId: candidate.promoted_signal_id,
      claims: claimLinks.map((row) => ({
        claimId: row.claim_id,
        relationshipType: row.relationship_type as SignalCandidateView["claims"][number]["relationshipType"],
      })),
      validations: validations.map((row) => ({
        validatorCode: row.validator_code,
        result: row.result,
        severity: row.severity,
        message: row.message,
        supportLevel: row.details?.support_level,
      })),
    });
  }
  return views;
}
