import type { ValidationRecord } from "@/server/extraction/validation-types";
import type {
  AccountIntelligenceSectionKey,
  AccountSignalRelationship,
  FitComponentType,
  FitLevel,
  MatchStrength,
  SignalKnowledgeMatchType,
  TemporalState,
  TensionType,
} from "./taxonomy";

export interface AccountSignalInput {
  id: string;
  companyId: string;
  workspaceId: string;
  status: string;
  signalType: string;
  signalNature: string;
  title: string;
  summary: string;
  importance: string;
  confidenceTier: string;
  assertionMode: string;
  eventDate: string | null;
  geography: string | null;
  createdAt: string;
  tags: { tagId: string; category: string; canonicalName: string }[];
  claims: { id: string; statement: string; assertionMode: string }[];
  evidenceSnippets: string[];
}

export interface AccountThemeDraft {
  tagId: string | null;
  category: string;
  canonicalName: string;
  signalCount: number;
  weightedImportance: "low" | "medium" | "high";
  lastSeenAt: string | null;
  supportingSignalIds: string[];
}

export interface AccountTensionDraft {
  signalAId: string;
  signalBId: string;
  tensionType: TensionType;
  explanation: string;
}

export interface AccountSignalLinkDraft {
  signalId: string;
  relationshipType: AccountSignalRelationship;
  weight: number;
}

export interface AccountNarrativeDraft {
  headline: string;
  executiveSummary: string;
  strategicDirection: string | null;
  pressureSummary: string | null;
  investmentSummary: string | null;
  operatingContextSummary: string | null;
  riskSummary: string | null;
  changeSummary: string | null;
  sections: Partial<Record<AccountIntelligenceSectionKey, string>>;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface AccountIntelligenceDeterministicContext {
  companyId: string;
  companyExists: boolean;
  companyResolved: boolean;
  workspaceId: string;
  signals: AccountSignalInput[];
  draft: AccountNarrativeDraft;
  signalLinks: AccountSignalLinkDraft[];
  themes: AccountThemeDraft[];
  tensions: AccountTensionDraft[];
  existingFingerprints: string[];
}

export interface FitComponentDraft {
  componentType: FitComponentType;
  componentValue: string;
  contribution: number;
  explanation: string;
  sourceType: "knowledge_tag" | "knowledge_object" | "signal" | "account_theme" | "company";
  sourceId: string | null;
}

export interface SignalKnowledgeMatchDraft {
  signalId: string;
  matchType: SignalKnowledgeMatchType;
  matchStrength: MatchStrength;
  explanation: string;
}

export interface KnowledgeFitTarget {
  id: string;
  objectType: string;
  canonicalName: string;
  status: string;
  shortDescription: string | null;
  tags: { tagId: string; category: string; canonicalName: string }[];
  relatedObjects: { id: string; objectType: string; canonicalName: string; relationType: string }[];
  visibilityLevel?: string;
  confidentialityLevel?: string;
  knowledgeNature?: string;
  outcomeStatus?: string;
  approvedForMatching?: boolean;
  origin?: string | null;
}

export interface FitDerivationInput {
  companyId: string;
  companyIndustry: string | null;
  companyCountry: string | null;
  signals: AccountSignalInput[];
  themes: AccountThemeDraft[];
  knowledge: KnowledgeFitTarget;
}

export interface FitDerivationResult {
  fitLevel: FitLevel;
  fitScore: number;
  components: FitComponentDraft[];
  matches: SignalKnowledgeMatchDraft[];
  rationale: string;
}

export interface AccountIntelligenceView {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  status: string;
  generatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  headline: string;
  executiveSummary: string;
  strategicDirection: string | null;
  pressureSummary: string | null;
  investmentSummary: string | null;
  operatingContextSummary: string | null;
  riskSummary: string | null;
  changeSummary: string | null;
  sections: Partial<Record<AccountIntelligenceSectionKey, string>>;
  version: number;
  originModelRunId: string | null;
  originCandidateId: string | null;
  supersedesId: string | null;
  demoOrigin: boolean;
  signals: {
    id: string;
    title: string;
    signalType: string;
    assertionMode: string;
    importance: string;
    relationshipType: string;
    weight: number;
    temporalState: TemporalState;
  }[];
  themes: AccountThemeDraft[];
  tensions: {
    id: string;
    signalAId: string;
    signalBId: string;
    signalATitle: string;
    signalBTitle: string;
    tensionType: string;
    explanation: string;
    status: string;
  }[];
}

export interface AccountIntelligenceCandidateView {
  id: string;
  companyId: string;
  headline: string;
  executiveSummary: string;
  status: string;
  fingerprint: string;
  originModelRunId: string;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  promotedId: string | null;
  signalCount: number;
  themeCount: number;
  tensionCount: number;
  validations: ValidationRecord[];
}

export interface EfesoFitView {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  knowledgeObjectId: string;
  knowledgeName: string;
  knowledgeType: string;
  status: string;
  fitLevel: FitLevel | string;
  fitScore: number | null;
  fitReasonSummary: string;
  version: number;
  originModelRunId: string | null;
  demoOrigin: boolean;
  components: FitComponentDraft[];
  relatedSignals: { id: string; title: string; matchType: string; matchStrength: string }[];
  relatedCases: { id: string; name: string }[];
  relatedMethodologies: { id: string; name: string }[];
  relatedProblems: { id: string; name: string }[];
  relatedCapabilities: { id: string; name: string }[];
  relatedIndustries: { id: string; name: string }[];
  relatedResults: { id: string; name: string }[];
}

export interface EfesoFitCandidateView {
  id: string;
  companyId: string;
  knowledgeObjectId: string;
  knowledgeName: string;
  proposedFitLevel: string;
  proposedFitScore: number;
  proposedRationale: string;
  status: string;
  fingerprint: string;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  promotedId: string | null;
  components: FitComponentDraft[];
  validations: ValidationRecord[];
}

export interface AccountIntelligenceSummary {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  signalCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  usedFakeProvider: boolean;
  candidates: AccountIntelligenceCandidateView[];
}

export interface EfesoFitSummary {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  knowledgeCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  usedFakeProvider: boolean;
  candidates: EfesoFitCandidateView[];
}

export interface CompanyFitHeatmapCell {
  companyId: string;
  companyName: string;
  knowledgeObjectId: string;
  knowledgeName: string;
  knowledgeType: string;
  fitLevel: FitLevel | string | null;
  fitId: string | null;
}

export interface GlobalAccountIntelligenceRow {
  companyId: string;
  companyName: string;
  companySlug: string;
  intelligenceStatus: string | null;
  generatedAt: string | null;
  topThemes: string[];
  latestMajorSignal: { id: string; title: string; importance: string } | null;
  topFit: { knowledgeName: string; fitLevel: string } | null;
}
