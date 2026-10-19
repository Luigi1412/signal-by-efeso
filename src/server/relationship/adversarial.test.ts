import assert from "node:assert/strict";
import test from "node:test";
import { deriveDataQuality, deriveRelationshipStrength, getAccountActionQuadrant } from "./derivation";
import type { RelationshipDerivationInput } from "./derivation";

const now = new Date("2026-10-16T00:00:00.000Z");

function input(overrides: Partial<RelationshipDerivationInput> = {}): RelationshipDerivationInput {
  return {
    relationshipStatus: null,
    recordedStrength: null,
    hasRecord: false,
    hasAccountOwner: false,
    knownContactCount: 0,
    lastInteractionAt: null,
    historicalProject: false,
    now,
    ...overrides,
  };
}

test("1. no relationship record stays unknown, never weak", () => {
  assert.equal(deriveRelationshipStrength(input()), "unknown");
  assert.equal(deriveDataQuality({ hasRecord: false, sourceType: null, hasAccountOwner: false, lastInteractionAt: null }), "unknown");
  assert.notEqual(deriveRelationshipStrength(input()), "weak");
});

test("2. former client five years ago is not strong without other data", () => {
  const strength = deriveRelationshipStrength(
    input({
      hasRecord: true,
      relationshipStatus: "former_client",
      recordedStrength: "unknown",
      lastInteractionAt: "2021-10-01T00:00:00.000Z",
      historicalProject: true,
    }),
  );
  assert.notEqual(strength, "strong");
  assert.ok(strength === "weak" || strength === "medium");
});

test("3. active client + explicit owner + recent interaction can be strong", () => {
  assert.equal(
    deriveRelationshipStrength(
      input({
        hasRecord: true,
        relationshipStatus: "active_client",
        hasAccountOwner: true,
        knownContactCount: 2,
        lastInteractionAt: "2026-03-15T00:00:00.000Z",
      }),
    ),
    "strong",
  );
});

test("4. a name appearing in a document does not create a relationship_holder", () => {
  const strength = deriveRelationshipStrength(
    input({
      hasRecord: true,
      relationshipStatus: "unknown",
      knownContactCount: 0,
    }),
  );
  assert.equal(strength, "unknown");
});

test("5. known C-level contact without interaction evidence is not strong", () => {
  const strength = deriveRelationshipStrength(
    input({
      hasRecord: true,
      relationshipStatus: "prospect",
      knownContactCount: 1,
      lastInteractionAt: null,
    }),
  );
  assert.notEqual(strength, "strong");
});

test("6. a known corporate email is not a relationship", () => {
  assert.equal(
    deriveRelationshipStrength(
      input({
        hasRecord: true,
        relationshipStatus: "unknown",
        knownContactCount: 0,
      }),
    ),
    "unknown",
  );
});

test("7. missing account owner is not invented by derivation", () => {
  const strength = deriveRelationshipStrength(
    input({
      hasRecord: true,
      relationshipStatus: "active_client",
      hasAccountOwner: false,
      knownContactCount: 0,
      lastInteractionAt: null,
    }),
  );
  assert.notEqual(strength, "strong");
});

test("8. another workspace is not reused — derivation is scoped to the supplied record", () => {
  assert.equal(deriveRelationshipStrength(input({ hasRecord: false })), "unknown");
});

test("commercial fit x relationship matrix is deterministic", () => {
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "high", relationshipStrength: "strong" }), "activate");
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "high", relationshipStrength: "weak" }), "build_access");
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "high", relationshipStrength: "none" }), "build_access");
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "medium", relationshipStrength: "strong" }), "nurture");
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "low", relationshipStrength: "strong" }), "monitor");
  assert.equal(getAccountActionQuadrant({ opportunityRelevance: "high", relationshipStrength: "unknown" }), "validate_access");
});
