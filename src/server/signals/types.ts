import type { ValidationRecord } from "@/server/extraction/validation-types";
import type {
  SignalClaimRelationship,
  SignalCompanyRole,
  SignalConfidenceTier,
  SignalImportance,
  SignalNature,
  SignalType,
} from "./taxonomy";

export interface SignalClaimLink {
  claimId: string;
  relationshipType: SignalClaimRelationship;
}

export interface SignalCompanyLink {
  companyId: string;
  role: SignalCompanyRole;
}

export interface SignalTagRef {
  category: string;
  canonicalName: string;
}

export interface SignalClaimContext {
  id: string;
  workspaceId: string;
  companyId: string;
  statement: string;
  assertionMode: string;
  claimStatus: string;
  metricName: string | null;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  countryCode: string | null;
  stateRegion: string | null;
  city: string | null;
  geographyLevel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  asOfDate: string | null;
  sourceSnapshotId: string | null;
  companyResolved: boolean;
}

export interface SignalCandidateDraft {
  signalType: SignalType | string;
  signalNature: SignalNature | string;
  title: string;
  summary: string;
  suggestedImportance: SignalImportance | string;
  assertionMode: string;
  eventDate: string | null;
  effectivePeriodStart: string | null;
  effectivePeriodEnd: string | null;
  geography: string | null;
  metricName: string | null;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  coreEvent: string;
  tags: SignalTagRef[];
  companies: SignalCompanyLink[];
  parentSignalId: string | null;
  claims: SignalClaimLink[];
}

export interface SignalDeterministicContext {
  draft: SignalCandidateDraft;
  companyId: string;
  companyExists: boolean;
  companyResolved: boolean;
  workspaceId: string;
  claimsById: Map<string, SignalClaimContext>;
  existingFingerprints: string[];
  sourceSnapshotId: string | null;
}

export interface SignalCandidateView {
  id: string;
  signalType: string;
  title: string;
  summary: string;
  status: string;
  importance: string;
  assertionMode: string;
  geography: string | null;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  originModelRunId: string;
  promotedSignalId: string | null;
  claims: SignalClaimLink[];
  validations: {
    validatorCode: string;
    result: string;
    severity: string;
    message: string | null;
    supportLevel?: unknown;
  }[];
}

export interface SignalExtractionSummary {
  companyId: string;
  analysisId: string;
  researchRunId: string;
  claimCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  signalCount: number;
  candidates: SignalCandidateView[];
  usedFakeProvider: boolean;
}

export interface SignalSearchFilters {
  companyId?: string | null;
  signalType?: string | null;
  importance?: string | null;
  assertionMode?: string | null;
  geography?: string | null;
  status?: string | null;
  query?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
}

export interface SignalListItem {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  signalType: string;
  signalNature: string;
  title: string;
  summary: string;
  status: string;
  importance: string;
  confidenceTier: SignalConfidenceTier | string;
  assertionMode: string;
  eventDate: string | null;
  geography: string | null;
  evidenceCount: number;
  demoOrigin: boolean;
  createdAt: string;
}

export interface SignalDetail {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  signalType: string;
  signalNature: string;
  title: string;
  summary: string;
  status: string;
  importance: string;
  confidenceTier: string;
  assertionMode: string;
  eventDate: string | null;
  effectivePeriodStart: string | null;
  effectivePeriodEnd: string | null;
  geography: string | null;
  sourceSnapshotId: string | null;
  originSignalCandidateId: string | null;
  originModelRunId: string | null;
  parentSignalId: string | null;
  supersedesSignalId: string | null;
  createdAt: string;
  updatedAt: string;
  demoOrigin: boolean;
  companies: { companyId: string; role: string; displayName: string }[];
  tags: SignalTagRef[];
  claims: {
    id: string;
    statement: string;
    assertionMode: string;
    relationshipType: string;
  }[];
  evidence: { exactQuote: string; snapshotId: string | null }[];
  validations: ValidationRecord[];
}
