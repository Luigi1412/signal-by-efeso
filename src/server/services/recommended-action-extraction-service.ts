import "server-only";
import {
  ACTION_EXTRACTION_PROMPT_VERSION,
  ACTION_EXTRACTION_SCHEMA_VERSION,
  ACTION_VALIDATION_PROMPT_VERSION,
  ACTION_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import { getExtractionModel, getValidationModel, isControlledExtractionEnabled } from "@/server/ai/config";
import { ControlledExtractionDisabledError, PromotionError } from "@/server/ai/errors";
import type { LanguageModelProvider } from "@/server/ai/language-model-provider";
import { ACTION_EXTRACTION_INSTRUCTIONS } from "@/server/ai/prompts/action-extraction-v1";
import { ACTION_SEMANTIC_VALIDATION_INSTRUCTIONS } from "@/server/ai/prompts/action-semantic-validation-v1";
import { actionExtractionOutputSchema } from "@/server/ai/schemas/action-extraction-schema";
import { actionValidationOutputSchema } from "@/server/ai/schemas/action-validation-schema";
import { getLanguageModelProvider } from "@/server/ai/get-provider";
import { FakeLanguageModelProvider } from "@/server/ai/providers/fake-language-model-provider";
import { executeStructuredModelRun } from "@/server/extraction/model-run-service";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import * as analysisRepository from "@/server/repositories/analysis-repository";
import * as researchRunRepository from "@/server/repositories/research-run-repository";
import * as workspaceRepository from "@/server/repositories/workspace-repository";
import { requireAdminUserId } from "@/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PersistenceUnavailableError } from "@/server/persistence-error";
import { getCompanyRow, getSnapshotForRun } from "@/server/signals/persistence";
import { getAccountIntelligenceLabContext } from "@/server/services/account-intelligence-service";
import { getCompanyRelationship } from "@/server/services/relationship-query-service";
import { searchOpportunities, getOpportunityDetail } from "@/server/services/opportunity-query-service";
import { listActiveOpportunitiesForCompany, listOpportunityKnowledge } from "@/server/opportunities/persistence";
import { getActiveAccountRelationship, listActiveContacts, getPerson } from "@/server/relationship/persistence";
import { getKnowledgeObject } from "@/server/knowledge/persistence";
import {
  hasBlockingActionFailure,
  runActionDeterministicValidators,
} from "@/server/recommended-actions/deterministic-validators";
import { clampPriority, deriveActionConfidence, proposeActionDrafts } from "@/server/recommended-actions/derivation";
import { fingerprintFromDraft } from "@/server/recommended-actions/fingerprint";
import { decideActionCandidateStatus } from "@/server/recommended-actions/promotion-policy";
import { actionSemanticOutputToRecords, passingActionValidation } from "@/server/recommended-actions/semantic-validators";
import { detectForbiddenOutreach, detectInventedOwner } from "@/server/recommended-actions/commercial-language";
import {
  findActionCandidateByFingerprint,
  insertActionCandidate,
  insertActionValidations,
  listActionCandidatesForCompany,
  listActionValidations,
  listActiveActionFingerprints,
  updateActionCandidateOutcome,
  type RecommendedActionCandidateRow,
} from "@/server/recommended-actions/persistence";
import type {
  ActionDerivationInput,
  ActionDraft,
  ActionRationaleDraft,
  RecommendedActionCandidateView,
  RecommendedActionSummary,
} from "@/server/recommended-actions/types";
import type { OpportunityLevel, OpportunityMaturity } from "@/server/opportunities/taxonomy";
import { isActionType } from "@/server/recommended-actions/taxonomy";
import type { RelationshipStrength } from "@/server/relationship/taxonomy";

export async function promoteRecommendedActionCandidateViaSessionRpc(candidateId: string): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: "promote_recommended_action_candidate",
      args: { p_candidate_id: string },
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("promote_recommended_action_candidate", { p_candidate_id: candidateId });
  if (error) throw new PromotionError(error.message);
  if (!data) throw new PromotionError("Action promotion RPC returned no id.");
  return String(data);
}

function draftToExtractionOutput(draft: ActionDraft) {
  return {
    schema_version: ACTION_EXTRACTION_SCHEMA_VERSION,
    title: draft.title,
    rationale: draft.rationale,
    action_type: draft.actionType,
    uncertainty: draft.rationaleBlocks.find((block) => block.rationaleType === "uncertainty")?.statement ?? "",
  };
}

export function createLabFakeActionProvider(drafts: ActionDraft[]): FakeLanguageModelProvider {
  const items = drafts.flatMap((draft) => [
    { kind: "output" as const, output: draftToExtractionOutput(draft) },
    { kind: "output" as const, output: passingActionValidation() },
  ]);
  return new FakeLanguageModelProvider(items);
}

