import type { EvidenceType, Geography, ISODate, SourceType } from "./common";

export interface EvidenceSource {
  id: string;
  title: string;
  publisher: string;
  type: SourceType;
  publishedAt: ISODate;
  /** Display-only; not fetched in this prototype. */
  url: string;
  isPrimary: boolean;
  geography: Geography;
}

export interface PersistedEvidenceTrace {
  claimType: string;
  verificationStatus: string;
  reviewStatus: string;
  claimStatus: string;
  geographyDisplay: string | null;
  periodDisplay: string | null;
  sourcePublisher: string;
  sourceType: string;
  sourceTier: string;
  isPrimarySource: boolean;
  snapshotTitle: string | null;
  publicationDate: string | null;
  capturedAt: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  excerpt: string;
  contextBefore: string | null;
  contextAfter: string | null;
  relationship: string;
  directness: string;
  storageKey: string | null;
  snapshotId: string;
  researchRunId: string | null;
  assertionMode: string | null;
  contentBlockId: string | null;
  originClaimCandidateId: string | null;
  originModelRunId: string | null;
  canonicalUrl: string | null;
}

export interface EvidenceClaim {
  id: string;
  companyId: string;
  claim: string;
  type: EvidenceType;
  /** 0–100. `null` when a confidence cannot be responsibly assigned (e.g. conflicts). */
  confidence: number | null;
  sourceIds: string[];
  geography: Geography;
  period: string;
  excerpt: string;
  whyItMatters: string;
  /** For derived metrics: how the number was computed. */
  calculation?: string;
  relatedSignalId?: string;
  relatedOpportunityId?: string;
  conflictId?: string;
  origin?: "mock" | "persisted";
  persisted?: PersistedEvidenceTrace;
}

export interface ConflictPosition {
  sourceId: string;
  label: string;
  statement: string;
  year: string;
}

export interface Conflict {
  id: string;
  companyId: string;
  topic: string;
  claimId: string;
  positions: ConflictPosition[];
  conclusion: string;
  decision: string;
}

export interface EvidenceSummary {
  verifiedClaims: number;
  derivedMetrics: number;
  hypotheses: number;
  conflicts: number;
  sourcesRetained: number;
}
