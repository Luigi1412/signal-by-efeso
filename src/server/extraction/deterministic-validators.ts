import { ambiguousMetric } from "@/server/product/evidence-quality";
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

  const evidence = draft.citations.map(c => c.exactQuote).join(" ");
  if (ambiguousMetric(draft.metricName, draft.proposedStatement, evidence)) {
    results.push(record("metric_precision", "warn", "review", "Earnings is economically ambiguous: define net income, operating income, EBITDA or EPS from explicit source evidence."));
  }
  results.push(schemaValidity(draft));
  results.push(citationExists(draft, blocksById));
  results.push(quoteIntegrity(draft, blocksById));
  results.push(numericConsistency(draft));
  results.push(unitCurrencyConsistency(draft));
  results.push(periodAlignment(draft));
  results.push(factualSubstance(draft));
  results.push(statementQuoteNumericAlignment(draft, blocksById));

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

const HEADING_ONLY =
  /^(destaques|divulga[cç][aã]o|resultados|earnings|highlights|overview|agenda|sum[aá]rio|summary|faqs?|governan[cç]a|hist[oó]rico|contato|contact)(\b|$)/i;
const HAS_PREDICATE =
  /\b(is|are|was|were|has|have|had|will|grew|growth|invest|announc|report|reach|total|amount|equal|supervis|prorrog|receb|ser[aá]|deve|foi|foram|tem|h[aá]|cresceu|investiu)\b|[%=]|R\$|USD|EUR/i;

/** Reject title/heading chrome that is not a factual assertion — no LLM needed. */
function factualSubstance(draft: CandidateDraft): ValidationRecord {
  const statement = draft.proposedStatement.replace(/\s+/g, " ").trim();
  if (statement.length < 24) {
    return record("factual_substance", "fail", "blocking", "Statement is too short to be a material fact.", {
      length: statement.length,
    });
  }
  // IR chrome titles often include a period label ("3T26") — digits alone are not a predicate.
  if (HEADING_ONLY.test(statement) && !HAS_PREDICATE.test(statement)) {
    return record("factual_substance", "fail", "blocking", "Statement looks like a heading, not a factual claim.");
  }
  if (!HAS_PREDICATE.test(statement) && !/\d/.test(statement) && statement.split(/\s+/).length <= 6) {
    return record("factual_substance", "fail", "blocking", "Statement lacks a factual predicate.");
  }
  return record("factual_substance", "pass", "info", "Statement has factual substance.");
}

/** Numbers asserted in the statement must appear in the exact quote or tight quote window. */
function statementQuoteNumericAlignment(
  draft: CandidateDraft,
  blocksById: Map<string, CitedBlock>,
): ValidationRecord {
  const statementNums = extractComparableNumbers(draft.proposedStatement);
  if (statementNums.length === 0) {
    return record(
      "statement_quote_numeric_alignment",
      "pass",
      "info",
      "No statement numbers requiring quote alignment.",
    );
  }
  const evidenceText = draft.citations
    .map((citation) => {
      const block = blocksById.get(citation.blockId);
      const quote = citation.exactQuote ?? "";
      if (!block) return quote;
      // Keep alignment local to the citation — do not scan the entire source page.
      const decoded = block.textContent;
      const idx = decoded.toLowerCase().indexOf(quote.toLowerCase());
      if (idx < 0) return quote;
      return decoded.slice(Math.max(0, idx - 40), Math.min(decoded.length, idx + quote.length + 120));
    })
    .join("\n");
  const evidenceNums = new Set(extractComparableNumbers(evidenceText));
  const missing = statementNums.filter((value) => !evidenceNums.has(value));
  if (missing.length > 0) {
    return record(
      "statement_quote_numeric_alignment",
      "fail",
      "blocking",
      "Statement numbers are not present in the cited evidence.",
      { missing },
    );
  }
  return record(
    "statement_quote_numeric_alignment",
    "pass",
    "info",
    "Statement numbers appear in the cited evidence.",
  );
}

function extractComparableNumbers(text: string): string[] {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return [
    ...new Set(
      matches.map((raw) => {
        // Normalize decimal comma; keep simple decimals comparable as strings.
        if (/^\d+,\d+$/.test(raw)) return raw.replace(",", ".");
        if (/^\d{1,3}(\.\d{3})+,\d+$/.test(raw)) return raw.replace(/\./g, "").replace(",", ".");
        if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) return raw.replace(/,/g, "");
        return raw;
      }),
    ),
  ];
}

export function hasBlockingDeterministicFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}
