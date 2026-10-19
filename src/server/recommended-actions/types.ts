import type { ValidationRecord } from "@/server/extraction/validation-types";
import type { OpportunityLevel, OpportunityMaturity } from "@/server/opportunities/taxonomy";
import type { RelationshipStrength } from "@/server/relationship/taxonomy";
import type { ActionConfidenceTier, ActionPriority, ActionRationaleType, ActionType } from "./taxonomy";

export interface ActionRationaleDraft {
  rationaleType: ActionRationaleType;
  statement: string;
  sourceType: string | null;
  sourceId: string | null;
}

export interface ActionDraft {
  actionType: ActionType;
  title: string;
  rationale: string;
  priority: ActionPriority;
  confidenceTier: ActionConfidenceTier;
  opportunityId: string | null;
  relationshipId: string | null;
  knowledgeObjectIds: string[];
  opportunityLinks: { opportunityId: string; relationshipType: "primary" | "supporting" }[];
  relationshipLinks: { accountRelationshipId: string; relationshipType: "informs" | "target_context" }[];
  knowledgeLinks: { knowledgeObjectId: string; relationshipType: "supporting" | "case" | "brief" }[];
  rationaleBlocks: ActionRationaleDraft[];
}

export interface ActionDerivationInput {
  companyId: string;
  companyExists: boolean;
  workspaceId: string;
  opportunity: {
    id: string;
    title: string;
    status: string;
    relevanceLevel: OpportunityLevel;
    urgencyLevel: OpportunityLevel;
    maturity: OpportunityMaturity;
    opportunityType: string;
    primaryCapability: string | null;
    knowledgeObjectIds: string[];
  } | null;
  relationship: {
    id: string | null;
    status: string;
    strength: RelationshipStrength;
    hasAccountOwner: boolean;
    accountOwnerName: string | null;
    knownHolders: number;
    dataQuality: string;
  };
  accountIntelligenceId: string | null;
  hasRelevantCase: boolean;
}

export interface RecommendedActionListItem {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  title: string;
  rationale: string;
  status: string;
  actionType: string;
  priority: ActionPriority;
  confidenceTier: ActionConfidenceTier;
  opportunityTitle: string | null;
  opportunityId: string | null;
  opportunityUrgency: OpportunityLevel | null;
  relationshipStrength: RelationshipStrength | null;
  ownerName: string | null;
  uncertaintyStatement: string | null;
  demoOrigin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedActionDetail extends RecommendedActionListItem {
  originCandidateId: string | null;
  originModelRunId: string | null;
  supersedesActionId: string | null;
  version: number;
  dismissalReason: string | null;
  rationaleBlocks: ActionRationaleDraft[];
  knowledge: { id: string; name: string; relationshipType: string }[];
}

export interface RecommendedActionCandidateView {
  id: string;
  companyId: string;
  title: string;
  rationale: string;
  actionType: string;
  priority: string;
  confidenceTier: string;
  status: string;
  fingerprint: string;
  originModelRunId: string | null;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  promotedId: string | null;
  rationaleBlocks: ActionRationaleDraft[];
  validations: ValidationRecord[];
}

export interface RecommendedActionSummary {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  usedFakeProvider: boolean;
  candidates: RecommendedActionCandidateView[];
}

export interface ActionDeterministicContext {
  draft: ActionDraft;
  companyExists: boolean;
  workspaceId: string;
  companyId: string;
  opportunityActive: boolean;
  opportunityDismissed: boolean;
  relationshipStrength: RelationshipStrength;
  hasAccountOwner: boolean;
  derivedPriority: ActionPriority;
  derivedConfidence: ActionConfidenceTier;
  existingFingerprints: string[];
}
