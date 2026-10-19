import { sha256Json } from "./sha256";

export interface CandidateFingerprintInput {
  sourceSnapshotId: string;
  proposedStatement: string;
  claimCategory: string;
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
}

export function normalizeProposedStatement(statement: string): string {
  return statement.trim().replace(/\s+/g, " ").toLowerCase();
}

export function canonicalFingerprintPayload(input: CandidateFingerprintInput): Record<string, unknown> {
  return {
    source_snapshot_id: input.sourceSnapshotId,
    proposed_statement: normalizeProposedStatement(input.proposedStatement),
    claim_category: input.claimCategory,
    assertion_mode: input.assertionMode,
    entity_id: input.entityId,
    geography: {
      level: input.geographyLevel,
      country_code: input.countryCode ? input.countryCode.toUpperCase() : null,
      state_region: input.stateRegion,
      city: input.city,
    },
    period: {
      type: input.periodType,
      start: input.periodStart,
      end: input.periodEnd,
      as_of: input.asOfDate,
    },
    metric_name: input.metricName,
    numeric_value: input.numericValue,
    unit: input.unit,
    currency_code: input.currencyCode ? input.currencyCode.toUpperCase() : null,
    scale: input.scale,
  };
}

export function computeCandidateFingerprint(input: CandidateFingerprintInput): string {
  return sha256Json(canonicalFingerprintPayload(input));
}
