export const DETERMINISTIC_VALIDATOR_CODES = [
  "schema_validity",
  "citation_exists",
  "quote_integrity",
  "numeric_consistency",
  "unit_currency_consistency",
  "period_alignment",
] as const;

export const SEMANTIC_VALIDATOR_CODES = [
  "atomicity",
  "grounding",
  "geography_alignment",
  "entity_alignment",
  "period_alignment",
  "numeric_consistency",
  "unit_currency_consistency",
  "modality_preservation",
  "unsupported_inference",
] as const;

export type ValidatorResult = "pass" | "warn" | "fail";
export type ValidatorSeverity = "info" | "review" | "blocking";
export type ValidatorType = "deterministic" | "model" | "hybrid";
export type CandidateStatus = "pending_validation" | "needs_review" | "validated" | "rejected" | "promoted";

export interface ValidationRecord {
  validatorCode: string;
  validatorVersion: string;
  validatorType: ValidatorType;
  result: ValidatorResult;
  severity: ValidatorSeverity;
  message: string | null;
  details: Record<string, unknown>;
  modelRunId?: string | null;
}

export interface CitedBlock {
  id: string;
  textContent: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  sourceSnapshotId: string;
}

export interface ProposedCitation {
  blockId: string;
  exactQuote: string;
  relationship?: "supports" | "contextualizes";
}

export interface CandidateDraft {
  proposedStatement: string;
  claimCategory: string;
  claimType: string;
  assertionMode: string;
  entityId: string | null;
  geographyLevel: string | null;
  countryCode: string | null;
  stateRegion: string | null;
  city: string | null;
  periodType: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  asOfDate: string | null;
  metricName: string | null;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  scale: string | null;
  citations: ProposedCitation[];
}
