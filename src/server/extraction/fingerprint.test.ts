import assert from "node:assert/strict";
import test from "node:test";
import { computeCandidateFingerprint, normalizeProposedStatement } from "./fingerprint";

const base = {
  sourceSnapshotId: "11111111-1111-4111-8111-111111111111",
  proposedStatement: "The company announced an investment of R$500 million.",
  claimCategory: "investment",
  assertionMode: "announced",
  entityId: null,
  geographyLevel: "country",
  countryCode: "BR",
  stateRegion: null,
  city: null,
  periodType: null,
  periodStart: null,
  periodEnd: null,
  asOfDate: null,
  metricName: "announced_investment",
  numericValue: 500,
  unit: "currency",
  currencyCode: "BRL",
  scale: "million",
};

test("fingerprint is stable for equivalent normalized statements", () => {
  const a = computeCandidateFingerprint(base);
  const b = computeCandidateFingerprint({
    ...base,
    proposedStatement: "  The company   announced an investment of R$500 million. ",
  });
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("fingerprint changes when geography changes", () => {
  const a = computeCandidateFingerprint(base);
  const b = computeCandidateFingerprint({ ...base, countryCode: "AR" });
  assert.notEqual(a, b);
});

test("statement normalization collapses whitespace", () => {
  assert.equal(normalizeProposedStatement("  A   B  "), "a b");
});
