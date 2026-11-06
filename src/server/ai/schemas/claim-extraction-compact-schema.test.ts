import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import {
  claimExtractionCompactOutputSchema,
  expandCompactExtraction,
} from "./claim-extraction-compact-schema";

test("expandCompactExtraction maps flat claims into full grounded schema", () => {
  const compact = claimExtractionCompactOutputSchema.parse({
    schema_version: CLAIM_EXTRACTION_SCHEMA_VERSION,
    claims: [
      {
        statement: "A Ambev reportou lucro líquido de R$ 4,37 bilhões no 3T26.",
        claim_category: "financial",
        assertion_mode: "reported_actual",
        metric_name: "net_income",
        numeric_value: 4.37,
        unit: "BRL",
        currency_code: "BRL",
        period_end: "2026-09-30",
        as_of: null,
        block_id: "b1",
        exact_quote: "lucro líquido de R$ 4,37 bilhões",
        model_extraction_confidence: 80,
      },
    ],
  });
  const full = expandCompactExtraction(compact);
  assert.equal(full.claims.length, 1);
  assert.equal(full.claims[0]?.claim_type, "fact");
  assert.equal(full.claims[0]?.quantitative.numeric_value, 4.37);
  assert.equal(full.claims[0]?.citations[0]?.block_id, "b1");
});

test("compact schema coerces pipe-copied enums and keeps only the first claim", () => {
  const compact = claimExtractionCompactOutputSchema.parse({
    schema_version: CLAIM_EXTRACTION_SCHEMA_VERSION,
    claims: [
      {
        statement: "Ambev propõe reestruturação societária.",
        claim_category: "strategy|corporate governance",
        assertion_mode: "announced|planned",
        block_id: "b2",
        exact_quote: "propose a corporate restructuring",
      },
      {
        statement: "segunda claim descartada",
        claim_category: "financial",
        assertion_mode: "reported_actual",
        block_id: "b3",
        exact_quote: "segunda",
      },
    ],
  });
  assert.equal(compact.claims.length, 1);
  assert.equal(compact.claims[0]?.claim_category, "strategy");
  assert.equal(compact.claims[0]?.assertion_mode, "announced");
});
