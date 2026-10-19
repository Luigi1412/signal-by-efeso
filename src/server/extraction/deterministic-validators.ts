import { locateExactQuote } from "./quote";
import type { CandidateDraft, CitedBlock, ValidationRecord } from "./validation-types";
import { DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import {
  assertionModeSchema,
  claimCategorySchema,
} from "@/server/ai/schemas/claim-extraction-schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = new Set(claimCategorySchema.options);
const ASSERTION_MODES = new Set(assertionModeSchema.options);
const GEOGRAPHY_LEVELS = new Set([
  "global",
  "region",
  "country",
  "state",
  "city",
  "site",
  "entity",
  "not_applicable",
]);
const PERIOD_TYPES = new Set([
  "instant",
  "month",
  "quarter",
  "semester",
  "year",
  "range",
  "as_of",
  "not_applicable",
]);
const SCALES = new Set(["unit", "thousand", "million", "billion", "trillion"]);

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function runDeterministicValidators(input: {
  draft: CandidateDraft;
  blocksById: Map<string, CitedBlock>;
}): ValidationRecord[] {
  const { draft, blocksById } = input;
  const results: ValidationRecord[] = [];

  results.push(schemaValidity(draft));
  results.push(citationExists(draft, blocksById));
  results.push(quoteIntegrity(draft, blocksById));
  results.push(numericConsistency(draft));
  results.push(unitCurrencyConsistency(draft));
  results.push(periodAlignment(draft));

  return results;
}

function schemaValidity(draft: CandidateDraft): ValidationRecord {
  const issues: string[] = [];
  if (!draft.proposedStatement.trim()) issues.push("empty_statement");
  if (!CATEGORIES.has(draft.claimCategory as never)) issues.push("invalid_category");
  if (draft.claimType !== "fact") issues.push("claim_type_must_be_fact");
  if (!ASSERTION_MODES.has(draft.assertionMode as never)) issues.push("invalid_assertion_mode");
  if (draft.geographyLevel && !GEOGRAPHY_LEVELS.has(draft.geographyLevel)) issues.push("invalid_geography_level");
  if (draft.countryCode && draft.countryCode.length !== 2) issues.push("country_code_length");
  if (draft.currencyCode && draft.currencyCode.length !== 3) issues.push("currency_code_length");
  if (draft.periodType && !PERIOD_TYPES.has(draft.periodType)) issues.push("invalid_period_type");
  if (draft.scale && !SCALES.has(draft.scale)) issues.push("invalid_scale");
  for (const field of [draft.periodStart, draft.periodEnd, draft.asOfDate]) {
    if (field && !ISO_DATE.test(field)) issues.push("invalid_date");
  }
  if (issues.length > 0) {
    return record("schema_validity", "fail", "blocking", "Candidate schema is invalid.", { issues });
  }
  return record("schema_validity", "pass", "info", "Candidate schema is valid.");
}

function citationExists(draft: CandidateDraft, blocksById: Map<string, CitedBlock>): ValidationRecord {
  if (draft.citations.length === 0) {
    return record("citation_exists", "fail", "blocking", "Candidate has no citations.");
  }
  const missing = draft.citations.filter((citation) => !blocksById.has(citation.blockId)).map((c) => c.blockId);
  if (missing.length > 0) {
    return record("citation_exists", "fail", "blocking", "Citation refers to an unknown block.", { missing });
  }
  const supporting = draft.citations.filter((citation) => (citation.relationship ?? "supports") === "supports");
  if (supporting.length === 0) {
    return record("citation_exists", "fail", "blocking", "Candidate has no supporting citation.");
  }
  return record("citation_exists", "pass", "info", "Citations exist in the supplied window.");
}

function quoteIntegrity(draft: CandidateDraft, blocksById: Map<string, CitedBlock>): ValidationRecord {
  const failures: string[] = [];
  let ambiguous = false;
  for (const citation of draft.citations) {
    const block = blocksById.get(citation.blockId);
    if (!block) continue;
    const location = locateExactQuote(block.textContent, citation.exactQuote);
    if (!location.found) failures.push(citation.blockId);
    if (location.ambiguous) ambiguous = true;
  }
  if (failures.length > 0) {
    return record("quote_integrity", "fail", "blocking", "exact_quote does not occur in the cited block.", {
      failures,
    });
  }
  if (ambiguous) {
    return record(
      "quote_integrity",
      "warn",
      "review",
      "exact_quote occurs more than once in the cited block; offsets were not invented.",
      { ambiguous: true },
    );
  }
  return record("quote_integrity", "pass", "info", "exact_quote occurs uniquely in the cited block.");
}

function numericConsistency(draft: CandidateDraft): ValidationRecord {
  if (draft.numericValue == null) {
    return record("numeric_consistency", "pass", "info", "No numeric value to check.");
  }
  if (!Number.isFinite(draft.numericValue)) {
    return record("numeric_consistency", "fail", "blocking", "numeric_value is not finite.");
  }
  const statement = draft.proposedStatement.toLowerCase();
  if (/\bexactly\b/.test(statement) && /\bup to\b|\baté\b/.test(statement)) {
    return record(
      "numeric_consistency",
      "fail",
      "blocking",
      "Statement treats an upper bound as an exact amount.",
    );
  }
  return record("numeric_consistency", "pass", "info", "Basic numeric checks passed.");
}

function unitCurrencyConsistency(draft: CandidateDraft): ValidationRecord {
  if (draft.currencyCode && draft.currencyCode.length !== 3) {
    return record("unit_currency_consistency", "fail", "blocking", "currency_code must have 3 letters.");
  }
  if (draft.currencyCode && draft.unit && draft.unit !== "currency" && !/currency|money|brl|usd|eur/i.test(draft.unit)) {
    return record(
      "unit_currency_consistency",
      "warn",
      "review",
      "Currency code is set but unit is not clearly monetary.",
    );
  }
  return record("unit_currency_consistency", "pass", "info", "Basic unit/currency checks passed.");
}

function periodAlignment(draft: CandidateDraft): ValidationRecord {
  if (draft.periodStart && draft.periodEnd && draft.periodEnd < draft.periodStart) {
    return record("period_alignment", "fail", "blocking", "period_end is before period_start.");
  }
  return record("period_alignment", "pass", "info", "Structural period checks passed.");
}

export function hasBlockingDeterministicFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}
