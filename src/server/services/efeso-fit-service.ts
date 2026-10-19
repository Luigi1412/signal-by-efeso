import "server-only";
import {
  EFESO_FIT_VALIDATION_PROMPT_VERSION,
  EFESO_FIT_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { EFESO_FIT_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/efeso-fit-semantic-validation-v1";
import { efesoFitValidationOutputSchema } from "@/server/ai/schemas/efeso-fit-validation-schema";
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
import { serializeFitValidationInput } from "@/server/intelligence/extraction-input";
import { computeEfesoFitFingerprint } from "@/server/intelligence/fingerprint";
import { deriveEfesoFit } from "@/server/intelligence/fit-derivation";
import { hasBlockingIntelligenceFailure, runFitDeterministicValidators } from "@/server/intelligence/deterministic-validators";
import { loadAccountSignals } from "@/server/intelligence/load-signals";
import {
  findEfesoFitCandidateByFingerprint,
  insertEfesoFitCandidate,
  insertEfesoFitValidations,
  listEfesoFitCandidatesForCompany,
  listEfesoFitValidations,
  updateEfesoFitCandidateOutcome,
  type EfesoFitCandidateRow,
} from "@/server/intelligence/persistence";
import { decideEfesoFitCandidateStatus } from "@/server/intelligence/promotion-policy";
import { efesoFitSemanticOutputToRecords, passingEfesoFitValidation } from "@/server/intelligence/semantic-validators";
import { isOfferingObjectType } from "@/server/intelligence/taxonomy";
import { deriveAccountThemes } from "@/server/intelligence/themes";
import type { EfesoFitCandidateView, EfesoFitSummary, FitComponentDraft, KnowledgeFitTarget } from "@/server/intelligence/types";
import type { FitComponentType } from "@/server/intelligence/taxonomy";
import {
  getKnowledgeObject,
  listActiveKnowledgeObjects,
  listObjectRelations,
  listObjectTags,
} from "@/server/knowledge/persistence";
import { getCompanyRow, getSnapshotForRun, listCompaniesForWorkspace } from "@/server/signals/persistence";

export type PromoteEfesoFitFn = (candidateId: string) => Promise<string>;

export async function promoteEfesoFitCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_efeso_fit_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_efeso_fit_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("EFESO Fit promotion RPC returned no id.");
  return String(data);
}

export function createLabFakeFitProvider(count: number): FakeLanguageModelProvider {
  const items = Array.from({ length: Math.max(count, 1) }, () => ({
    kind: "output" as const,
    output: passingEfesoFitValidation(),
  }));
  return new FakeLanguageModelProvider(items);
}

function nestedTag(row: {
  tag_id: string;
  knowledge_tags: { category: string; canonical_name: string } | { category: string; canonical_name: string }[] | null;
}): { tagId: string; category: string; canonicalName: string } | null {
  const nested = Array.isArray(row.knowledge_tags) ? row.knowledge_tags[0] : row.knowledge_tags;
  if (!nested) return null;
  return { tagId: row.tag_id, category: nested.category, canonicalName: nested.canonical_name };
}

export async function loadKnowledgeFitTarget(workspaceId: string, objectId: string): Promise<KnowledgeFitTarget | null> {
  const object = await getKnowledgeObject(workspaceId, objectId);
  if (!object) return null;
  const [tags, relations] = await Promise.all([listObjectTags(object.id), listObjectRelations(object.id)]);
  const relatedIds = relations.map((row) => (row.source_object_id === object.id ? row.target_object_id : row.source_object_id));
  const related: KnowledgeFitTarget["relatedObjects"] = [];
  for (const relatedId of relatedIds) {
    const relatedObject = await getKnowledgeObject(workspaceId, relatedId);
    if (!relatedObject) continue;
    const relation = relations.find((row) => row.source_object_id === relatedId || row.target_object_id === relatedId);
    related.push({
      id: relatedObject.id,
      objectType: relatedObject.object_type,
      canonicalName: relatedObject.canonical_name,
      relationType: relation?.relation_type ?? "related_to",
    });
  }
  return {
    id: object.id,
    objectType: object.object_type,
    canonicalName: object.canonical_name,
    status: object.status,
    shortDescription: object.short_description,
    tags: tags.map(nestedTag).filter((row): row is NonNullable<typeof row> => Boolean(row)),
    relatedObjects: related,
    visibilityLevel: object.visibility_level ?? "efeso_member",
    confidentialityLevel: object.confidentiality_level ?? "internal",
    knowledgeNature: object.knowledge_nature ?? "institutional_fact",
    outcomeStatus: object.outcome_status ?? "not_applicable",
    approvedForMatching: object.approved_for_matching ?? true,
    origin: typeof object.metadata?.origin === "string" ? object.metadata.origin : null,
  };
}

export async function runEfesoFitForCompany(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  workspaceId?: string;
  useFakeProvider?: boolean;
  provider?: LanguageModelProvider;
  promote?: PromoteEfesoFitFn;
  pipelineActor?: boolean;
}): Promise<EfesoFitSummary> {
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
  const snapshot = await getSnapshotForRun(workspace.id, input.researchRunId);
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const themes = deriveAccountThemes(signals);
  const objects = await listActiveKnowledgeObjects(workspace.id);
  const hasRealKnowledge = objects.some(
    (object) => object.status === "active" && (object.metadata as { origin?: string } | null)?.origin !== "demo_seed",
  );
  const matchingObjects = objects.filter((object) => {
    if (object.status !== "active") return false;
    if (object.approved_for_matching === false) return false;
    if (hasRealKnowledge && (object.metadata as { origin?: string } | null)?.origin === "demo_seed") return false;
    return true;
  });
  const usedFake = Boolean(input.useFakeProvider) && !input.provider;
  const provider = input.provider ?? (usedFake ? createLabFakeFitProvider(matchingObjects.length) : getLanguageModelProvider());

  for (const object of matchingObjects) {
    const target = await loadKnowledgeFitTarget(workspace.id, object.id);
    if (!target) continue;
    const derivation = deriveEfesoFit({
      companyId: company.id,
      companyIndustry: company.industry,
      companyCountry: company.primary_country_code,
      signals,
      themes,
      knowledge: target,
    });
    if (derivation.fitScore <= 0 && !isOfferingObjectType(target.objectType)) continue;
    if (derivation.fitScore <= 0) continue;

    const fingerprint = computeEfesoFitFingerprint({
      companyId: company.id,
      knowledgeObjectId: target.id,
      components: derivation.components,
      signalIds: signals.map((signal) => signal.id),
    });
    let candidate = await findEfesoFitCandidateByFingerprint(workspace.id, company.id, target.id, fingerprint);
    if (!candidate) {
      candidate = await insertEfesoFitCandidate({
        workspaceId: workspace.id,
        companyId: company.id,
        knowledgeObjectId: target.id,
        analysisId: analysis.id,
        researchRunId: run.id,
        sourceSnapshotId: snapshot,
        components: derivation.components,
        rationale: derivation.rationale,
        fitLevel: derivation.fitLevel,
        fitScore: derivation.fitScore,
        fingerprint,
        modelRunId: null,
        matches: derivation.matches,
      });
    }
    await validateAndMaybePromoteFit({
      workspaceId: workspace.id,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      companyId: company.id,
      companyName: company.display_name,
      companyIndustry: company.industry,
      candidate,
      target,
      derivation,
      signals,
      provider,
      promote: input.promote ?? promoteEfesoFitCandidateViaSessionRpc,
    });
  }

  return summarizeFit({
    companyId: input.companyId,
    analysisId: analysis.id,
    researchRunId: run.id,
    knowledgeCount: objects.length,
    usedFakeProvider: usedFake || provider.name === "fake",
  });
}

