import assert from "node:assert/strict";
import test from "node:test";
import { deriveEfesoFit } from "./fit-derivation";
import type { AccountSignalInput, KnowledgeFitTarget } from "./types";

const COMPANY = "co-1";

function signal(overrides: Partial<AccountSignalInput> & Pick<AccountSignalInput, "id" | "signalType" | "title">): AccountSignalInput {
  return {
    companyId: COMPANY,
    workspaceId: "ws-1",
    status: "active",
    signalNature: "event",
    summary: overrides.title,
    importance: "medium",
    confidenceTier: "supported",
    assertionMode: "announced",
    eventDate: "2026-03-01",
    geography: "Brazil",
    createdAt: "2026-03-01T00:00:00.000Z",
    tags: [],
    claims: [{ id: "c1", statement: overrides.title, assertionMode: "announced" }],
    evidenceSnippets: ["quoted evidence"],
    ...overrides,
  };
}

function knowledge(overrides: Partial<KnowledgeFitTarget> = {}): KnowledgeFitTarget {
  return {
    id: "ko-1",
    objectType: "capability",
    canonicalName: "Asset Productivity",
    status: "active",
    shortDescription: "demo",
    tags: [{ tagId: "t1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" }],
    relatedObjects: [],
    ...overrides,
  };
}

test("expected improvement is not treated as a delivered result", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    themes: [],
    knowledge: knowledge({
      objectType: "result",
      canonicalName: "Expected 20% improvement",
      knowledgeNature: "expected_benefit",
      outcomeStatus: "expected",
      tags: [
        { tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
        { tagId: "p1", category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
      ],
    }),
  });
  assert.equal(result.components.some((row) => row.componentType === "result_relevance"), false);
});

test("historical ROI remains a benchmark, not a promise", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    themes: [],
    knowledge: knowledge({
      objectType: "result",
      canonicalName: "Historical ROI 8:1",
      knowledgeNature: "historical_benchmark",
      outcomeStatus: "benchmark",
      tags: [{ tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" }],
    }),
  });
  assert.equal(result.components.some((row) => row.componentType === "result_relevance"), false);
});

test("restricted source can match without leaking the proposal text", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    themes: [],
    knowledge: knowledge({
      visibilityLevel: "restricted_account_team",
      confidentialityLevel: "highly_confidential",
      approvedForMatching: true,
      tags: [
        { tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
        { tagId: "p1", category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
      ],
    }),
  });
  assert.ok(result.fitScore > 0);
  assert.equal(result.components.every((row) => !/proposta|price|@/i.test(row.explanation)), true);
});
