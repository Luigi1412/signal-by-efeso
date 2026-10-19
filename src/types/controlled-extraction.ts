export interface ExtractionCandidateView {
  id: string;
  statement: string;
  status: string;
  assertionMode: string;
  claimCategory: string;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
  originModelRunId: string;
  citations: {
    exactQuote: string;
    pageNumber: number | null;
    sectionTitle: string | null;
    relationship: string;
  }[];
  validations: {
    validatorCode: string;
    result: string;
    severity: string;
    message: string | null;
    supportLevel?: unknown;
  }[];
}

export interface ControlledExtractionSummary {
  snapshotId: string;
  sourceId: string;
  reusedSnapshot: boolean;
  parserName: string;
  parserVersion: string;
  blockCount: number;
  windowCount: number;
  candidateCount: number;
  promotedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  candidates: ExtractionCandidateView[];
}
