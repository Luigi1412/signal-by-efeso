import assert from "node:assert/strict";
import test from "node:test";
import { SIGNAL_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import type { SignalValidationOutput } from "@/server/ai/schemas/signal-validation-schema";
import { runSignalDeterministicValidators } from "./deterministic-validators";
import { computeSignalFingerprint } from "./fingerprint";
import { decideSignalCandidateStatus } from "./promotion-policy";
import { signalSemanticOutputToRecords } from "./semantic-validators";
import type { SignalCandidateDraft, SignalClaimContext } from "./types";

const COMPANY = "co-1";
const OTHER = "co-2";
const WORKSPACE = "ws-1";

function claim(overrides: Partial<SignalClaimContext> & Pick<SignalClaimContext, "id" | "statement" | "assertionMode">): SignalClaimContext {
  return {
    workspaceId: WORKSPACE,
    companyId: COMPANY,
    claimStatus: "active",
    metricName: null,
    numericValue: null,
    unit: null,
    currencyCode: null,
    countryCode: "BR",
    stateRegion: null,
    city: null,
    geographyLevel: "country",
    periodStart: null,
    periodEnd: null,
    asOfDate: null,
    sourceSnapshotId: "snap-1",
    companyResolved: true,
    ...overrides,
  };
}

function draft(overrides: Partial<SignalCandidateDraft> = {}): SignalCandidateDraft {
  return {
    signalType: "capex_investment",
    signalNature: "event",
    title: "Company announces a plant expansion in Brazil",
    summary: "The company announced a plant expansion in Brazil.",
    suggestedImportance: "medium",
    assertionMode: "announced",
    eventDate: "2026-03-01",
    effectivePeriodStart: null,
    effectivePeriodEnd: null,
    geography: "Brazil",
    metricName: null,
    numericValue: null,
    unit: null,
    currencyCode: null,
    coreEvent: "plant expansion brazil",
    tags: [],
    companies: [{ companyId: COMPANY, role: "primary" }],
    parentSignalId: null,
    claims: [{ claimId: "c1", relationshipType: "primary_evidence" }],
    ...overrides,
  };
}

function context(input: {
  draft: SignalCandidateDraft;
  claims: SignalClaimContext[];
  existingFingerprints?: string[];
  companyResolved?: boolean;
  companyExists?: boolean;
}) {
  return {
    draft: input.draft,
    companyId: COMPANY,
    companyExists: input.companyExists ?? true,
    companyResolved: input.companyResolved ?? true,
    workspaceId: WORKSPACE,
    claimsById: new Map(input.claims.map((row) => [row.id, row])),
    existingFingerprints: input.existingFingerprints ?? [],
    sourceSnapshotId: "snap-1",
  };
}

function passSemantic(overrides: Partial<SignalValidationOutput["validators"]> = {}): SignalValidationOutput {
  const pass = { result: "pass" as const, reason: "ok" };
  return {
    schema_version: SIGNAL_VALIDATION_SCHEMA_VERSION,
    validators: {
      event_or_state_existence: pass,
      signal_type_fit: pass,
      title_factuality: pass,
      summary_grounding: pass,
      company_attribution: pass,
      geography: pass,
      period: pass,
      magnitude: pass,
      assertion_mode: pass,
      unsupported_inference: pass,
      commercial_language: pass,
      duplicate_semantics: pass,
      grounding: { result: "pass", support_level: "direct", ambiguity: false, reason: "ok" },
      ...overrides,
    },
  };
}

test("1. planned invest must not become invested", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        title: "Company invested R$ 500m",
        summary: "The company invested R$ 500m.",
        assertionMode: "reported_actual",
      }),
      claims: [claim({ id: "c1", statement: "Company plans to invest R$ 500m.", assertionMode: "planned" })],
    }),
  );
  const assertion = records.find((row) => row.validatorCode === "assertion_mode_consistency");
  assert.equal(assertion?.result, "fail");
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "capex_investment",
    validations: records,
  });
  assert.equal(decision.status, "rejected");
});

test("2. up to 20% must not become increased by 20%", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "capacity_increase",
        title: "Capacity increased by 20%",
        summary: "Capacity increased by 20%.",
        assertionMode: "reported_actual",
        numericValue: 20,
        unit: "%",
      }),
      claims: [
        claim({
          id: "c1",
          statement: "Up to 20% capacity increase.",
          assertionMode: "expected",
          numericValue: 20,
          unit: "%",
        }),
      ],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "assertion_mode_consistency")?.result, "fail");
});

test("3. evaluating a plant must not become will build", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "new_facility",
        title: "Company will build a new plant",
        summary: "The company will build a new plant.",
        assertionMode: "announced",
      }),
      claims: [claim({ id: "c1", statement: "Company is evaluating a new plant.", assertionMode: "conditional" })],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "assertion_mode_consistency")?.result, "fail");
});

test("4. revenue decline must not invent operational crisis", () => {
  const semantic = signalSemanticOutputToRecords(
    passSemantic({
      unsupported_inference: { result: "fail", reason: "crisis is not in the claim" },
    }),
    "run-1",
  );
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "operational_issue",
    validations: semantic,
  });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.rejectionReasonCode, "unsupported_inference");
});

