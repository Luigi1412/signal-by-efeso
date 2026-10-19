import "server-only";
import {
  OPPORTUNITY_EXTRACTION_PROMPT_VERSION,
  OPPORTUNITY_EXTRACTION_SCHEMA_VERSION,
  OPPORTUNITY_VALIDATION_PROMPT_VERSION,
  OPPORTUNITY_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getExtractionModel, getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { OPPORTUNITY_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/opportunity-extraction-v1";
import { OPPORTUNITY_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/opportunity-semantic-validation-v1";
import { opportunityExtractionOutputSchema } from "@/server/ai/schemas/opportunity-extraction-schema";
import { opportunityValidationOutputSchema } from "@/server/ai/schemas/opportunity-validation-schema";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import { FakeLanguageModelProvider } from "@/server/ai/providers/fake-language-model-provider";
import { executeStructuredModelRun } from "@/server/extraction/model-run-service";
import { canTransition } from "@/server/extraction/promotion-policy";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAdminUserId } from "@/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { getActiveAccountIntelligence, listActiveEfesoFitsForCompany } from "@/server/intelligence/persistence";
import { loadAccountSignals } from "@/server/intelligence/load-signals";
import { deriveAccountThemes } from "@/server/intelligence/themes";
import { detectAccountTensions } from "@/server/intelligence/tensions";
import { loadKnowledgeFitTarget } from "@/server/services/efeso-fit-service";
import { getAccountIntelligenceLabContext } from "@/server/services/account-intelligence-service";
import { getKnowledgeObject, listActiveKnowledgeObjects } from "@/server/knowledge/persistence";
import { getCompanyRow, getSnapshotForRun, listSignalsForCompany } from "@/server/signals/persistence";
import {
  hasBlockingOpportunityFailure,
  runOpportunityDeterministicValidators,
} from "@/server/opportunities/deterministic-validators";
import {
  deriveOpportunityConfidence,
  deriveOpportunityMaturity,
  deriveOpportunityRelevance,
  deriveOpportunityUrgency,
  fitAlignsWithType,
  themeAligns,
} from "@/server/opportunities/derivation";
import { draftToExtractionOutput, serializeOpportunityInput, serializeOpportunityValidationInput } from "@/server/opportunities/extraction-input";
import { fingerprintFromDraft, normalizeCoreHypothesis } from "@/server/opportunities/fingerprint";
import {
  findOpportunityCandidateByFingerprint,
  insertOpportunityCandidate,
  insertOpportunityValidations,
  listActiveOpportunityFingerprints,
  listActiveOpportunityHypotheses,
  listOpportunityCandidatesForCompany,
  listOpportunityValidations,
  updateOpportunityCandidateOutcome,
  type OpportunityCandidateRow,
} from "@/server/opportunities/persistence";
import { proposeOpportunityDrafts } from "@/server/opportunities/propose";
import { decideOpportunityCandidateStatus } from "@/server/opportunities/promotion-policy";
import {
  opportunitySemanticOutputToRecords,
  passingOpportunityValidation,
} from "@/server/opportunities/semantic-validators";
import { hasHypothesisLanguage } from "@/server/opportunities/commercial-language";
import type {
  ActiveFitInput,
  OpportunityCandidateView,
  OpportunityDraft,
  OpportunityLabCompanyContext,
  OpportunitySummary,
} from "@/server/opportunities/types";
import type { OpportunityRationaleDraft } from "@/server/opportunities/types";

export type PromoteOpportunityFn = (candidateId: string) => Promise<string>;

export async function promoteOpportunityCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_opportunity_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_opportunity_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Opportunity promotion RPC returned no id.");
  return String(data);
}

export function createLabFakeOpportunityProvider(drafts: OpportunityDraft[]): FakeLanguageModelProvider {
  const items = drafts.flatMap((draft) => [
    { kind: "output" as const, output: draftToExtractionOutput(draft) },
    { kind: "output" as const, output: passingOpportunityValidation() },
  ]);
  return new FakeLanguageModelProvider(items);
}

async function loadFits(workspaceId: string, companyId: string): Promise<ActiveFitInput[]> {
  const rows = await listActiveEfesoFitsForCompany(workspaceId, companyId);
  const fits: ActiveFitInput[] = [];
  for (const row of rows) {
    const target = await loadKnowledgeFitTarget(workspaceId, row.knowledge_object_id);
    if (!target) continue;
    fits.push({
      id: row.id,
      companyId: row.company_id,
      workspaceId: row.workspace_id,
      knowledgeObjectId: row.knowledge_object_id,
      knowledgeName: target.canonicalName,
      knowledgeType: target.objectType,
      knowledgeStatus: target.status,
      status: row.status,
      fitLevel: row.fit_level,
      fitScore: row.fit_score,
      fitReasonSummary: row.fit_reason_summary,
      relatedCases: target.relatedObjects
        .filter((object) => object.objectType === "case")
        .map((object) => ({ id: object.id, name: object.canonicalName, status: "active" })),
      relatedMethodologies: target.relatedObjects
        .filter((object) => object.objectType === "methodology")
        .map((object) => ({ id: object.id, name: object.canonicalName, status: "active" })),
      tags: target.tags.map((tag) => ({ category: tag.category, canonicalName: tag.canonicalName })),
    });
  }
  return fits;
}

export async function runOpportunitiesForCompany(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  workspaceId?: string;
  useFakeProvider?: boolean;
  provider?: LanguageModelProvider;
  promote?: PromoteOpportunityFn;
  pipelineActor?: boolean;
}): Promise<OpportunitySummary> {
  if (!input.pipelineActor) {
    if (!isControlledExtractionEnabled()) throw new ControlledExtractionDisabledError();
    await requireAdminUserId();
  }
  if (!isSupabaseConfigured()) throw new PersistenceUnavailableError();
  const workspace = input.pipelineActor && input.workspaceId
    ? await workspaceRepository.getWorkspaceByIdForPipeline(input.workspaceId)
    : await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();

  const analysis = input.pipelineActor
    ? await analysisRepository.getAnalysisByIdForPipeline(workspace.id, input.analysisId)
    : await analysisRepository.getAnalysisById(workspace.id, input.analysisId);
  if (!analysis) throw new Error("ANALYSIS_NOT_FOUND");
  if (analysis.company_id !== input.companyId) throw new Error("COMPANY_ANALYSIS_MISMATCH");
  const run = input.pipelineActor
    ? await researchRunRepository.getResearchRunForPipeline(workspace.id, input.researchRunId)
    : await researchRunRepository.getResearchRun(workspace.id, input.researchRunId);
  if (!run || run.analysis_id !== analysis.id) throw new Error("RESEARCH_RUN_NOT_FOUND");
  const company = await getCompanyRow(workspace.id, input.companyId);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  const allSignals = await loadAccountSignals(workspace.id, input.companyId);
  const signals = allSignals.filter((signal) => signal.status === "active");
  if (signals.length === 0) throw new Error("SIGNALS_NOT_FOUND");
  const fits = await loadFits(workspace.id, input.companyId);
  if (fits.length === 0) throw new Error("FITS_NOT_FOUND");

  const snapshot = await getSnapshotForRun(workspace.id, input.researchRunId);
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const intelligenceRow = await getActiveAccountIntelligence(workspace.id, input.companyId);
  const themes = deriveAccountThemes(signals);
  const tensions = detectAccountTensions(signals);
  const knowledgeRows = (await listActiveKnowledgeObjects(workspace.id)).filter((row) => row.status === "active");
  const knowledge = [];
  for (const row of knowledgeRows) {
    const target = await loadKnowledgeFitTarget(workspace.id, row.id);
    if (target) knowledge.push(target);
  }

  const derivationInput = {
    companyId: input.companyId,
    companyExists: true,
    companyResolved: company.resolution_status === "resolved",
    workspaceId: workspace.id,
    signals,
    themes,
    tensions: tensions.map((tension) => ({ tensionType: tension.tensionType, explanation: tension.explanation })),
    accountIntelligence: intelligenceRow
      ? {
          id: intelligenceRow.id,
          companyId: intelligenceRow.company_id,
          status: intelligenceRow.status,
          headline: intelligenceRow.headline,
          executiveSummary: intelligenceRow.executive_summary,
        }
      : null,
    fits,
    knowledge,
  };
  const drafts = proposeOpportunityDrafts(derivationInput);
  const usedFake = Boolean(input.useFakeProvider) && !input.provider;
  const provider =
    input.provider ?? (usedFake ? createLabFakeOpportunityProvider(drafts) : getLanguageModelProvider());

  for (const draft of drafts) {
    const { run: modelRun, parsed } = await executeStructuredModelRun({
      workspaceId: workspace.id,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      provider,
      inputManifest: {
        company_id: input.companyId,
        signal_ids: draft.signalLinks.map((link) => link.signalId),
        fit_ids: draft.fitLinks.map((link) => link.efesoFitId),
        opportunity_type: draft.opportunityType,
      },
      request: {
        taskType: "opportunity_generation",
        model: getExtractionModel(),
        reasoningEffort: "low",
        promptVersion: OPPORTUNITY_EXTRACTION_PROMPT_VERSION,
        schemaVersion: OPPORTUNITY_EXTRACTION_SCHEMA_VERSION,
        schema: opportunityExtractionOutputSchema,
        schemaName: "opportunity_extraction",
        instructions: OPPORTUNITY_EXTRACTION_INSTRUCTIONS,
        input: JSON.stringify(serializeOpportunityInput(derivationInput)),
      },
    });
    const merged = mergeDraft(draft, parsed.title, parsed.summary, parsed.rationale, parsed.uncertainty);
    const primaryFit = fits.find((fit) => fit.id === merged.primaryEfesoFitId) ?? null;
    const fingerprint = fingerprintFromDraft(input.companyId, merged, primaryFit?.knowledgeName ?? null);
    let candidate = await findOpportunityCandidateByFingerprint(workspace.id, input.companyId, fingerprint);
    if (!candidate) {
      candidate = await insertOpportunityCandidate({
        workspaceId: workspace.id,
        companyId: input.companyId,
        analysisId: analysis.id,
        researchRunId: run.id,
        sourceSnapshotId: snapshot,
        draft: merged,
        fingerprint,
        generationModelRunId: modelRun.id,
        metadata: { origin: usedFake || provider.name === "fake" ? "lab_fake" : "pipeline" },
      });
    }
    await validateAndMaybePromoteOpportunity({
      workspaceId: workspace.id,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      companyId: input.companyId,
      companyResolved: company.resolution_status === "resolved",
      candidate,
      draft: merged,
      signals,
      fits,
      knowledge,
      themes,
      provider,
      promote: input.promote ?? promoteOpportunityCandidateViaSessionRpc,
    });
  }

  return summarizeOpportunities({
    companyId: input.companyId,
    analysisId: analysis.id,
    researchRunId: run.id,
    signalCount: signals.length,
    fitCount: fits.length,
    usedFakeProvider: usedFake || provider.name === "fake",
  });
}

