import assert from "node:assert/strict";
import test from "node:test";
import { computeKnowledgeCandidateFingerprint } from "./fingerprint";
import { coreKnowledgeName, mapSuggestedTag, normalizeKnowledgeName } from "./taxonomy";

test("taxonomy maps OpEx and operations excellence to Operational Excellence", () => {
  const opex = mapSuggestedTag("CAPABILITY_DOMAIN", "OpEx");
  assert.equal(opex.ok, true);
  if (opex.ok) assert.equal(opex.canonicalName, "Operational Excellence");
  const mapped = mapSuggestedTag("CAPABILITY_DOMAIN", "Operations excellence");
  assert.equal(mapped.ok, true);
  if (mapped.ok) assert.equal(mapped.canonicalName, "Operational Excellence");
});

test("unmapped tags do not invent canonical values", () => {
  const mapped = mapSuggestedTag("CAPABILITY_DOMAIN", "Market Leadership Consulting");
  assert.equal(mapped.ok, false);
});

test("BOOST and BOOST methodology share a core name", () => {
  assert.equal(coreKnowledgeName("BOOST"), coreKnowledgeName("BOOST methodology"));
  assert.equal(coreKnowledgeName("BOOST"), "boost");
});

test("Asset Productivity and Production Productivity remain distinct", () => {
  assert.notEqual(coreKnowledgeName("Asset Productivity"), coreKnowledgeName("Production Productivity"));
  const workspaceId = "11111111-1111-4111-8111-111111111111";
  const a = computeKnowledgeCandidateFingerprint({
    workspaceId,
    objectType: "capability",
    canonicalName: "Asset Productivity",
  });
  const b = computeKnowledgeCandidateFingerprint({
    workspaceId,
    objectType: "capability",
    canonicalName: "Production Productivity",
  });
  assert.notEqual(a, b);
});

test("industry aliases map to the closed catalog", () => {
  const mapped = mapSuggestedTag("INDUSTRY", "mining");
  assert.equal(mapped.ok, true);
  if (mapped.ok) assert.equal(mapped.canonicalName, "Mining, Metals and Minerals");
  assert.equal(normalizeKnowledgeName("Food & Beverage"), "food and beverage");
});
