import type { ClaimCandidateRow, SourceContentBlockRow } from "./pipeline-rows";
import type { ExtractedClaim } from "@/server/ai/schemas/claim-extraction-schema";
import { decodeHtmlEntities } from "@/server/parsers/html-entities";
import { SEMANTIC_VALIDATOR_CODES, type CandidateDraft } from "./validation-types";

const FINANCIAL_FOCUS =
  /EBITDA|Net revenue|Revenue reached|receita l[ií]quida|lucro l[ií]quido|R\$\s*\d|operating cash|capex|guidance/i;

export function focusTextForModel(text: string, maxChars = 3500): string {
  if (text.length <= maxChars) return text;
  const match = text.search(FINANCIAL_FOCUS);
  const start = match >= 0 ? Math.max(0, match - 280) : 0;
  return text.slice(start, start + maxChars);
}

export function serializeExtractionWindow(blocks: SourceContentBlockRow[]): string {
  return JSON.stringify({
    blocks: blocks.map((block) => ({
      block_id: block.id,
      text: focusTextForModel(decodeHtmlEntities(block.text_content)),
    })),
  });
}

const QUOTE_WINDOW_RADIUS = 280;

export function quoteWindow(blockText: string, quote: string, radius = QUOTE_WINDOW_RADIUS): string {
  const decoded = decodeHtmlEntities(blockText);
  const needle = decodeHtmlEntities(quote).trim();
  if (!needle) return focusTextForModel(decoded, radius * 2);
  const idx = decoded.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return focusTextForModel(decoded, radius * 2);
  const start = Math.max(0, idx - 80);
  const end = Math.min(decoded.length, idx + needle.length + radius);
  return decoded.slice(start, end);
}

export function serializeValidationInput(input: {
  candidate: CandidateDraft;
  candidateId?: string;
  companyName?: string | null;
  citedBlocks: SourceContentBlockRow[];
  adjacentContext?: { blockId: string; text: string }[];
}): string {
  const quote = input.candidate.citations[0]?.exactQuote ?? "";
  const block = input.citedBlocks[0];
  return JSON.stringify({
    candidate_id: input.candidateId ?? null,
    statement: input.candidate.proposedStatement,
    exact_quote: quote,
    block: block ? quoteWindow(block.text_content, quote) : "",
    company: input.companyName ?? null,
    assertion_mode: input.candidate.assertionMode,
    period: {
      type: input.candidate.periodType,
      start: input.candidate.periodStart,
      end: input.candidate.periodEnd,
      as_of: input.candidate.asOfDate,
    },
    number: {
      metric_name: input.candidate.metricName,
      numeric_value: input.candidate.numericValue,
      unit: input.candidate.unit,
      currency_code: input.candidate.currencyCode,
    },
    requested_checks: SEMANTIC_VALIDATOR_CODES,
  });
}

export function serializeValidationBatchInput(
  items: Array<{
    candidate: CandidateDraft;
    candidateId?: string;
    companyName?: string | null;
    citedBlocks: SourceContentBlockRow[];
    adjacentContext?: { blockId: string; text: string }[];
  }>,
): string {
  return JSON.stringify({
    candidates: items.map((item, index) => ({
      candidate_index: index,
      ...JSON.parse(serializeValidationInput(item)),
    })),
  });
}

