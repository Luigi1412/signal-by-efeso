import assert from "node:assert/strict";
import test from "node:test";
import type { AccountSignalInput, AccountThemeDraft, KnowledgeFitTarget } from "@/server/intelligence/types";
import { runOpportunityDeterministicValidators } from "./deterministic-validators";
import {
  deriveOpportunityConfidence,
  deriveOpportunityRelevance,
  deriveOpportunityUrgency,
} from "./derivation";
import { fingerprintFromDraft } from "./fingerprint";
import { proposeOpportunityDrafts } from "./propose";
import { decideOpportunityCandidateStatus } from "./promotion-policy";
import type { ActiveFitInput, OpportunityDerivationInput, OpportunityDraft } from "./types";

const WORKSPACE = "ws-1";
const COMPANY = "co-1";

function signal(
  overrides: Partial<AccountSignalInput> & Pick<AccountSignalInput, "id" | "signalType" | "title">,
): AccountSignalInput {
  return {
    companyId: COMPANY,
    workspaceId: WORKSPACE,
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
    claims: [{ id: `c-${overrides.id}`, statement: overrides.title, assertionMode: "announced" }],
    evidenceSnippets: ["quoted evidence"],
    ...overrides,
  };
}

function fit(overrides: Partial<ActiveFitInput> & Pick<ActiveFitInput, "id" | "knowledgeName">): ActiveFitInput {
  return {
    companyId: COMPANY,
    workspaceId: WORKSPACE,
    knowledgeObjectId: `ko-${overrides.knowledgeName}`,
    knowledgeType: "capability",
    knowledgeStatus: "active",
    status: "active",
    fitLevel: "high",
    fitScore: 10,
    fitReasonSummary: "Matched because components are visible.",
    relatedCases: [],
    relatedMethodologies: [],
    tags: [{ category: "CAPABILITY_DOMAIN", canonicalName: overrides.knowledgeName }],
    ...overrides,
  };
}

function knowledge(name: string, status = "active"): KnowledgeFitTarget {
  return {
    id: `ko-${name}`,
    objectType: "capability",
    canonicalName: name,
    status,
    shortDescription: "demo",
    tags: [{ tagId: "t1", category: "CAPABILITY_DOMAIN", canonicalName: name }],
    relatedObjects: [],
  };
}

function themes(names: string[]): AccountThemeDraft[] {
  return names.map((name) => ({
    tagId: name,
    category: "CAPABILITY_DOMAIN",
    canonicalName: name,
    signalCount: 2,
    weightedImportance: "high",
    lastSeenAt: "2026-03-01T00:00:00.000Z",
    supportingSignalIds: ["s1"],
  }));
}

function derivation(overrides: Partial<OpportunityDerivationInput> = {}): OpportunityDerivationInput {
  return {
    companyId: COMPANY,
    companyExists: true,
    companyResolved: true,
    workspaceId: WORKSPACE,
    signals: [],
    themes: [],
    tensions: [],
    accountIntelligence: {
      id: "ai-1",
      companyId: COMPANY,
      status: "active",
      headline: "Headline",
      executiveSummary: "Summary",
    },
    fits: [],
    knowledge: [],
    ...overrides,
  };
}

function contextFrom(draft: OpportunityDraft, input: OpportunityDerivationInput) {
  const triggerSignals = input.signals.filter((row) =>
    draft.signalLinks.some((link) => link.signalId === row.id && link.relationshipType === "trigger"),
  );
  return {
    companyId: COMPANY,
    companyExists: true,
    companyResolved: true,
    workspaceId: WORKSPACE,
    draft,
    signals: input.signals,
    fits: input.fits,
    knowledge: input.knowledge,
    derivedMaturity: draft.maturity,
    derivedRelevance: draft.relevanceLevel,
    derivedUrgency: draft.urgencyLevel,
    derivedConfidence: draft.confidenceTier,
    existingFingerprints: [] as string[],
    similarHypothesisFingerprints: [] as string[],
    triggerSignals,
  };
}

test("1 capacity increase + asset productivity does not assert the client needs consulting", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Company announces a capacity increase" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity", fitLevel: "high" })],
    knowledge: [knowledge("Asset Productivity")],
    themes: themes(["capacity"]),
  });
  const drafts = proposeOpportunityDrafts(input);
  assert.ok(drafts.length > 0);
  for (const draft of drafts) {
    assert.match(draft.title, /potencial/i);
    assert.equal(/client needs asset productivity consulting/i.test(draft.summary), false);
    assert.notEqual(draft.confidenceTier, "direct");
  }
});

