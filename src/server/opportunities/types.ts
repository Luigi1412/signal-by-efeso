import type { ValidationRecord } from "@/server/extraction/validation-types";
import type { AccountSignalInput, AccountThemeDraft, KnowledgeFitTarget } from "@/server/intelligence/types";
import type {
  OpportunityAssertionMode,
  OpportunityConfidenceTier,
  OpportunityFitRelationship,
  OpportunityKnowledgeRelationship,
  OpportunityLevel,
  OpportunityMaturity,
  OpportunityRationaleType,
  OpportunitySignalRelationship,
  OpportunityType,
} from "./taxonomy";

export interface OpportunitySignalLinkDraft {
  signalId: string;
  relationshipType: OpportunitySignalRelationship;
}

export interface OpportunityFitLinkDraft {
  efesoFitId: string;
  relationshipType: OpportunityFitRelationship;
}

export interface OpportunityKnowledgeLinkDraft {
  knowledgeObjectId: string;
  relationshipType: OpportunityKnowledgeRelationship;
}

export interface OpportunityRationaleDraft {
  rationaleType: OpportunityRationaleType;
  statement: string;
  sourceType: string | null;
  sourceId: string | null;
}

export interface OpportunityDraft {
  title: string;
  summary: string;
  opportunityType: OpportunityType;
  maturity: OpportunityMaturity;
  relevanceLevel: OpportunityLevel;
  urgencyLevel: OpportunityLevel;
  confidenceTier: OpportunityConfidenceTier;
  assertionMode: OpportunityAssertionMode;
  geography: string | null;
  rationale: string;
  accountIntelligenceId: string | null;
  primaryEfesoFitId: string | null;
  parentOpportunityId: string | null;
  signalLinks: OpportunitySignalLinkDraft[];
  fitLinks: OpportunityFitLinkDraft[];
  knowledgeLinks: OpportunityKnowledgeLinkDraft[];
  rationaleBlocks: OpportunityRationaleDraft[];
}

export interface ActiveFitInput {
  id: string;
  companyId: string;
  workspaceId: string;
  knowledgeObjectId: string;
  knowledgeName: string;
  knowledgeType: string;
  knowledgeStatus: string;
  status: string;
  fitLevel: string;
  fitScore: number | null;
  fitReasonSummary: string;
  relatedCases: { id: string; name: string; status: string }[];
  relatedMethodologies: { id: string; name: string; status: string }[];
  tags: { category: string; canonicalName: string }[];
}

export interface AccountIntelligenceInput {
  id: string;
  companyId: string;
  status: string;
  headline: string;
  executiveSummary: string;
}

export interface OpportunityDerivationInput {
  companyId: string;
  companyExists: boolean;
  companyResolved: boolean;
  workspaceId: string;
  signals: AccountSignalInput[];
  themes: AccountThemeDraft[];
  tensions: { tensionType: string; explanation: string }[];
  accountIntelligence: AccountIntelligenceInput | null;
  fits: ActiveFitInput[];
  knowledge: KnowledgeFitTarget[];
}

export interface OpportunityDeterministicContext {
  companyId: string;
  companyExists: boolean;
  companyResolved: boolean;
  workspaceId: string;
  draft: OpportunityDraft;
  signals: AccountSignalInput[];
  fits: ActiveFitInput[];
  knowledge: KnowledgeFitTarget[];
  derivedMaturity: OpportunityMaturity;
  derivedRelevance: OpportunityLevel;
  derivedUrgency: OpportunityLevel;
  derivedConfidence: OpportunityConfidenceTier;
  existingFingerprints: string[];
  similarHypothesisFingerprints: string[];
}

export interface OpportunityListItem {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  title: string;
  summary: string;
  status: string;
  opportunityType: OpportunityType | string;
  maturity: OpportunityMaturity | string;
  relevanceLevel: OpportunityLevel | string;
  urgencyLevel: OpportunityLevel | string;
  confidenceTier: OpportunityConfidenceTier | string;
  assertionMode: string;
  geography: string | null;
  primaryCapability: string | null;
  triggerSignalTitle: string | null;
  triggerSignalId: string | null;
  uncertaintyStatement: string | null;
  demoOrigin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityDetail extends OpportunityListItem {
  accountIntelligenceId: string | null;
  primaryEfesoFitId: string | null;
  originCandidateId: string | null;
  originModelRunId: string | null;
  parentOpportunityId: string | null;
  supersedesOpportunityId: string | null;
  version: number;
  dismissalReason: string | null;
  rationaleBlocks: OpportunityRationaleDraft[];
  signals: {
    id: string;
    title: string;
    signalType: string;
    relationshipType: string;
    assertionMode: string;
    importance: string;
  }[];
  fits: {
    id: string;
    knowledgeName: string;
    fitLevel: string;
    relationshipType: string;
    reason: string;
  }[];
  knowledge: {
    id: string;
    name: string;
    objectType: string;
    relationshipType: string;
    description: string | null;
  }[];
}

export interface OpportunityCandidateView {
  id: string;
  companyId: string;
  title: string;
  summary: string;
  opportunityType: string;
  maturity: string;
  relevanceLevel: string;
  urgencyLevel: string;
  confidenceTier: string;
  status: string;
  fingerprint: string;
  originModelRunId: string | null;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  promotedId: string | null;
  rationale: string;
  rationaleBlocks: OpportunityRationaleDraft[];
  validations: ValidationRecord[];
}

export interface OpportunityLabCompanyContext {
  accountIntelligence: { headline: string; status: string; summary: string } | null;
  signals: { id: string; title: string; signalType: string; status: string }[];
  fits: { id: string; knowledgeName: string; fitLevel: string; status: string }[];
}

export interface OpportunitySummary {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  signalCount: number;
  fitCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  usedFakeProvider: boolean;
  candidates: OpportunityCandidateView[];
}

export interface GlobalOpportunityPreview {
  companyId: string;
  companyName: string;
  companySlug: string;
  topOpportunity: OpportunityListItem | null;
}