async function validateAndMaybePromoteFit(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  candidate: EfesoFitCandidateRow;
  target: KnowledgeFitTarget;
  derivation: ReturnType<typeof deriveEfesoFit>;
  signals: Awaited<ReturnType<typeof loadAccountSignals>>;
  provider: LanguageModelProvider;
  promote: PromoteEfesoFitFn;
}): Promise<void> {
  if (input.candidate.status === "promoted" || input.candidate.status === "rejected") return;
  if (input.candidate.status === "validated") {
    await input.promote(input.candidate.id);
    return;
  }
  if (input.candidate.status !== "pending_validation") return;
  const existing = await listEfesoFitValidations(input.candidate.id);
  if (existing.length > 0) return;

  const deterministic = runFitDeterministicValidators({
    companyExists: true,
    knowledgeActive: input.target.status === "active",
    knowledgeObjectType: input.target.objectType,
    signalsActive: input.signals.every((signal) => signal.status === "active"),
    components: input.derivation.components,
    proposedFitLevel: input.candidate.proposed_fit_level,
    derivedFitLevel: input.derivation.fitLevel,
    proposedFitScore: input.candidate.proposed_fit_score,
    derivedFitScore: input.derivation.fitScore,
  });
  await insertEfesoFitValidations({
    workspaceId: input.workspaceId,
    candidateId: input.candidate.id,
    records: deterministic,
  });

  let allValidations: ValidationRecord[] = [...deterministic];
  if (!hasBlockingIntelligenceFailure(deterministic)) {
    const { run, parsed } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: { efeso_fit_candidate_id: input.candidate.id },
      request: {
        taskType: "efeso_fit_validation",
        model: getValidationModel(),
        reasoningEffort: "low",
        promptVersion: EFESO_FIT_VALIDATION_PROMPT_VERSION,
        schemaVersion: EFESO_FIT_VALIDATION_SCHEMA_VERSION,
        schema: efesoFitValidationOutputSchema,
        schemaName: "efeso_fit_validation",
        instructions: EFESO_FIT_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: JSON.stringify(
          serializeFitValidationInput({
            company: { id: input.companyId, displayName: input.companyName, industry: input.companyIndustry },
            knowledge: input.target,
            derivation: input.derivation,
            signals: input.signals,
          }),
        ),
      },
    });
    const semantic = efesoFitSemanticOutputToRecords(parsed, run.id, input.derivation.fitLevel);
    await insertEfesoFitValidations({
      workspaceId: input.workspaceId,
      candidateId: input.candidate.id,
      records: semantic,
    });
    allValidations = [...allValidations, ...semantic];
  }

  const decision = decideEfesoFitCandidateStatus({
    knowledgeActive: input.target.status === "active",
    signalsActive: input.signals.every((signal) => signal.status === "active"),
    derivedFitScore: input.derivation.fitScore,
    validations: allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;
  await updateEfesoFitCandidateOutcome({
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

async function summarizeFit(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  knowledgeCount: number;
  usedFakeProvider: boolean;
}): Promise<EfesoFitSummary> {
  const candidates = await listExistingEfesoFitCandidates(input.companyId);
  return {
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    knowledgeCount: input.knowledgeCount,
    candidateCount: candidates.length,
    promotedCount: candidates.filter((row) => row.status === "promoted").length,
    needsReviewCount: candidates.filter((row) => row.status === "needs_review").length,
    rejectedCount: candidates.filter((row) => row.status === "rejected").length,
    usedFakeProvider: input.usedFakeProvider,
    candidates,
  };
}

function normalizeProposedComponents(raw: unknown): FitComponentDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const componentType = String(row.componentType ?? row.component_type ?? "");
    const componentValue = String(row.componentValue ?? row.component_value ?? "");
    if (!componentType || !componentValue) return [];
    return [
      {
        componentType: componentType as FitComponentType,
        componentValue,
        contribution: Number(row.contribution ?? 0),
        explanation: String(row.explanation ?? ""),
        sourceType: String(row.sourceType ?? row.source_type ?? "knowledge_object") as FitComponentDraft["sourceType"],
        sourceId: row.sourceId != null || row.source_id != null ? String(row.sourceId ?? row.source_id) : null,
      },
    ];
  });
}

