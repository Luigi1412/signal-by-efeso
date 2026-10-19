import assert from "node:assert/strict";
import test from "node:test";
import {
  asIsoCountryCode,
  asIsoCurrencyCode,
  asPersistableUuid,
  extractedClaimToDraft,
  focusTextForModel,
  serializeValidationBatchInput,
  serializeValidationInput,
} from "./extraction-input";
import type { CandidateDraft } from "./validation-types";
import type { SourceContentBlockRow } from "./pipeline-rows";
import type { ExtractedClaim } from "@/server/ai/schemas/claim-extraction-schema";

test("focusTextForModel keeps the financial paragraph in long chrome pages", () => {
  const nav = "Ecofuturo Institute Blog Contact Us Ombudsman PT EN Suzano About Us ".repeat(40);
  const facts =
    "Revenue reached R$ 13.3 billion from the sale of 3.7 million tons of pulp and paper. Suzano's adjusted EBITDA reached R$6.1 billion.";
  const text = `${nav}${facts}`;
  const focused = focusTextForModel(text, 800);
  assert.match(focused, /adjusted EBITDA reached R\$6\.1 billion/);
  assert.ok(focused.length <= 800);
});

test("asPersistableUuid keeps real UUIDs and drops company names", () => {
  assert.equal(asPersistableUuid("Suzano S.A."), null);
  assert.equal(asPersistableUuid(""), null);
  assert.equal(asPersistableUuid("not-a-uuid"), null);
  assert.equal(
    asPersistableUuid("64d3cdc3-0000-4000-8000-000000000000"),
    "64d3cdc3-0000-4000-8000-000000000000",
  );
});

test("asIsoCountryCode and asIsoCurrencyCode satisfy DB length checks", () => {
  assert.equal(asIsoCountryCode("Brazil"), "BR");
  assert.equal(asIsoCountryCode("BR"), "BR");
  assert.equal(asIsoCountryCode("Brasilia"), null);
  assert.equal(asIsoCurrencyCode("R$"), "BRL");
  assert.equal(asIsoCurrencyCode("brl"), "BRL");
  assert.equal(asIsoCurrencyCode("US$"), "USD");
  assert.equal(asIsoCurrencyCode("REALS"), null);
});

test("extractedClaimToDraft sanitizes llama persist fields without dropping the statement", () => {
  const claim = {
    statement: "Receita líquida de R$ 13,3 bilhões no 2T25.",
    claim_category: "financial_result",
    claim_type: "reported_figure",
    assertion_mode: "stated_fact",
    entity: { entity_id: "Suzano S.A.", name: "Suzano", role: "subject" },
    geography: { level: "country", country_code: "Brazil", state_region: null, city: null },
    period: { type: "quarter", start: "Q2 2025", end: "Q2 2025", as_of: "2025-06-30" },
    quantitative: {
      metric_name: "revenue",
      numeric_value: 13.3,
      unit: "BRL",
      currency_code: "R$",
      scale: "billion",
    },
    citations: [],
  } as unknown as ExtractedClaim;
  const draft = extractedClaimToDraft(claim);
  assert.equal(draft.entityId, null);
  assert.equal(draft.countryCode, "BR");
  assert.equal(draft.periodStart, null);
  assert.equal(draft.periodEnd, null);
  assert.equal(draft.asOfDate, "2025-06-30");
  assert.equal(draft.currencyCode, "BRL");
  assert.equal(draft.proposedStatement, "Receita líquida de R$ 13,3 bilhões no 2T25.");
});

test("extractedClaimToDraft drops currency on non-monetary units like leverage times", () => {
  const claim = {
    statement: "Net leverage ended the quarter at 3.1 times.",
    claim_category: "financial",
    claim_type: "fact",
    assertion_mode: "reported_actual",
    entity: { entity_id: null },
    geography: { level: null, country_code: null, state_region: null, city: null },
    period: { type: null, start: null, end: null, as_of: null },
    quantitative: {
      metric_name: "net_leverage",
      numeric_value: 3.1,
      unit: "times",
      currency_code: "USD",
      scale: "unit",
    },
    citations: [],
  } as unknown as ExtractedClaim;
  const draft = extractedClaimToDraft(claim);
  assert.equal(draft.unit, "times");
  assert.equal(draft.currencyCode, null);
});

test("serializeValidationInput sends a quote window instead of the full document", () => {
  const quote = "Revenue reached R$ 13.3 billion from the sale of 3.7 million tons of pulp and paper.";
  const blockText = `${"nav chrome ".repeat(400)}${quote} Operating cash generation reached R$ 4.1 billion. ${"footer ".repeat(400)}`;
  const draft: CandidateDraft = {
    proposedStatement: quote,
    claimCategory: "financial_result",
    claimType: "fact",
    assertionMode: "reported_actual",
    entityId: null,
    geographyLevel: "country",
    countryCode: "BR",
    stateRegion: null,
    city: null,
    periodType: "quarter",
    periodStart: null,
    periodEnd: null,
    asOfDate: "2025-06-30",
    metricName: "revenue",
    numericValue: 13.3,
    unit: "currency",
    currencyCode: "BRL",
    scale: "billion",
    citations: [{ blockId: "block-1", exactQuote: quote, relationship: "supports" }],
  };
  const block = {
    id: "block-1",
    text_content: blockText,
  } as SourceContentBlockRow;
  const serialized = serializeValidationInput({
    candidate: draft,
    candidateId: "28e76b64-50b3-4ff7-89fc-2fc757ffc00c",
    companyName: "Suzano",
    citedBlocks: [block],
  });
  const parsed = JSON.parse(serialized) as { block: string };
  assert.ok(serialized.includes("candidate_id"));
  assert.ok(serialized.includes(quote));
  assert.ok(parsed.block.includes("Revenue reached"));
  assert.ok(parsed.block.length < 900);
  assert.ok(serialized.length < blockText.length);
  const batch = serializeValidationBatchInput([
    { candidate: draft, candidateId: "28e76b64-50b3-4ff7-89fc-2fc757ffc00c", companyName: "Suzano", citedBlocks: [block] },
  ]);
  assert.ok(batch.includes("candidate_index"));
  assert.ok(batch.includes("requested_checks"));
});