export function claimCandidateToDraft(
  candidate: Pick<
    ClaimCandidateRow,
    | "proposed_statement"
    | "claim_category"
    | "claim_type"
    | "assertion_mode"
    | "entity_id"
    | "geography_level"
    | "country_code"
    | "state_region"
    | "city"
    | "period_type"
    | "period_start"
    | "period_end"
    | "as_of_date"
    | "metric_name"
    | "numeric_value"
    | "unit"
    | "currency_code"
    | "scale"
  >,
  evidence: Array<{ source_content_block_id: string; exact_quote: string; relationship: string }>,
): CandidateDraft {
  return {
    proposedStatement: candidate.proposed_statement,
    claimCategory: candidate.claim_category,
    claimType: candidate.claim_type,
    assertionMode: candidate.assertion_mode,
    entityId: candidate.entity_id,
    geographyLevel: candidate.geography_level,
    countryCode: candidate.country_code,
    stateRegion: candidate.state_region,
    city: candidate.city,
    periodType: candidate.period_type,
    periodStart: candidate.period_start,
    periodEnd: candidate.period_end,
    asOfDate: candidate.as_of_date,
    metricName: candidate.metric_name,
    numericValue: candidate.numeric_value,
    unit: candidate.unit,
    currencyCode: candidate.currency_code,
    scale: candidate.scale,
    citations: evidence.map((row) => ({
      blockId: row.source_content_block_id,
      exactQuote: row.exact_quote,
      relationship: row.relationship === "contextualizes" ? "contextualizes" : "supports",
    })),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asIsoDate(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asPersistableUuid(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  return UUID_RE.test(trimmed) ? trimmed : null;
}

export function asIsoCountryCode(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "BRAZIL" || upper === "BRASIL") return "BR";
  if (upper === "UNITED STATES" || upper === "USA") return "US";
  return /^[A-Z]{2}$/.test(upper) ? upper : null;
}

export function asIsoCurrencyCode(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase().replace(/\s+/g, "");
  if (upper === "R$" || upper === "REAL" || upper === "REAIS") return "BRL";
  if (upper === "$" || upper === "US$" || upper === "USD$" || upper === "DOLLAR") return "USD";
  if (upper === "€" || upper === "EUR€") return "EUR";
  return /^[A-Z]{3}$/.test(upper) ? upper : null;
}

export function extractedClaimToDraft(claim: ExtractedClaim): CandidateDraft {
  const entity = claim.entity ?? { entity_id: null };
  const geography = claim.geography ?? {
    level: null,
    country_code: null,
    state_region: null,
    city: null,
  };
  const period = claim.period ?? { type: null, start: null, end: null, as_of: null };
  const quantitative = claim.quantitative ?? {
    metric_name: null,
    numeric_value: null,
    unit: null,
    currency_code: null,
    scale: null,
  };
  return {
    proposedStatement: claim.statement.trim(),
    claimCategory: claim.claim_category,
    claimType: claim.claim_type,
    assertionMode: claim.assertion_mode,
    entityId: asPersistableUuid(entity.entity_id),
    geographyLevel: geography.level,
    countryCode: asIsoCountryCode(geography.country_code),
    stateRegion: emptyToNull(geography.state_region),
    city: emptyToNull(geography.city),
    periodType: period.type,
    periodStart: asIsoDate(period.start),
    periodEnd: asIsoDate(period.end),
    asOfDate: asIsoDate(period.as_of),
    metricName: emptyToNull(quantitative.metric_name),
    numericValue: typeof quantitative.numeric_value === "number" && Number.isFinite(quantitative.numeric_value)
      ? quantitative.numeric_value
      : null,
    unit: normalizeUnit(emptyToNull(quantitative.unit), asIsoCurrencyCode(quantitative.currency_code)),
    currencyCode: currencyForUnit(emptyToNull(quantitative.unit), asIsoCurrencyCode(quantitative.currency_code)),
    scale: quantitative.scale,
    citations: (claim.citations ?? []).map((citation) => ({
      blockId: citation.block_id,
      exactQuote: citation.exact_quote,
      relationship: "supports",
    })),
  };
}

function normalizeUnit(unit: string | null, currencyCode: string | null): string | null {
  if (!unit) return null;
  if (currencyCode && /^(R\$|US\$|€|BRL|USD|EUR)$/i.test(unit)) return "currency";
  return unit;
}

function currencyForUnit(unit: string | null, currencyCode: string | null): string | null {
  if (!currencyCode) return null;
  if (unit && /^(times|x|multiple|ratio|%|percent|pp)$/i.test(unit)) return null;
  return currencyCode;
}