test("2 CEO change + supply chain medium does not generate a supply chain opportunity", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "leadership_change", title: "Company announces a CEO change" })],
    fits: [fit({ id: "f1", knowledgeName: "Supply Chain", fitLevel: "medium" })],
    knowledge: [knowledge("Supply Chain")],
  });
  const drafts = proposeOpportunityDrafts(input);
  assert.equal(
    drafts.some((draft) => draft.opportunityType === "supply_chain"),
    false,
  );
});

test("3 financial pressure + cost reduction is a potential opportunity, not a launched program", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "financial_pressure", title: "Company reports financial pressure" })],
    fits: [fit({ id: "f1", knowledgeName: "Cost Reduction", fitLevel: "high" })],
    knowledge: [knowledge("Cost Reduction")],
    themes: themes(["cost"]),
  });
  const drafts = proposeOpportunityDrafts(input).filter((draft) => draft.opportunityType === "cost_reduction");
  assert.ok(drafts.length > 0);
  assert.equal(/will launch a cost program/i.test(drafts[0].summary), false);
  assert.match(drafts[0].title, /potencial/i);
});

test("4 new plant planned stays planned, not operational already", () => {
  const input = derivation({
    signals: [
      signal({
        id: "s1",
        signalType: "new_facility",
        title: "Company plans a new plant",
        assertionMode: "planned",
      }),
    ],
    fits: [fit({ id: "f1", knowledgeName: "Ramp-up", fitLevel: "high" })],
    knowledge: [knowledge("Ramp-up")],
  });
  const drafts = proposeOpportunityDrafts(input).filter((draft) => draft.opportunityType === "ramp_up");
  assert.ok(drafts.length > 0);
  assert.equal(drafts[0].assertionMode, "planned");
  assert.equal(/operational already/i.test(drafts[0].summary), false);
  const records = runOpportunityDeterministicValidators(contextFrom(drafts[0], input));
  assert.equal(records.find((row) => row.validatorCode === "assertion_mode_consistency")?.result, "pass");
});

test("5 restructuring does not invent layoffs", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "restructuring", title: "Company announces a restructuring program", importance: "high" })],
    fits: [fit({ id: "f1", knowledgeName: "Transformation", fitLevel: "high" })],
    knowledge: [knowledge("Transformation")],
    themes: themes(["Transformation"]),
  });
  const drafts = proposeOpportunityDrafts(input);
  assert.ok(drafts.some((draft) => draft.opportunityType === "restructuring_support" || draft.opportunityType === "organization_transformation"));
  for (const draft of drafts) {
    assert.equal(/\blayoffs?\b/i.test(draft.summary), false);
  }
});

test("6 high fit without trigger Signal is not proposed", () => {
  const input = derivation({
    signals: [],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity", fitLevel: "high" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  assert.equal(proposeOpportunityDrafts(input).length, 0);
});

test("7 KnowledgeObject needs_review cannot be used", () => {
  const draft = proposeOpportunityDrafts(
    derivation({
      signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
      fits: [fit({ id: "f1", knowledgeName: "Asset Productivity", knowledgeStatus: "active" })],
      knowledge: [knowledge("Asset Productivity")],
    }),
  )[0];
  draft.knowledgeLinks = [{ knowledgeObjectId: "ko-review", relationshipType: "capability" }];
  const records = runOpportunityDeterministicValidators(
    contextFrom(draft, derivation({
      signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
      fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
      knowledge: [{ ...knowledge("Asset Productivity"), id: "ko-review", status: "needs_review" }],
    })),
  );
  assert.equal(records.find((row) => row.validatorCode === "knowledge_object_exists")?.result, "fail");
});

test("8 Signal needs_review cannot be an active trigger", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase", status: "needs_review" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  assert.equal(proposeOpportunityDrafts(input).length, 0);
});

test("9 LLM high relevance loses to deterministic low", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "partnership", title: "Company announces a partnership" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity", fitLevel: "low", fitScore: 1 })],
    knowledge: [knowledge("Asset Productivity")],
  });
  const drafts = proposeOpportunityDrafts(
    derivation({
      signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase", importance: "low" })],
      fits: [fit({ id: "f1", knowledgeName: "Asset Productivity", fitLevel: "low", fitScore: 1 })],
      knowledge: [knowledge("Asset Productivity")],
    }),
  );
  assert.ok(drafts.length === 0 || drafts[0].relevanceLevel !== "high");
  const derived = deriveOpportunityRelevance({
    fitLevel: "low",
    triggerSignals: [signal({ id: "s1", signalType: "partnership", title: "Generic update", importance: "low" })],
    themeAligned: false,
    supportingCaseCount: 0,
    knowledgeCoverage: 1,
    typeAligned: false,
  });
  assert.equal(derived, "low");
  const draft = proposeOpportunityDrafts(
    derivation({
      signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
      fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
      knowledge: [knowledge("Asset Productivity")],
    }),
  )[0];
  draft.relevanceLevel = "high";
  const records = runOpportunityDeterministicValidators({
    ...contextFrom(draft, input),
    derivedRelevance: "low",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  assert.equal(records.find((row) => row.validatorCode === "relevance_consistency")?.result, "fail");
  void input;
});