export async function runRecommendedActionsForCompany(input: {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  workspaceId?: string;
  useFakeProvider?: boolean;
  provider?: LanguageModelProvider;
  promote?: (candidateId: string) => Promise<string>;
  pipelineActor?: boolean;
}): Promise<RecommendedActionSummary> {
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
  const snapshot = await getSnapshotForRun(workspace.id, input.researchRunId);
  if (!snapshot) throw new Error("SOURCE_SNAPSHOT_NOT_FOUND");

  const actionInputs = input.pipelineActor
    ? await loadPipelineActionInputs(workspace.id, input.companyId)
    : await loadSessionActionInputs(input.companyId);
  const { opportunities, relationship } = actionInputs;
  const existingFingerprints = await listActiveActionFingerprints(workspace.id, input.companyId);

  const drafts: ActionDraft[] = [];
  if (opportunities.length === 0) {
    drafts.push(
      ...proposeActionDrafts({
        companyId: input.companyId,
        companyExists: true,
        workspaceId: workspace.id,
        opportunity: null,
        relationship,
        accountIntelligenceId: null,
        hasRelevantCase: false,
      }),
    );
  } else {
    for (const item of opportunities) {
      drafts.push(
        ...proposeActionDrafts({
          companyId: input.companyId,
          companyExists: true,
          workspaceId: workspace.id,
          opportunity: {
            id: item.id,
            title: item.title,
            status: item.status,
            relevanceLevel: item.relevanceLevel as OpportunityLevel,
            urgencyLevel: item.urgencyLevel as OpportunityLevel,
            maturity: item.maturity as OpportunityMaturity,
            opportunityType: String(item.opportunityType),
            primaryCapability: item.primaryCapability,
            knowledgeObjectIds: item.knowledgeIds,
          },
          relationship,
          accountIntelligenceId: item.accountIntelligenceId,
          hasRelevantCase: item.hasCase,
        }),
      );
    }
  }

  const unique = new Map<string, ActionDraft>();
  for (const draft of drafts) {
    unique.set(fingerprintFromDraft(input.companyId, draft), draft);
  }
  const uniqueDrafts = [...unique.values()];
  const usedFake = Boolean(input.useFakeProvider) && !input.provider;
  const provider = input.provider ?? (usedFake ? createLabFakeActionProvider(uniqueDrafts) : getLanguageModelProvider());

  for (const draft of uniqueDrafts) {
    const { run: modelRun, parsed } = await executeStructuredModelRun({
      workspaceId: workspace.id,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      provider,
      inputManifest: {
        company_id: input.companyId,
        opportunity_id: draft.opportunityId,
        action_type: draft.actionType,
        relationship_id: draft.relationshipId,
      },
      request: {
        taskType: "relationship_action_generation",
        model: getExtractionModel(),
        reasoningEffort: "low",
        promptVersion: ACTION_EXTRACTION_PROMPT_VERSION,
        schemaVersion: ACTION_EXTRACTION_SCHEMA_VERSION,
        schema: actionExtractionOutputSchema,
        schemaName: "relationship_action_extraction",
        instructions: ACTION_EXTRACTION_INSTRUCTIONS,
        input: JSON.stringify({
          action_type: draft.actionType,
          title: draft.title,
          rationale: draft.rationale,
          relationship_strength: relationship.strength,
          has_account_owner: relationship.hasAccountOwner,
        }),
      },
    });
    if (isActionType(parsed.action_type) && parsed.action_type === draft.actionType && !detectForbiddenOutreach(parsed.title)) {
      draft.title = parsed.title;
      if (!detectForbiddenOutreach(parsed.rationale)) draft.rationale = parsed.rationale;
    }
    const fingerprint = fingerprintFromDraft(input.companyId, draft);
    let candidate = await findActionCandidateByFingerprint(workspace.id, input.companyId, fingerprint);
    if (!candidate) {
      candidate = await insertActionCandidate({
        workspaceId: workspace.id,
        companyId: input.companyId,
        analysisId: analysis.id,
        researchRunId: run.id,
        draft,
        fingerprint,
        generationModelRunId: modelRun.id,
        metadata: { origin: usedFake || provider.name === "fake" ? "lab_fake" : "pipeline" },
      });
    }
    await validateAndMaybePromote({
      workspaceId: workspace.id,
      analysisId: analysis.id,
      researchRunId: run.id,
      sourceSnapshotId: snapshot,
      companyId: input.companyId,
      candidate,
      draft,
      existingFingerprints,
      hasAccountOwner: relationship.hasAccountOwner,
      relationshipStrength: relationship.strength,
      opportunityActive: Boolean(draft.opportunityId),
      opportunityDismissed: false,
      provider,
      promote: input.promote,
    });
  }

  const candidates = await listExistingActionCandidates(input.companyId);
  return {
    companyId: input.companyId,
    analysisId: analysis.id,
    researchRunId: run.id,
    candidateCount: candidates.length,
    promotedCount: candidates.filter((row) => row.status === "promoted").length,
    needsReviewCount: candidates.filter((row) => row.status === "needs_review").length,
    rejectedCount: candidates.filter((row) => row.status === "rejected").length,
    usedFakeProvider: usedFake,
    candidates,
  };
}

