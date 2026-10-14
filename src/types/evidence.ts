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
