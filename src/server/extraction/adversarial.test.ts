import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import { runDeterministicValidators } from "./deterministic-validators";
import { decideCandidateStatus } from "./promotion-policy";
import { semanticOutputToRecords } from "./semantic-validators";
import type { CandidateDraft, CitedBlock } from "./validation-types";
import type { ClaimValidationOutput } from "@/server/ai/schemas/claim-validation-schema";

function block(id: string, text: string): CitedBlock {
  return { id, textContent: text, pageNumber: 1, sectionTitle: null, sourceSnapshotId: "snap" };
}

function draft(overrides: Partial<CandidateDraft> & Pick<CandidateDraft, "proposedStatement" | "citations">): CandidateDraft {
  return {
    claimCategory: "financial",
    claimType: "fact",
    assertionMode: "reported_actual",
    entityId: null,
    geographyLevel: "country",
    countryCode: "BR",
    stateRegion: null,
    city: null,
    periodType: null,
    periodStart: null,
    periodEnd: null,
    asOfDate: null,
    metricName: null,
    numericValue: null,
    unit: null,
    currencyCode: null,
    scale: null,
    ...overrides,
  };
}

function failOutput(code: keyof ClaimValidationOutput["validators"]): ClaimValidationOutput {
  const pass = { result: "pass" as const, reason: "ok" };
  const fail = { result: "fail" as const, reason: "distorted" };
  const groundingPass = { result: "pass" as const, support_level: "direct" as const, reason: "ok" };
  const validators: ClaimValidationOutput["validators"] = {
    atomicity: pass,
    grounding: groundingPass,
    geography_alignment: pass,
    entity_alignment: pass,
    period_alignment: pass,
    numeric_consistency: pass,
    unit_currency_consistency: pass,
    modality_preservation: pass,
    unsupported_inference: pass,
  };
  if (code === "grounding") {
    validators.grounding = { result: "fail", support_level: "none", reason: "not supported" };
  } else {
    validators[code] = fail;
  }
  return { schema_version: CLAIM_VALIDATION_SCHEMA_VERSION, validators };
}

test("geography distortion does not auto-promote", () => {
  const source = block("b1", "South America revenue increased 20%.");
  const candidate = draft({
    proposedStatement: "Brazil revenue increased 20%.",
    geographyLevel: "country",
    countryCode: "BR",
    citations: [{ blockId: "b1", exactQuote: "South America revenue increased 20%." }],
  });
  const deterministic = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([[source.id, source]]),
  });
  const semantic = semanticOutputToRecords(failOutput("geography_alignment"), "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: [...deterministic, ...semantic],
  });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.rejectionReasonCode, "geography_alignment");
});

test("modality distortion does not auto-promote", () => {
  const source = block("b1", "Capacity is expected to increase by 30%.");
  const candidate = draft({
    proposedStatement: "Capacity increased by 30%.",
    assertionMode: "reported_actual",
    claimCategory: "capacity",
    citations: [{ blockId: "b1", exactQuote: "Capacity is expected to increase by 30%." }],
  });
  const deterministic = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([[source.id, source]]),
  });
  const semantic = semanticOutputToRecords(failOutput("modality_preservation"), "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: [...deterministic, ...semantic],
  });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.rejectionReasonCode, "modality_preservation");
});

test("upper-bound exact amount does not auto-promote", () => {
  const source = block("b1", "The company announced an investment of up to R$500 million.");
  const candidate = draft({
    proposedStatement: "The company will invest exactly R$500 million.",
    assertionMode: "announced",
    claimCategory: "investment",
    numericValue: 500,
    unit: "currency",
    currencyCode: "BRL",
    scale: "million",
    citations: [{ blockId: "b1", exactQuote: "The company announced an investment of up to R$500 million." }],
  });
  const deterministic = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([[source.id, source]]),
  });
  const semantic = semanticOutputToRecords(failOutput("numeric_consistency"), "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: [...deterministic, ...semantic],
  });
  assert.notEqual(decision.status, "validated");
});

test("metric swap does not auto-promote", () => {
  const source = block("b1", "Revenue was R$2.0 billion.");
  const candidate = draft({
    proposedStatement: "EBITDA was R$2.0 billion.",
    metricName: "ebitda",
    numericValue: 2,
    scale: "billion",
    currencyCode: "BRL",
    unit: "currency",
    citations: [{ blockId: "b1", exactQuote: "Revenue was R$2.0 billion." }],
  });
  const semantic = semanticOutputToRecords(failOutput("unsupported_inference"), "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: semantic,
  });
  assert.equal(decision.status, "rejected");
});

test("invented causality does not auto-promote", () => {
  const source = block("b1", "Inventory increased 15%. Revenue increased 3%.");
  const candidate = draft({
    proposedStatement: "Inventory increased because sales slowed.",
    citations: [{ blockId: "b1", exactQuote: "Inventory increased 15%." }],
  });
  const semantic = semanticOutputToRecords(failOutput("unsupported_inference"), "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: semantic,
  });
  assert.equal(decision.status, "rejected");
});

test("valid announced Brazil investment can promote when validators pass", () => {
  const quote = "The company announced an investment of R$500 million in its Brazilian manufacturing operation.";
  const source = block("b1", quote);
  const candidate = draft({
    proposedStatement: quote,
    assertionMode: "announced",
    claimCategory: "investment",
    geographyLevel: "country",
    countryCode: "BR",
    metricName: "announced_investment",
    numericValue: 500,
    unit: "currency",
    currencyCode: "BRL",
    scale: "million",
    citations: [{ blockId: "b1", exactQuote: quote }],
  });
  const deterministic = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([[source.id, source]]),
  });
  const semantic = semanticOutputToRecords(
    {
      schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
      validators: {
        atomicity: { result: "pass", reason: "one assertion" },
        grounding: { result: "pass", support_level: "direct", reason: "verbatim" },
        geography_alignment: { result: "pass", reason: "Brazil" },
        entity_alignment: { result: "pass", reason: "company" },
        period_alignment: { result: "pass", reason: "n/a" },
        numeric_consistency: { result: "pass", reason: "500" },
        unit_currency_consistency: { result: "pass", reason: "BRL million" },
        modality_preservation: { result: "pass", reason: "announced" },
        unsupported_inference: { result: "pass", reason: "none" },
      },
    },
    "run-1",
  );
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: [...deterministic, ...semantic],
  });
  assert.equal(decision.status, "validated");
});

test("hallucinated quote fails quote_integrity without fuzzy matching", () => {
  const source = block("b1", "South America revenue increased 20%.");
  const candidate = draft({
    proposedStatement: "Brazil revenue increased 20%.",
    citations: [{ blockId: "b1", exactQuote: "Brazil revenue increased 20%." }],
  });
  const deterministic = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([[source.id, source]]),
  });
  const quote = deterministic.find((row) => row.validatorCode === "quote_integrity");
  assert.equal(quote?.result, "fail");
  assert.equal(quote?.severity, "blocking");
});