export async function listExistingEfesoFitCandidates(companyId: string): Promise<EfesoFitCandidateView[]> {
  const rows = await listEfesoFitCandidatesForCompany(companyId);
  const views: EfesoFitCandidateView[] = [];
  for (const row of rows) {
    const validations = await listEfesoFitValidations(row.id);
    const components = normalizeProposedComponents(row.proposed_components);
    views.push({
      id: row.id,
      companyId: row.company_id,
      knowledgeObjectId: row.knowledge_object_id,
      knowledgeName: row.knowledge_object_id,
      proposedFitLevel: row.proposed_fit_level,
      proposedFitScore: row.proposed_fit_score,
      proposedRationale: row.proposed_rationale,
      status: row.status,
      fingerprint: row.candidate_fingerprint,
      rejectionReasonCode: row.rejection_reason_code,
      rejectionReasonText: row.rejection_reason_text,
      promotedId: row.promoted_fit_id,
      components,
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

export async function getEfesoFitLabContext() {
  await requireAdminUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const analyses = await analysisRepository.getRecentAnalyses(workspace.id, 40);
  const objects = await listActiveKnowledgeObjects(workspace.id);
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
    knowledgeObjects: objects.map((object) => ({
      id: object.id,
      name: object.canonical_name,
      objectType: object.object_type,
      status: object.status,
    })),
  };
}
