import assert from "node:assert/strict";
import test from "node:test";
import { runAccountIntelligenceDeterministicValidators } from "./deterministic-validators";
import { deriveEfesoFit, mapFitScoreToLevel } from "./fit-derivation";
import { buildDeterministicNarrative } from "./narrative";
import { decideAccountIntelligenceCandidateStatus, decideEfesoFitCandidateStatus } from "./promotion-policy";
import { deriveAccountThemes } from "./themes";
import { detectAccountTensions } from "./tensions";
import { classifyTemporalState } from "./temporal";
import type { AccountSignalInput, KnowledgeFitTarget } from "./types";
import { rankSignalsForNarrative } from "./weight";

const WORKSPACE = "ws-1";
const COMPANY = "co-1";

function signal(overrides: Partial<AccountSignalInput> & Pick<AccountSignalInput, "id" | "signalType" | "title">): AccountSignalInput {
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

function contextFrom(signals: AccountSignalInput[], draft = buildDeterministicNarrative({ companyName: "Acme", signals })) {
  return {
    companyId: COMPANY,
    companyExists: true,
    companyResolved: true,
    workspaceId: WORKSPACE,
    signals,
    draft,
    signalLinks: rankSignalsForNarrative(signals),
    themes: deriveAccountThemes(signals),
    tensions: detectAccountTensions(signals),
    existingFingerprints: [] as string[],
  };
}

test("expansion + capex does not produce financially strong language", () => {
  const signals = [
    signal({ id: "s1", signalType: "expansion", title: "Company announces expansion" }),
    signal({ id: "s2", signalType: "capex_investment", title: "Company announces capex" }),
  ];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.equal(/financially strong/i.test(draft.executiveSummary), false);
  const records = runAccountIntelligenceDeterministicValidators(contextFrom(signals, draft));
  assert.equal(records.some((row) => row.result === "fail"), false);
});

test("cost reduction does not infer crisis", () => {
  const signals = [signal({ id: "s1", signalType: "cost_reduction_program", title: "Company announces cost reduction" })];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.equal(/crisis/i.test(draft.executiveSummary), false);
});

test("planned capacity is not written as already increased", () => {
  const signals = [
    signal({
      id: "s1",
      signalType: "new_facility",
      title: "Company plans a new plant",
      assertionMode: "planned",
    }),
    signal({
      id: "s2",
      signalType: "capacity_increase",
      title: "Company expects capacity increase",
      assertionMode: "expected",
    }),
  ];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.match(draft.executiveSummary, /planned|expected/);
  assert.equal(/has already increased/i.test(draft.executiveSummary), false);
  const records = runAccountIntelligenceDeterministicValidators(contextFrom(signals, draft));
  assert.equal(records.find((row) => row.validatorCode === "chronology_consistency")?.result, "pass");
});

test("leadership change does not invent acceleration", () => {
  const signals = [signal({ id: "s1", signalType: "leadership_change", title: "Company announces a CEO change" })];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.equal(/will accelerate/i.test(draft.executiveSummary), false);
});

test("financial pressure + investment detects tension without predicting failure", () => {
  const signals = [
    signal({ id: "s1", signalType: "capex_investment", title: "Company announces capex" }),
    signal({ id: "s2", signalType: "financial_pressure", title: "Company reports financial pressure", signalNature: "state" }),
  ];
  const tensions = detectAccountTensions(signals);
  assert.ok(tensions.some((row) => row.tensionType === "investment_vs_financial_constraint" || row.tensionType === "growth_vs_cost_pressure"));
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.equal(/will fail/i.test(draft.executiveSummary), false);
});

test("three maintenance-tagged signals yield a maintenance theme without inventing outage", () => {
  const signals = [
    signal({
      id: "s1",
      signalType: "maintenance_shutdown",
      title: "Maintenance window A",
      tags: [{ tagId: "t-m", category: "BUSINESS_PROBLEM", canonicalName: "maintenance" }],
    }),
    signal({
      id: "s2",
      signalType: "maintenance_shutdown",
      title: "Maintenance window B",
      tags: [{ tagId: "t-m", category: "BUSINESS_PROBLEM", canonicalName: "maintenance" }],
    }),
    signal({
      id: "s3",
      signalType: "operational_issue",
      title: "Maintenance-related operating note",
      tags: [{ tagId: "t-m", category: "BUSINESS_PROBLEM", canonicalName: "maintenance" }],
    }),
  ];
  const themes = deriveAccountThemes(signals);
  assert.ok(themes.some((theme) => theme.canonicalName === "maintenance" && theme.signalCount === 3));
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.equal(/outage/i.test(draft.executiveSummary), false);
});

test("historical signal is classified historical, not current", () => {
  const state = classifyTemporalState({
    assertionMode: "reported_actual",
    signalNature: "event",
    eventDate: "2023-01-01",
    now: new Date("2026-10-15"),
  });
  assert.equal(state, "historical");
});

test("mixed geographies are not collapsed into a single Brazil generalization in supported sections", () => {
  const signals = [
    signal({ id: "s1", signalType: "expansion", title: "Expansion in Chile", geography: "Chile" }),
    signal({ id: "s2", signalType: "capex_investment", title: "Capex in Peru", geography: "Peru" }),
  ];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.match(draft.executiveSummary, /Chile/);
  assert.match(draft.executiveSummary, /Peru/);
});

test("contradictory assertion modes preserve uncertainty", () => {
  const signals = [
    signal({ id: "s1", signalType: "expansion", title: "Plant planned", assertionMode: "planned" }),
    signal({ id: "s2", signalType: "expansion", title: "Plant expected", assertionMode: "expected" }),
  ];
  const draft = buildDeterministicNarrative({ companyName: "Acme", signals });
  assert.ok(draft.sections.unresolved_questions);
  assert.match(draft.sections.unresolved_questions ?? "", /planned|expected/);
});

test("needs_review signal cannot enter active intelligence", () => {
  const signals = [signal({ id: "s1", signalType: "expansion", title: "Review expansion", status: "needs_review" })];
  const records = runAccountIntelligenceDeterministicValidators(contextFrom(signals));
  assert.equal(records.find((row) => row.validatorCode === "all_signals_active")?.result, "fail");
  const decision = decideAccountIntelligenceCandidateStatus({
    hasActiveSignals: false,
    companyResolved: true,
    tensionsIncludeOther: false,
    validations: records,
  });
  assert.equal(decision.status, "rejected");
});

test("mining company + automotive case does not get strong case relevance", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    themes: [],
    knowledge: knowledge({
      id: "case-auto",
      objectType: "case",
      canonicalName: "Automotive case",
      tags: [
        { tagId: "i1", category: "INDUSTRY", canonicalName: "Automotive" },
        { tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
      ],
    }),
  });
  const caseComponent = result.components.find((row) => row.componentType === "case_relevance");
  assert.ok(!caseComponent || caseComponent.contribution < 2);
});

