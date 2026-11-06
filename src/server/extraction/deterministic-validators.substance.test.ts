import assert from "node:assert/strict";
import test from "node:test";
import { hasBlockingDeterministicFailure, runDeterministicValidators } from "./deterministic-validators";
import type { CandidateDraft, CitedBlock } from "./validation-types";

function draft(overrides: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    proposedStatement: "Normalized EBITDA grew by 8.9%.",
    claimCategory: "financial",
    claimType: "fact",
    assertionMode: "reported_actual",
    entityId: null,
    geographyLevel: null,
    countryCode: null,
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
    citations: [{ blockId: "b1", exactQuote: "Normalized EBITDA grew by 8.9%.", relationship: "supports" }],
    ...overrides,
  };
}

function block(id: string, text: string): CitedBlock {
  return { id, textContent: text, pageNumber: 1, sectionTitle: null, sourceSnapshotId: "snap" };
}

test("heading-like statements are rejected deterministically without LLM", () => {
  const candidate = draft({
    proposedStatement: "Divulgação de Resultados do 3T26",
    citations: [{ blockId: "b1", exactQuote: "Divulgação de Resultados do 3T26", relationship: "supports" }],
  });
  const records = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([["b1", block("b1", "Divulgação de Resultados do 3T26")]]),
  });
  assert.equal(hasBlockingDeterministicFailure(records), true);
  assert.ok(records.some((row) => row.validatorCode === "factual_substance" && row.result === "fail"));
});

test("statement numbers missing from quote window fail before LLM", () => {
  const candidate = draft({
    proposedStatement: "Ambev deve investir R$ 155 milhões na expansão de sua fábrica em Itapissuma, Pernambuco",
    claimCategory: "investment",
    citations: [
      {
        blockId: "b1",
        exactQuote: "O investimento será feito em melhorias no parque industrial para a produção de n",
        relationship: "supports",
      },
    ],
  });
  const records = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([
      [
        "b1",
        block(
          "b1",
          "O investimento será feito em melhorias no parque industrial para a produção de novas latas. Outro trecho longe menciona 999.",
        ),
      ],
    ]),
  });
  assert.equal(hasBlockingDeterministicFailure(records), true);
  assert.ok(
    records.some((row) => row.validatorCode === "statement_quote_numeric_alignment" && row.result === "fail"),
  );
});

test("aligned numeric claims still reach semantic validation", () => {
  const candidate = draft();
  const records = runDeterministicValidators({
    draft: candidate,
    blocksById: new Map([["b1", block("b1", "Normalized EBITDA grew by 8.9% in the quarter.")]]),
  });
  assert.equal(hasBlockingDeterministicFailure(records), false);
});