function mergeDraft(
  base: OpportunityDraft,
  title: string,
  summary: string,
  rationale: string,
  uncertainty: string,
): OpportunityDraft {
  const nextTitle = hasHypothesisLanguage(title) ? title.trim() : base.title;
  const nextSummary = summary.trim() || base.summary;
  const rationaleBlocks = base.rationaleBlocks.map((block) =>
    block.rationaleType === "uncertainty" && uncertainty.trim()
      ? { ...block, statement: uncertainty.trim() }
      : block,
  );
  return {
    ...base,
    title: nextTitle,
    summary: nextSummary,
    rationale: rationale.trim() || base.rationale,
    rationaleBlocks,
  };
}

async function validateAndMaybePromoteOpportunity(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  companyId: string;
  companyResolved: boolean;
  candidate: OpportunityCandidateRow;
  draft: OpportunityDraft;
  signals: Awaited<ReturnType<typeof loadAccountSignals>>;
  fits: ActiveFitInput[];
  knowledge: Awaited<ReturnType<typeof loadKnowledgeFitTarget>>[];
  themes: ReturnType<typeof deriveAccountThemes>;
  provider: LanguageModelProvider;
  promote: PromoteOpportunityFn;
}): Promise<void> {
  if (input.candidate.status === "promoted" || input.candidate.status === "rejected") return;
  if (input.candidate.status !== "pending_validation") return;
  const existing = await listOpportunityValidations(input.candidate.id);
  if (existing.length > 0) return;

  const triggerSignals = input.signals.filter((signal) =>
    input.draft.signalLinks.some((link) => link.signalId === signal.id && link.relationshipType === "trigger"),
  );
  const related = input.signals.filter((signal) =>
    input.draft.signalLinks.some((link) => link.signalId === signal.id),
  );
  const primaryFit = input.fits.find((fit) => fit.id === input.draft.primaryEfesoFitId);
  const derivedMaturity = deriveOpportunityMaturity({
    triggerSignals,
    relatedSignals: related,
    themeCount: themeAligns(input.themes, input.draft.opportunityType) ? 1 : 0,
    fitLevel: primaryFit?.fitLevel ?? "low",
    hasAccountIntelligence: Boolean(input.draft.accountIntelligenceId),
    explicitProgram: triggerSignals.some((signal) =>
      ["restructuring", "sustainability_program", "cost_reduction_program", "production_ramp_up"].includes(signal.signalType),
    ),
    claimCount: related.reduce((sum, signal) => sum + signal.claims.length, 0),
  });
  const derivedRelevance = deriveOpportunityRelevance({
    fitLevel: primaryFit?.fitLevel ?? "low",
    triggerSignals,
    themeAligned: themeAligns(input.themes, input.draft.opportunityType),
    supportingCaseCount: primaryFit?.relatedCases.length ?? 0,
    knowledgeCoverage: input.draft.knowledgeLinks.length,
    typeAligned: primaryFit ? fitAlignsWithType(primaryFit, input.draft.opportunityType) : false,
  });
  const derivedUrgency = deriveOpportunityUrgency({ triggerSignals });
  const derivedConfidence = deriveOpportunityConfidence({
    triggerSignals,
    relatedSignals: related,
    fitLevel: primaryFit?.fitLevel ?? "low",
    themeAligned: themeAligns(input.themes, input.draft.opportunityType),
    opportunityType: input.draft.opportunityType,
  });
  input.draft.maturity = derivedMaturity;
  input.draft.relevanceLevel = derivedRelevance;
  input.draft.urgencyLevel = derivedUrgency;
  input.draft.confidenceTier = derivedConfidence;

  const fingerprints = await listActiveOpportunityFingerprints(input.workspaceId, input.companyId);
  const similar = (await listActiveOpportunityHypotheses(input.workspaceId, input.companyId)).map((text) =>
    normalizeCoreHypothesis(text),
  );
  const deterministic = runOpportunityDeterministicValidators({
    companyId: input.companyId,
    companyExists: true,
    companyResolved: input.companyResolved,
    workspaceId: input.workspaceId,
    draft: input.draft,
    signals: input.signals,
    fits: input.fits,
    knowledge: input.knowledge.filter((row): row is NonNullable<typeof row> => Boolean(row)),
    derivedMaturity,
    derivedRelevance,
    derivedUrgency,
    derivedConfidence,
    existingFingerprints: fingerprints.filter((value) => value !== input.candidate.candidate_fingerprint),
    similarHypothesisFingerprints: similar.filter(
      (value) => value !== normalizeCoreHypothesis(`${input.draft.title} ${input.draft.summary}`),
    ),
  });
  await insertOpportunityValidations({
    workspaceId: input.workspaceId,
    candidateId: input.candidate.id,
    records: deterministic,
  });

  let allValidations: ValidationRecord[] = [...deterministic];
  if (!hasBlockingOpportunityFailure(deterministic)) {
    const { run, parsed } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: { opportunity_candidate_id: input.candidate.id },
      request: {
        taskType: "opportunity_validation",
        model: getValidationModel(),
        reasoningEffort: "low",
        promptVersion: OPPORTUNITY_VALIDATION_PROMPT_VERSION,
        schemaVersion: OPPORTUNITY_VALIDATION_SCHEMA_VERSION,
        schema: opportunityValidationOutputSchema,
        schemaName: "opportunity_validation",
        instructions: OPPORTUNITY_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: JSON.stringify(serializeOpportunityValidationInput(input.draft)),
      },
    });
    const semantic = opportunitySemanticOutputToRecords(parsed, run.id, {
      relevance: derivedRelevance,
      urgency: derivedUrgency,
      maturity: derivedMaturity,
      confidence: derivedConfidence,
    });
    await insertOpportunityValidations({
      workspaceId: input.workspaceId,
      candidateId: input.candidate.id,
      records: semantic,
    });
    allValidations = [...allValidations, ...semantic];
  }

  const triggerActive = triggerSignals.length > 0 && triggerSignals.every((signal) => signal.status === "active");
  const primaryFitActive = Boolean(primaryFit && primaryFit.status === "active" && primaryFit.knowledgeStatus === "active");
  const uncertaintyPreserved = input.draft.rationaleBlocks.some((block) => block.rationaleType === "uncertainty" && block.statement.trim());
  const commercialOverreach = allValidations.some(
    (row) =>
      (row.validatorCode === "commercial_overreach" || row.validatorCode === "commercial_language_detection") &&
      row.result === "fail",
  );
  const decision = decideOpportunityCandidateStatus({
    triggerActive,
    primaryFitActive,
    companyResolved: input.companyResolved,
    opportunityTypeOther: input.draft.opportunityType === "other",
    commercialOverreach,
    uncertaintyPreserved,
    validations: allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;
  await updateOpportunityCandidateOutcome({
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

async function summarizeOpportunities(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  signalCount: number;
  fitCount: number;
  usedFakeProvider: boolean;
}): Promise<OpportunitySummary> {
  const candidates = await listExistingOpportunityCandidates(input.companyId);
  return {
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    signalCount: input.signalCount,
    fitCount: input.fitCount,
    candidateCount: candidates.length,
    promotedCount: candidates.filter((row) => row.status === "promoted").length,
    needsReviewCount: candidates.filter((row) => row.status === "needs_review").length,
    rejectedCount: candidates.filter((row) => row.status === "rejected").length,
    usedFakeProvider: input.usedFakeProvider,
    candidates,
  };
}

export async function listExistingOpportunityCandidates(companyId: string): Promise<OpportunityCandidateView[]> {
  const rows = await listOpportunityCandidatesForCompany(companyId);
  const views: OpportunityCandidateView[] = [];
  for (const row of rows) {
    const validations = await listOpportunityValidations(row.id);
    const blocks = Array.isArray(row.proposed_rationale_blocks) ? row.proposed_rationale_blocks : [];
    views.push({
      id: row.id,
      companyId: row.company_id,
      title: row.proposed_title,
      summary: row.proposed_summary,
      opportunityType: row.proposed_opportunity_type,
      maturity: row.proposed_maturity,
      relevanceLevel: row.proposed_relevance_level,
      urgencyLevel: row.proposed_urgency_level,
      confidenceTier: row.proposed_confidence_tier,
      status: row.status,
      fingerprint: row.candidate_fingerprint,
      originModelRunId: row.generation_model_run_id,
      rejectionReasonCode: row.rejection_reason_code,
      rejectionReasonText: row.rejection_reason_text,
      promotedId: row.promoted_opportunity_id,
      rationale: row.proposed_rationale,
      rationaleBlocks: blocks.map((block) => {
        const rowBlock = block as {
          rationale_type?: string;
          statement?: string;
          source_type?: string | null;
          source_id?: string | null;
        };
        return {
          rationaleType: (rowBlock.rationale_type ?? "uncertainty") as OpportunityRationaleDraft["rationaleType"],
          statement: rowBlock.statement ?? "",
          sourceType: rowBlock.source_type ?? null,
          sourceId: rowBlock.source_id ?? null,
        };
      }),
      validations: validations.map((item) => ({
        validatorCode: item.validator_code,
        validatorVersion: item.validator_version,
        validatorType: item.validator_type as ValidationRecord["validatorType"],
        result: item.result as ValidationRecord["result"],
        severity: item.severity as ValidationRecord["severity"],
        message: item.message,
        details: item.details,
        modelRunId: item.model_run_id,
      })),
    });
  }
  return views;
}

export async function getOpportunityLabContext() {
  const base = await getAccountIntelligenceLabContext();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const contexts: Record<string, OpportunityLabCompanyContext> = {};
  const existingByCompany: Record<string, OpportunityCandidateView[]> = {};
  for (const company of base.companies) {
    const intelligence = await getActiveAccountIntelligence(workspace.id, company.id);
    const signals = await listSignalsForCompany(workspace.id, company.id);
    const fits = await listActiveEfesoFitsForCompany(workspace.id, company.id);
    const fitViews: OpportunityLabCompanyContext["fits"] = [];
    for (const fit of fits) {
      const knowledge = await getKnowledgeObject(workspace.id, fit.knowledge_object_id);
      fitViews.push({
        id: fit.id,
        knowledgeName: knowledge?.canonical_name ?? fit.knowledge_object_id,
        fitLevel: fit.fit_level,
        status: fit.status,
      });
    }
    contexts[company.id] = {
      accountIntelligence: intelligence
        ? {
            headline: intelligence.headline,
            status: intelligence.status,
            summary: intelligence.executive_summary,
          }
        : null,
      signals: signals.map((signal) => ({
        id: signal.id,
        title: signal.title,
        signalType: signal.signal_type,
        status: signal.status,
      })),
      fits: fitViews,
    };
    existingByCompany[company.id] = await listExistingOpportunityCandidates(company.id);
  }
  return { ...base, contexts, existingByCompany };
}