test("capacity increase can match Asset Productivity", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })],
    themes: deriveAccountThemes([signal({ id: "s1", signalType: "capacity_increase", title: "Capacity increase" })]),
    knowledge: knowledge({
      tags: [
        { tagId: "i1", category: "INDUSTRY", canonicalName: "Mining & Metals" },
        { tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
        { tagId: "p1", category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
      ],
    }),
  });
  assert.ok(result.fitScore >= 4);
  assert.ok(["medium", "high"].includes(result.fitLevel));
});

test("leadership change does not match Supply Chain without other evidence", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "leadership_change", title: "CEO change" })],
    themes: [],
    knowledge: knowledge({
      canonicalName: "Supply Chain",
      tags: [{ tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Supply Chain" }],
    }),
  });
  assert.equal(result.fitScore, 0);
});

test("industry match alone is not high fit", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "leadership_change", title: "CEO change" })],
    themes: [],
    knowledge: knowledge({
      tags: [{ tagId: "i1", category: "INDUSTRY", canonicalName: "Mining & Metals" }],
    }),
  });
  assert.ok(result.fitScore <= 2);
  assert.notEqual(result.fitLevel, "high");
  assert.equal(mapFitScoreToLevel(2), "low");
});

test("one weak generic capability is not high fit", () => {
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Consumo e Beleza",
    companyCountry: "BR",
    signals: [signal({ id: "s1", signalType: "strategic_plan", title: "Plan", importance: "low" })],
    themes: [],
    knowledge: knowledge({
      canonicalName: "Operational Excellence",
      tags: [{ tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Operational Excellence" }],
    }),
  });
  assert.notEqual(result.fitLevel, "high");
});

test("relevant case + capability + business problem can produce high fit", () => {
  const signals = [
    signal({
      id: "s1",
      signalType: "capacity_increase",
      title: "Capacity increase",
      importance: "high",
      tags: [
        { tagId: "p1", category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
        { tagId: "r1", category: "BUSINESS_PROBLEM", canonicalName: "ramp-up" },
      ],
    }),
    signal({
      id: "s2",
      signalType: "production_ramp_up",
      title: "Ramp-up",
      importance: "high",
      tags: [{ tagId: "r1", category: "BUSINESS_PROBLEM", canonicalName: "ramp-up" }],
    }),
    signal({
      id: "s3",
      signalType: "maintenance_shutdown",
      title: "Maintenance",
      tags: [{ tagId: "m1", category: "BUSINESS_PROBLEM", canonicalName: "maintenance" }],
    }),
  ];
  const result = deriveEfesoFit({
    companyId: COMPANY,
    companyIndustry: "Mineração",
    companyCountry: "BR",
    signals,
    themes: deriveAccountThemes(signals),
    knowledge: knowledge({
      tags: [
        { tagId: "i1", category: "INDUSTRY", canonicalName: "Mining & Metals" },
        { tagId: "c1", category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
        { tagId: "p1", category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
        { tagId: "r1", category: "BUSINESS_PROBLEM", canonicalName: "ramp-up" },
      ],
      relatedObjects: [{ id: "case-1", objectType: "case", canonicalName: "Mining ramp-up case", relationType: "demonstrates_capability" }],
    }),
  });
  assert.equal(result.fitLevel, "high");
});

test("needs_review knowledge and signals cannot become active fit", () => {
  const rejectedKnowledge = decideEfesoFitCandidateStatus({
    knowledgeActive: false,
    signalsActive: true,
    derivedFitScore: 8,
    validations: [],
  });
  assert.equal(rejectedKnowledge.status, "rejected");
  const rejectedSignal = decideEfesoFitCandidateStatus({
    knowledgeActive: true,
    signalsActive: false,
    derivedFitScore: 8,
    validations: [],
  });
  assert.equal(rejectedSignal.status, "rejected");
});

test("LLM cannot raise a weak deterministic fit", () => {
  const decision = decideEfesoFitCandidateStatus({
    knowledgeActive: true,
    signalsActive: true,
    derivedFitScore: 2,
    validations: [
      {
        validatorCode: "llm_cannot_raise_fit",
        validatorVersion: "efeso-fit-semantic-v1",
        validatorType: "model",
        result: "fail",
        severity: "blocking",
        message: "The model suggested a stronger fit than the deterministic components allow.",
        details: { suggested: "high", deterministic: "low" },
      },
    ],
  });
  assert.equal(decision.status, "rejected");
});