async function validateAndMaybePromote(input: {
  workspaceId: string;
  analysisId: string;
  researchRunId: string;
  sourceSnapshotId: string;
  companyId: string;
  candidate: RecommendedActionCandidateRow;
  draft: ActionDraft;
  existingFingerprints: string[];
  hasAccountOwner: boolean;
  relationshipStrength: "unknown" | "none" | "weak" | "medium" | "strong";
  opportunityActive: boolean;
  opportunityDismissed: boolean;
  provider: LanguageModelProvider;
  promote?: (candidateId: string) => Promise<string>;
}): Promise<void> {
  const derivedPriority = input.draft.priority;
  input.draft.priority = clampPriority(derivedPriority, input.draft.priority);
  input.draft.confidenceTier = deriveActionConfidence({
    actionType: input.draft.actionType,
    relationshipStrength: input.relationshipStrength,
    hasAccountOwner: input.hasAccountOwner,
    opportunityExplicit: input.opportunityActive,
  });
  const deterministic = runActionDeterministicValidators({
    draft: input.draft,
    companyExists: true,
    workspaceId: input.workspaceId,
    companyId: input.companyId,
    opportunityActive: input.opportunityActive,
    opportunityDismissed: input.opportunityDismissed,
    relationshipStrength: input.relationshipStrength,
    hasAccountOwner: input.hasAccountOwner,
    derivedPriority,
    derivedConfidence: input.draft.confidenceTier,
    existingFingerprints: input.existingFingerprints.filter((item) => item !== input.candidate.candidate_fingerprint),
  });
  let semantic: ValidationRecord[] = [];
  if (!hasBlockingActionFailure(deterministic)) {
    const { run: validationRun, parsed } = await executeStructuredModelRun({
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      researchRunId: input.researchRunId,
      sourceSnapshotId: input.sourceSnapshotId,
      provider: input.provider,
      inputManifest: { candidate_id: input.candidate.id, action_type: input.draft.actionType },
      request: {
        taskType: "relationship_action_validation",
        model: getValidationModel(),
        reasoningEffort: "low",
        promptVersion: ACTION_VALIDATION_PROMPT_VERSION,
        schemaVersion: ACTION_VALIDATION_SCHEMA_VERSION,
        schema: actionValidationOutputSchema,
        schemaName: "relationship_action_validation",
        instructions: ACTION_SEMANTIC_VALIDATION_INSTRUCTIONS,
        input: JSON.stringify({ title: input.draft.title, rationale: input.draft.rationale, action_type: input.draft.actionType }),
      },
    });
    semantic = actionSemanticOutputToRecords(parsed, validationRun.id, derivedPriority);
  }
  const validations = [...deterministic, ...semantic];
  await insertActionValidations({ workspaceId: input.workspaceId, candidateId: input.candidate.id, records: validations });
  const decision = decideActionCandidateStatus({
    actionTypeOther: input.draft.actionType === "other",
    forbiddenOutreach: detectForbiddenOutreach(`${input.draft.title} ${input.draft.rationale}`),
    ownerInvented: detectInventedOwner(`${input.draft.title} ${input.draft.rationale}`, input.hasAccountOwner),
    validations,
  });
  await updateActionCandidateOutcome({
    id: input.candidate.id,
    fromStatus: "pending_validation",
    status: decision.status,
    rejectionReasonCode: decision.rejectionReasonCode,
    rejectionReasonText: decision.rejectionReasonText,
  });
  if (decision.status === "validated") {
    await (input.promote ?? promoteRecommendedActionCandidateViaSessionRpc)(input.candidate.id);
  }
}