test("5. CEO resignation may be leadership_change without invented motive", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "leadership_change",
        title: "CEO resigned",
        summary: "The company reported that the CEO resigned.",
        assertionMode: "reported_actual",
      }),
      claims: [claim({ id: "c1", statement: "CEO resigned.", assertionMode: "reported_actual" })],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "schema_validity")?.result, "pass");
  const semantic = signalSemanticOutputToRecords(passSemantic(), "run-1");
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "leadership_change",
    validations: [...records, ...semantic],
  });
  assert.equal(decision.status, "validated");
});

test("6. announced acquisition must not be marked completed", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "acquisition",
        title: "Company completed acquisition of Target X",
        summary: "The company acquired Target X.",
        assertionMode: "reported_actual",
      }),
      claims: [
        claim({ id: "c1", statement: "Company announced acquisition of Target X.", assertionMode: "announced" }),
      ],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "assertion_mode_consistency")?.result, "fail");
});

test("7. expected savings must not be treated as realized", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "cost_reduction_program",
        title: "Company realized savings of €10m",
        summary: "The company realized savings of €10m.",
        assertionMode: "reported_actual",
        numericValue: 10,
        unit: "m",
        currencyCode: "EUR",
      }),
      claims: [
        claim({
          id: "c1",
          statement: "Expected savings €10m.",
          assertionMode: "expected",
          numericValue: 10,
          unit: "m",
          currencyCode: "EUR",
        }),
      ],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "assertion_mode_consistency")?.result, "fail");
});

test("8. claims from two companies must not combine", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        claims: [
          { claimId: "c1", relationshipType: "primary_evidence" },
          { claimId: "c2", relationshipType: "supporting_evidence" },
        ],
      }),
      claims: [
        claim({ id: "c1", statement: "Company A announced a plant.", assertionMode: "announced" }),
        claim({ id: "c2", companyId: OTHER, statement: "Company B announced a plant.", assertionMode: "announced" }),
      ],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "claim_company_consistency")?.result, "fail");
});

test("9. unresolved company must not auto-promote", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft(),
      claims: [claim({ id: "c1", statement: "Unknown co announced a plan.", assertionMode: "announced", companyResolved: false })],
      companyResolved: false,
    }),
  );
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: false,
    signalType: "strategic_plan",
    validations: records,
  });
  assert.equal(decision.status, "needs_review");
});

test("10. believes productivity may improve is not realized performance_improvement", () => {
  const semantic = signalSemanticOutputToRecords(
    passSemantic({
      assertion_mode: { result: "fail", reason: "belief is not realized improvement" },
      unsupported_inference: { result: "fail", reason: "may improve is not realized" },
    }),
    "run-1",
  );
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "performance_improvement",
    validations: semantic,
  });
  assert.equal(decision.status, "rejected");
});

test("11. competitor source must not be attributed to the selected company", () => {
  const semantic = signalSemanticOutputToRecords(
    passSemantic({
      company_attribution: { result: "fail", reason: "event describes a competitor" },
    }),
    "run-1",
  );
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "expansion",
    validations: semantic,
  });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.rejectionReasonCode, "company_attribution");
});

test("12. same event in two sources is duplicate_semantics / fingerprint review", () => {
  const fingerprint = computeSignalFingerprint({
    companyId: COMPANY,
    signalType: "new_facility",
    coreEvent: "new plant sao paulo",
    geography: "Brazil",
    eventDate: "2026-03-01",
    periodStart: null,
    numericValue: null,
    unit: null,
  });
  const second = runSignalDeterministicValidators(
    context({
      draft: draft({
        signalType: "new_facility",
        title: "Company to build new facility in São Paulo",
        coreEvent: "new plant sao paulo",
      }),
      claims: [claim({ id: "c1", statement: "Company to build new facility in São Paulo", assertionMode: "announced" })],
      existingFingerprints: [fingerprint],
    }),
  );
  const dup = second.find((row) => row.validatorCode === "duplicate_detection");
  assert.equal(dup?.result, "warn");
  const semantic = signalSemanticOutputToRecords(
    passSemantic({
      duplicate_semantics: { result: "warn", reason: "same plant announcement" },
    }),
    "run-1",
  );
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "new_facility",
    validations: [...second, ...semantic],
  });
  assert.equal(decision.status, "needs_review");
});

test("commercial language is a blocking schema failure", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({
        title: "Huge opportunity emerges from aggressive growth plan",
        summary: "EFESO should pitch this client immediately.",
      }),
      claims: [claim({ id: "c1", statement: "Company announced expansion.", assertionMode: "announced" })],
    }),
  );
  assert.equal(records.find((row) => row.validatorCode === "schema_validity")?.result, "fail");
});

test("type other requires review even with passing grounding", () => {
  const records = runSignalDeterministicValidators(
    context({
      draft: draft({ signalType: "other" }),
      claims: [claim({ id: "c1", statement: "Company announced something.", assertionMode: "announced" })],
    }),
  );
  const semantic = signalSemanticOutputToRecords(passSemantic(), "run-1");
  const decision = decideSignalCandidateStatus({
    hasPrimaryClaim: true,
    companyResolved: true,
    signalType: "other",
    validations: [...records, ...semantic],
  });
  assert.equal(decision.status, "needs_review");
});
