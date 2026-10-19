import type { OpportunityExtractionOutput } from "@/server/ai/schemas/opportunity-extraction-schema";
import { OPPORTUNITY_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import type { OpportunityDraft } from "./types";
import type { OpportunityDerivationInput } from "./types";
import { isOpportunityType } from "./taxonomy";

export function serializeOpportunityInput(input: OpportunityDerivationInput) {
  return {
    company_id: input.companyId,
    account_intelligence: input.accountIntelligence
      ? {
          id: input.accountIntelligence.id,
          headline: input.accountIntelligence.headline,
          executive_summary: input.accountIntelligence.executiveSummary,
          status: input.accountIntelligence.status,
        }
      : null,
    signals: input.signals.map((signal) => ({
      id: signal.id,
      type: signal.signalType,
      title: signal.title,
      summary: signal.summary,
      status: signal.status,
      importance: signal.importance,
      assertion_mode: signal.assertionMode,
      confidence_tier: signal.confidenceTier,
      event_date: signal.eventDate,
      geography: signal.geography,
      claims: signal.claims.map((claim) => claim.statement),
      evidence: signal.evidenceSnippets,
    })),
    themes: input.themes.map((theme) => ({
      name: theme.canonicalName,
      signal_count: theme.signalCount,
      importance: theme.weightedImportance,
    })),
    tensions: input.tensions,
    fits: input.fits.map((fit) => ({
      id: fit.id,
      knowledge_name: fit.knowledgeName,
      knowledge_type: fit.knowledgeType,
      knowledge_status: fit.knowledgeStatus,
      fit_level: fit.fitLevel,
      reason: fit.fitReasonSummary,
      cases: fit.relatedCases,
    })),
    knowledge: input.knowledge
      .filter((object) => object.status === "active")
      .map((object) => ({
        id: object.id,
        type: object.objectType,
        name: object.canonicalName,
        description: object.shortDescription,
      })),
  };
}

export function serializeOpportunityValidationInput(draft: OpportunityDraft) {
  return {
    title: draft.title,
    summary: draft.summary,
    opportunity_type: draft.opportunityType,
    maturity: draft.maturity,
    relevance_level: draft.relevanceLevel,
    urgency_level: draft.urgencyLevel,
    confidence_tier: draft.confidenceTier,
    assertion_mode: draft.assertionMode,
    rationale: draft.rationaleBlocks,
  };
}

export function extractionToDraftPatch(output: OpportunityExtractionOutput): Partial<OpportunityDraft> {
  return {
    title: output.title,
    summary: output.summary,
    opportunityType: isOpportunityType(output.opportunity_type) ? output.opportunity_type : undefined,
    rationale: output.rationale,
  };
}

export function draftToExtractionOutput(draft: OpportunityDraft): OpportunityExtractionOutput {
  return {
    schema_version: OPPORTUNITY_EXTRACTION_SCHEMA_VERSION,
    title: draft.title,
    summary: draft.summary,
    opportunity_type: draft.opportunityType,
    rationale: draft.rationale,
    observed_fact: draft.rationaleBlocks.find((row) => row.rationaleType === "signal_trigger")?.statement ?? draft.title,
    inferred_need: "A related operational need may become relevant.",
    uncertainty: draft.rationaleBlocks.find((row) => row.rationaleType === "uncertainty")?.statement ?? "",
  };
}
