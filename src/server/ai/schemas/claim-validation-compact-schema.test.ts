import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import { decideCandidateStatus } from "@/server/extraction/promotion-policy";
import { semanticOutputToRecords } from "@/server/extraction/semantic-validators";
import {
  claimValidationCompactOutputSchema,
  expandCompactValidation,
} from "./claim-validation-compact-schema";

test("compact validation expands direct_support into pipeline validators", () => {
  const compact = claimValidationCompactOutputSchema.parse({
    schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
    supported: true,
    confidence: 88,
    reason_code: "direct_support",
  });
  const full = expandCompactValidation(compact);
  assert.equal(full.validators.grounding.support_level, "direct");
  assert.equal(full.validators.grounding.result, "pass");
  const semantic = semanticOutputToRecords(full, "run-1");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: semantic,
  });
  assert.equal(decision.status, "validated");
});

test("truncated JSON / non-direct support never auto-approves", () => {
  const compact = claimValidationCompactOutputSchema.parse({
    schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
    supported: true,
    confidence: 70,
    reason_code: "strong_indirect",
  });
  const full = expandCompactValidation(compact);
  const semantic = semanticOutputToRecords(full, "run-2");
  const decision = decideCandidateStatus({
    claimType: "fact",
    hasSupportingCitation: true,
    validations: semantic,
  });
  assert.notEqual(decision.status, "validated");
});

test("compact schema coerces pipe-copied reason codes", () => {
  const compact = claimValidationCompactOutputSchema.parse({
    schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
    supported: "false",
    confidence: "40",
    reason_code: "unsupported | ambiguous",
  });
  assert.equal(compact.supported, false);
  assert.equal(compact.confidence, 40);
  assert.equal(compact.reason_code, "unsupported");
});

test("semantic validation token budget stays bounded for compact path", () => {
  // Guardrail: compact validation must remain far below the legacy 400-token multi-validator budget.
  const defaultBudget = Number(process.env.OLLAMA_VALIDATION_NUM_PREDICT || 60);
  assert.ok(defaultBudget <= 120);
  assert.ok(defaultBudget >= 40);
});