export async function listExistingActionCandidates(companyId: string): Promise<RecommendedActionCandidateView[]> {
  const rows = await listActionCandidatesForCompany(companyId);
  const views: RecommendedActionCandidateView[] = [];
  for (const row of rows) {
    const validations = await listActionValidations(row.id);
    const blocks = Array.isArray(row.proposed_rationale_blocks) ? row.proposed_rationale_blocks : [];
    views.push({
      id: row.id,
      companyId: row.company_id,
      title: row.proposed_title,
      rationale: row.proposed_rationale,
      actionType: row.proposed_action_type,
      priority: row.proposed_priority,
      confidenceTier: row.proposed_confidence_tier,
      status: row.status,
      fingerprint: row.candidate_fingerprint,
      originModelRunId: row.generation_model_run_id,
      rejectionReasonCode: row.rejection_reason_code,
      rejectionReasonText: row.rejection_reason_text,
      promotedId: row.promoted_action_id,
      rationaleBlocks: blocks.map((block) => {
        const rowBlock = block as {
          rationale_type?: string;
          statement?: string;
          source_type?: string | null;
          source_id?: string | null;
        };
        return {
          rationaleType: (rowBlock.rationale_type ?? "uncertainty") as ActionRationaleDraft["rationaleType"],
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

export async function getActionLabContext() {
  return getAccountIntelligenceLabContext();
}

type ActionOpportunityInput = {
  id: string;
  title: string;
  status: string;
  relevanceLevel: OpportunityLevel;
  urgencyLevel: OpportunityLevel;
  maturity: OpportunityMaturity;
  opportunityType: string;
  primaryCapability: string | null;
  knowledgeIds: string[];
  hasCase: boolean;
  accountIntelligenceId: string | null;
};

type ActionInputs = {
  opportunities: ActionOpportunityInput[];
  relationship: ActionDerivationInput["relationship"];
};

async function loadSessionActionInputs(companyId: string): Promise<ActionInputs> {
  const items = await searchOpportunities({ companyId, status: "active" });
  const relationshipView = await getCompanyRelationship(companyId);
  const relationship: ActionDerivationInput["relationship"] = {
    id: relationshipView && !relationshipView.unavailable ? relationshipView.id : null,
    status: relationshipView?.relationshipStatus ?? "unknown",
    strength: relationshipView?.unavailable ? "unknown" : (relationshipView?.derivedStrength ?? "unknown"),
    hasAccountOwner: Boolean(relationshipView?.accountOwner),
    accountOwnerName: relationshipView?.accountOwner?.person.displayName ?? null,
    knownHolders: relationshipView?.efesoHolders.length ?? 0,
    dataQuality: relationshipView?.dataQuality ?? "unknown",
  };
  const opportunities: ActionOpportunityInput[] = [];
  for (const item of items) {
    const detail = await getOpportunityDetail(item.id);
    opportunities.push({
      id: item.id,
      title: item.title,
      status: item.status,
      relevanceLevel: item.relevanceLevel as OpportunityLevel,
      urgencyLevel: item.urgencyLevel as OpportunityLevel,
      maturity: item.maturity as OpportunityMaturity,
      opportunityType: String(item.opportunityType),
      primaryCapability: item.primaryCapability,
      knowledgeIds: detail?.knowledge.map((object) => object.id) ?? [],
      hasCase: detail?.knowledge.some((object) => object.objectType === "case") ?? false,
      accountIntelligenceId: detail?.accountIntelligenceId ?? null,
    });
  }
  return { opportunities, relationship };
}

async function loadPipelineActionInputs(workspaceId: string, companyId: string): Promise<ActionInputs> {
  const rows = await listActiveOpportunitiesForCompany(workspaceId, companyId);
  const opportunities: ActionOpportunityInput[] = [];
  for (const row of rows) {
    const links = await listOpportunityKnowledge(row.id);
    const knowledgeIds: string[] = [];
    let hasCase = false;
    for (const link of links) {
      knowledgeIds.push(link.knowledge_object_id);
      const object = await getKnowledgeObject(workspaceId, link.knowledge_object_id);
      if (object?.object_type === "case") hasCase = true;
    }
    opportunities.push({
      id: row.id,
      title: row.title,
      status: row.status,
      relevanceLevel: row.relevance_level as OpportunityLevel,
      urgencyLevel: row.urgency_level as OpportunityLevel,
      maturity: row.maturity as OpportunityMaturity,
      opportunityType: row.opportunity_type,
      primaryCapability: null,
      knowledgeIds,
      hasCase,
      accountIntelligenceId: row.account_intelligence_id,
    });
  }
  const rel = await getActiveAccountRelationship(workspaceId, companyId);
  const contacts = await listActiveContacts(workspaceId, companyId);
  const owner = contacts.find((contact) => contact.relationship_role === "account_owner");
  const ownerPerson = owner ? await getPerson(workspaceId, owner.relationship_person_id) : null;
  const relationship: ActionDerivationInput["relationship"] = {
    id: rel?.id ?? null,
    status: rel?.relationship_status ?? "unknown",
    strength: (rel?.relationship_strength ?? "unknown") as RelationshipStrength,
    hasAccountOwner: Boolean(ownerPerson),
    accountOwnerName: ownerPerson?.display_name ?? null,
    knownHolders: contacts.filter((contact) => contact.relationship_role === "relationship_holder").length,
    dataQuality: rel?.data_quality ?? "unknown",
  };
  return { opportunities, relationship };
}
