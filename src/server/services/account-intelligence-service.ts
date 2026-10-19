import "server-only";
import {
  ACCOUNT_INTELLIGENCE_EXTRACTION_PROMPT_VERSION,
  ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION,
  ACCOUNT_INTELLIGENCE_VALIDATION_PROMPT_VERSION,
  ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getExtractionModel, getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { ACCOUNT_INTELLIGENCE_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/account-intelligence-extraction-v1";
import { ACCOUNT_INTELLIGENCE_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/account-intelligence-semantic-validation-v1";
import { accountIntelligenceExtractionOutputSchema } from "@/server/ai/schemas/account-intelligence-extraction-schema";
import { accountIntelligenceValidationOutputSchema } from "@/server/ai/schemas/account-intelligence-validation-schema";
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
import {
  hasBlockingIntelligenceFailure,
  runAccountIntelligenceDeterministicValidators,
} from "@/server/intelligence/deterministic-validators";
import {
  extractionToNarrative,
  narrativeToExtractionOutput,
  serializeAccountIntelligenceInput,
  serializeAccountIntelligenceValidationInput,
} from "@/server/intelligence/extraction-input";
import { computeAccountIntelligenceFingerprint } from "@/server/intelligence/fingerprint";
import { loadAccountSignals } from "@/server/intelligence/load-signals";
import { buildDeterministicNarrative } from "@/server/intelligence/narrative";
import {
  findAccountIntelligenceCandidateByFingerprint,
  insertAccountIntelligenceCandidate,
  insertAccountIntelligenceValidations,
  listAccountIntelligenceCandidatesForCompany,
  listAccountIntelligenceValidations,
  listActiveAccountIntelligenceFingerprints,
  updateAccountIntelligenceCandidateOutcome,
  type AccountIntelligenceCandidateRow,
} from "@/server/intelligence/persistence";
import { decideAccountIntelligenceCandidateStatus } from "@/server/intelligence/promotion-policy";
import {
  accountIntelligenceSemanticOutputToRecords,
  passingAccountIntelligenceValidation,
} from "@/server/intelligence/semantic-validators";
import { deriveAccountThemes } from "@/server/intelligence/themes";
import { detectAccountTensions } from "@/server/intelligence/tensions";
import type {
  AccountIntelligenceCandidateView,
  AccountIntelligenceSummary,
  AccountNarrativeDraft,
  AccountSignalInput,
} from "@/server/intelligence/types";
import { rankSignalsForNarrative } from "@/server/intelligence/weight";
import { getCompanyRow, getSnapshotForRun, listCompaniesForWorkspace } from "@/server/signals/persistence";

export type PromoteAccountIntelligenceFn = (candidateId: string) => Promise<string>;

export async function promoteAccountIntelligenceCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_account_intelligence_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_account_intelligence_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Account intelligence promotion RPC returned no id.");
  return String(data);
}

export function createLabFakeAccountIntelligenceProvider(draft: AccountNarrativeDraft): FakeLanguageModelProvider {
  return new FakeLanguageModelProvider([
    { kind: "output", output: narrativeToExtractionOutput(draft) },
    { kind: "output", output: passingAccountIntelligenceValidation() },
  ]);
}

export async function runAccountIntelligenceForCompany(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  workspaceId?: string;
  useFakeProvider?: boolean;
  provider?: LanguageModelProvider;
  promote?: PromoteAccountIntelligenceFn;
  pipelineActor?: boolean;
}): Promise<AccountIntelligenceSummary> {
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

  const sourceSnapshotId =
    signals.find((signal) => Boolean(signal.claims.length)) ? await getSnapshotForRun(workspace.id, input.researchRunId) : await getSnapshotForRun(workspace.id, input.researchRunId);
  const snapshot = sourceSnapshotId ?? (await fallbackSnapshotFromSignals(workspace.id, input.researchRunId));
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const themes = deriveAccountThemes(signals);
  const tensions = detectAccountTensions(signals);
  const signalLinks = rankSignalsForNarrative(signals);
  const deterministicDraft = buildDeterministicNarrative({ companyName: company.display_name, signals });

  const usedFake = Boolean(input.useFakeProvider) && !input.provider;
  const provider =
    input.provider ?? (usedFake ? createLabFakeAccountIntelligenceProvider(deterministicDraft) : getLanguageModelProvider());

  const { run: modelRun, parsed } = await executeStructuredModelRun({
    workspaceId: workspace.id,
    analysisId: analysis.id,
    researchRunId: run.id,
    sourceSnapshotId: snapshot,
    provider,
    inputManifest: {
      company_id: input.companyId,
      signal_ids: signals.map((signal) => signal.id),
      signal_count: signals.length,
    },
    request: {
      taskType: "account_intelligence_generation",
      model: getExtractionModel(),
      reasoningEffort: "low",
      promptVersion: ACCOUNT_INTELLIGENCE_EXTRACTION_PROMPT_VERSION,
      schemaVersion: ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION,
      schema: accountIntelligenceExtractionOutputSchema,
      schemaName: "account_intelligence_extraction",
      instructions: ACCOUNT_INTELLIGENCE_EXTRACTION_INSTRUCTIONS,
      input: JSON.stringify(
        serializeAccountIntelligenceInput({
          company: {
            id: company.id,
            displayName: company.display_name,
            industry: company.industry,
            countryCode: company.primary_country_code,
          },
          signals,
          themes,
          tensions,
        }),
      ),
    },
  });

  const draft = mergeNarrative(deterministicDraft, extractionToNarrative(parsed));
  const fingerprint = computeAccountIntelligenceFingerprint({ companyId: input.companyId, signals });
  let candidate = await findAccountIntelligenceCandidateByFingerprint(workspace.id, input.companyId, fingerprint);
  if (!candidate) {
    candidate = await insertAccountIntelligenceCandidate({
      workspaceId: workspace.id,
      companyId: input.companyId,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      draft,
      tensions,
      themes,
      signalLinks,
      fingerprint,
      extractionModelRunId: modelRun.id,
      metadata: { origin: usedFake || provider.name === "fake" ? "lab_fake" : "pipeline" },
    });
  }

  await validateAndMaybePromoteAccountIntelligence({
    workspaceId: workspace.id,
    analysisId: analysis.id,
    researchRunId: run.id,
    sourceSnapshotId: snapshot,
    companyResolved: company.resolution_status === "resolved",
    companyId: input.companyId,
    candidate,
    draft,
    signals,
    themes,
    tensions,
    signalLinks,
    provider,
    promote: input.promote ?? promoteAccountIntelligenceCandidateViaSessionRpc,
  });

  return summarizeAccountIntelligence({
    companyId: input.companyId,
    analysisId: analysis.id,
    researchRunId: run.id,
    signalCount: signals.length,
    usedFakeProvider: usedFake || provider.name === "fake",
  });
}

async function fallbackSnapshotFromSignals(workspaceId: string, researchRunId: string): Promise<string | null> {
  return getSnapshotForRun(workspaceId, researchRunId);
}

function mergeNarrative(base: AccountNarrativeDraft, proposed: AccountNarrativeDraft): AccountNarrativeDraft {
  const pick = (fallback: string | null, next: string | null) => (next && next.trim() ? next.trim() : fallback);
  const sections = { ...base.sections };
  for (const [key, value] of Object.entries(proposed.sections)) {
    if (value?.trim() && base.sections[key as keyof typeof base.sections]) {
      sections[key as keyof typeof sections] = value.trim();
    }
  }
  return {
    headline: pick(base.headline, proposed.headline) ?? base.headline,
    executiveSummary: pick(base.executiveSummary, proposed.executiveSummary) ?? base.executiveSummary,
    strategicDirection: pick(base.strategicDirection, proposed.strategicDirection),
    pressureSummary: pick(base.pressureSummary, proposed.pressureSummary),
    investmentSummary: pick(base.investmentSummary, proposed.investmentSummary),
    operatingContextSummary: pick(base.operatingContextSummary, proposed.operatingContextSummary),
    riskSummary: pick(base.riskSummary, proposed.riskSummary),
    changeSummary: pick(base.changeSummary, proposed.changeSummary),
    sections,
    periodStart: proposed.periodStart ?? base.periodStart,
    periodEnd: proposed.periodEnd ?? base.periodEnd,
  };
}

async function validateAndMaybePromoteAccountIntelligence(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  companyId: string;
  companyResolved: boolean;
  candidate: AccountIntelligenceCandidateRow;
  draft: AccountNarrativeDraft;
  signals: AccountSignalInput[];
  themes: ReturnType<typeof deriveAccountThemes>;
  tensions: ReturnType<typeof detectAccountTensions>;
  signalLinks: ReturnType<typeof rankSignalsForNarrative>;
  provider: LanguageModelProvider;
  promote: PromoteAccountIntelligenceFn;
}): Promise<void> {
  if (input.candidate.status === "promoted" || input.candidate.status === "rejected") return;
  if (input.candidate.status !== "pending_validation") return;
  const existing = await listAccountIntelligenceValidations(input.candidate.id);
  if (existing.length > 0) return;

  const fingerprints = await listActiveAccountIntelligenceFingerprints(input.workspaceId, input.companyId);
  const deterministic = runAccountIntelligenceDeterministicValidators({
    companyId: input.companyId,
    companyExists: true,
    companyResolved: input.companyResolved,
    workspaceId: input.workspaceId,
    signals: input.signals,
    draft: input.draft,
    signalLinks: input.signalLinks,
    themes: input.themes,
    tensions: input.tensions,
    existingFingerprints: fingerprints.filter((value) => value !== input.candidate.candidate_fingerprint),
  });
  await insertAccountIntelligenceValidations({
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
      inputManifest: { account_intelligence_candidate_id: input.candidate.id },
      request: {
        taskType: "account_intelligence_validation",
        model: getValidationModel(),
        reasoningEffort: "low",
        promptVersion: ACCOUNT_INTELLIGENCE_VALIDATION_PROMPT_VERSION,
        schemaVersion: ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION,
        schema: accountIntelligenceValidationOutputSchema,
        schemaName: "account_intelligence_validation",
        instructions: ACCOUNT_INTELLIGENCE_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: JSON.stringify(
          serializeAccountIntelligenceValidationInput({
            draft: input.draft,
            signals: input.signals,
            themes: input.themes,
            tensions: input.tensions,
          }),
        ),
      },
    });
    const semantic = accountIntelligenceSemanticOutputToRecords(parsed, run.id);
    await insertAccountIntelligenceValidations({
      workspaceId: input.workspaceId,
      candidateId: input.candidate.id,
      records: semantic,
    });
    allValidations = [...allValidations, ...semantic];
  }

  const decision = decideAccountIntelligenceCandidateStatus({
    hasActiveSignals: input.signals.every((signal) => signal.status === "active") && input.signals.length > 0,
    companyResolved: input.companyResolved,
    tensionsIncludeOther: input.tensions.some((tension) => tension.tensionType === "other"),
    validations: allValidations,
  });
  if (!canTransition("pending_validation", decision.status)) return;
  await updateAccountIntelligenceCandidateOutcome({
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

async function summarizeAccountIntelligence(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  signalCount: number;
  usedFakeProvider: boolean;
}): Promise<AccountIntelligenceSummary> {
  const candidates = await listExistingAccountIntelligenceCandidates(input.companyId);
  return {
    companyId: input.companyId,
    analysisId: input.analysisId,
    researchRunId: input.researchRunId,
    signalCount: input.signalCount,
    candidateCount: candidates.length,
    promotedCount: candidates.filter((row) => row.status === "promoted").length,
    needsReviewCount: candidates.filter((row) => row.status === "needs_review").length,
    rejectedCount: candidates.filter((row) => row.status === "rejected").length,
    usedFakeProvider: input.usedFakeProvider,
    candidates,
  };
}

export async function listExistingAccountIntelligenceCandidates(companyId: string): Promise<AccountIntelligenceCandidateView[]> {
  const rows = await listAccountIntelligenceCandidatesForCompany(companyId);
  const views: AccountIntelligenceCandidateView[] = [];
  for (const row of rows) {
    const validations = await listAccountIntelligenceValidations(row.id);
    const links = Array.isArray(row.proposed_signal_links) ? row.proposed_signal_links : [];
    const themes = Array.isArray(row.proposed_themes) ? row.proposed_themes : [];
    const tensions = Array.isArray(row.proposed_tensions) ? row.proposed_tensions : [];
    views.push({
      id: row.id,
      companyId: row.company_id,
      headline: row.proposed_headline,
      executiveSummary: row.proposed_executive_summary,
      status: row.status,
      fingerprint: row.candidate_fingerprint,
      originModelRunId: row.extraction_model_run_id,
      rejectionReasonCode: row.rejection_reason_code,
      rejectionReasonText: row.rejection_reason_text,
      promotedId: row.promoted_account_intelligence_id,
      signalCount: links.length,
      themeCount: themes.length,
      tensionCount: tensions.length,
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

export async function getAccountIntelligenceLabContext() {
  await requireAdminUserId();
  const workspace = await workspaceRepository.getCurrentWorkspace();
  if (!workspace) throw new PersistenceUnavailableError();
  const companies = await listCompaniesForWorkspace(workspace.id);
  const analyses = await analysisRepository.getRecentAnalyses(workspace.id, 40);
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
  };
}