test("10 one generic signal + one generic capability is not high relevance", () => {
  const relevance = deriveOpportunityRelevance({
    fitLevel: "low",
    triggerSignals: [signal({ id: "s1", signalType: "partnership", title: "Partnership", importance: "low" })],
    themeAligned: false,
    supportingCaseCount: 0,
    knowledgeCoverage: 1,
    typeAligned: false,
  });
  assert.notEqual(relevance, "high");
  assert.equal(relevance, "low");
});

test("11 strong fit + multiple aligned Signals can be high relevance", () => {
  const relevance = deriveOpportunityRelevance({
    fitLevel: "high",
    triggerSignals: [
      signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase", importance: "high" }),
      signal({ id: "s2", signalType: "capex_investment", title: "Capex", importance: "high" }),
    ],
    themeAligned: true,
    supportingCaseCount: 1,
    knowledgeCoverage: 2,
    typeAligned: true,
  });
  assert.equal(relevance, "high");
});

test("12 old Signal is not high urgency", () => {
  const urgency = deriveOpportunityUrgency({
    triggerSignals: [
      signal({
        id: "s1",
        signalType: "capacity_increase",
        title: "Old capacity increase",
        eventDate: "2020-01-01",
        createdAt: "2020-01-01T00:00:00.000Z",
      }),
    ],
    now: new Date("2026-10-16"),
  });
  assert.notEqual(urgency, "high");
  assert.equal(urgency, "low");
});

test("13 expected event preserves expected", () => {
  const input = derivation({
    signals: [
      signal({
        id: "s1",
        signalType: "capacity_increase",
        title: "Company expects a capacity increase",
        assertionMode: "expected",
      }),
    ],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  const drafts = proposeOpportunityDrafts(input);
  assert.ok(drafts.every((draft) => draft.assertionMode === "expected"));
});

test("14 duplicate hypothesis is needs_review", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  const draft = proposeOpportunityDrafts(input)[0];
  const fingerprint = fingerprintFromDraft(COMPANY, draft, "Asset Productivity");
  const records = runOpportunityDeterministicValidators({
    ...contextFrom(draft, input),
    existingFingerprints: [fingerprint],
  });
  assert.equal(records.find((row) => row.validatorCode === "duplicate_detection")?.result, "warn");
  const decision = decideOpportunityCandidateStatus({
    triggerActive: true,
    primaryFitActive: true,
    companyResolved: true,
    opportunityTypeOther: false,
    commercialOverreach: false,
    uncertaintyPreserved: true,
    validations: records,
  });
  assert.equal(decision.status, "needs_review");
});

test("15 competitor text is company-inconsistent", () => {
  const input = derivation({
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase", companyId: "co-other" })],
    fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
    knowledge: [knowledge("Asset Productivity")],
  });
  const draft = proposeOpportunityDrafts(
    derivation({
      signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
      fits: [fit({ id: "f1", knowledgeName: "Asset Productivity" })],
      knowledge: [knowledge("Asset Productivity")],
    }),
  )[0];
  const records = runOpportunityDeterministicValidators(contextFrom(draft, input));
  assert.equal(records.find((row) => row.validatorCode === "company_consistency")?.result, "fail");
});

test("16 possibility without explicit client need is never direct", () => {
  const confidence = deriveOpportunityConfidence({
    triggerSignals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase announced" })],
    relatedSignals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase announced" })],
    fitLevel: "high",
    themeAligned: true,
    opportunityType: "ramp_up",
  });
  assert.notEqual(confidence, "direct");
});
