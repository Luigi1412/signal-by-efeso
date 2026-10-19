import assert from "node:assert/strict";
import test from "node:test";
import { runActionDeterministicValidators } from "./deterministic-validators";
import {
  chooseActionType,
  clampPriority,
  deriveActionConfidence,
  deriveActionPriority,
  proposeActionDrafts,
} from "./derivation";
import { detectForbiddenOutreach, detectInventedOwner, detectRelationshipOverclaim } from "./commercial-language";
import { computeActionFingerprint, fingerprintFromDraft } from "./fingerprint";
import { decideActionCandidateStatus } from "./promotion-policy";
import { isActionType, isForbiddenActionType } from "./taxonomy";
import type { ActionDerivationInput, ActionDraft, ActionDeterministicContext } from "./types";

const COMPANY = "co-1";
const WORKSPACE = "ws-1";

function relationship(
  overrides: Partial<ActionDerivationInput["relationship"]> = {},
): ActionDerivationInput["relationship"] {
  return {
    id: null,
    status: "unknown",
    strength: "unknown",
    hasAccountOwner: false,
    accountOwnerName: null,
    knownHolders: 0,
    dataQuality: "unknown",
    ...overrides,
  };
}

function opportunity(
  overrides: Partial<NonNullable<ActionDerivationInput["opportunity"]>> = {},
): NonNullable<ActionDerivationInput["opportunity"]> {
  return {
    id: "opp-1",
    title: "Ramp-up",
    status: "active",
    relevanceLevel: "high",
    urgencyLevel: "high",
    maturity: "developing",
    opportunityType: "ramp_up",
    primaryCapability: "Asset Productivity",
    knowledgeObjectIds: [],
    ...overrides,
  };
}

function derivation(overrides: Partial<ActionDerivationInput> = {}): ActionDerivationInput {
  return {
    companyId: COMPANY,
    companyExists: true,
    workspaceId: WORKSPACE,
    opportunity: opportunity(),
    relationship: relationship(),
    accountIntelligenceId: "ai-1",
    hasRelevantCase: false,
    ...overrides,
  };
}

function draft(overrides: Partial<ActionDraft> = {}): ActionDraft {
  return {
    actionType: "validate_relationship",
    title: "Validate relationship with the account",
    rationale: "high relevance opportunity. Dados de relacionamento indisponíveis.",
    priority: "high",
    confidenceTier: "inferred",
    opportunityId: "opp-1",
    relationshipId: null,
    knowledgeObjectIds: [],
    opportunityLinks: [{ opportunityId: "opp-1", relationshipType: "primary" }],
    relationshipLinks: [],
    knowledgeLinks: [],
    rationaleBlocks: [],
    ...overrides,
  };
}

function context(overrides: Partial<ActionDeterministicContext> = {}): ActionDeterministicContext {
  const d = overrides.draft ?? draft();
  return {
    draft: d,
    companyExists: true,
    workspaceId: WORKSPACE,
    companyId: COMPANY,
    opportunityActive: true,
    opportunityDismissed: false,
    relationshipStrength: "unknown",
    hasAccountOwner: false,
    derivedPriority: d.priority,
    derivedConfidence: d.confidenceTier,
    existingFingerprints: [],
    ...overrides,
  };
}

test("1. high opportunity + unknown relationship → validate_relationship, never contact CEO", () => {
  const type = chooseActionType(derivation());
  assert.equal(type, "validate_relationship");
  assert.equal(isForbiddenActionType("contact_ceo"), true);
  assert.equal(detectForbiddenOutreach("contact the CEO immediately"), true);
});

test("2. high opportunity + strong relationship + account owner → contact_account_owner or align_internal_team", () => {
  const type = chooseActionType(
    derivation({
      relationship: relationship({
        id: "rel-1",
        status: "active_client",
        strength: "strong",
        hasAccountOwner: true,
        accountOwnerName: "Demo Partner A",
      }),
    }),
  );
  assert.ok(type === "contact_account_owner" || type === "align_internal_team");
});

test("3. low relevance does not generate high priority", () => {
  const priority = deriveActionPriority({
    opportunityRelevance: "low",
    opportunityUrgency: "high",
    maturity: "established",
    relationshipStrength: "strong",
  });
  assert.notEqual(priority, "high");
  assert.equal(chooseActionType(derivation({ opportunity: opportunity({ relevanceLevel: "low" }) })), "monitor_development");
});

test("4. old/low urgency opportunity is not treated as high urgency action", () => {
  const type = chooseActionType(
    derivation({
      opportunity: opportunity({ maturity: "emerging", urgencyLevel: "low", relevanceLevel: "medium" }),
      relationship: relationship({ status: "prospect", strength: "medium" }),
    }),
  );
  assert.equal(type, "monitor_development");
});

test("5. no opportunity yields at most monitor/validate context, never a strong commercial action", () => {
  const type = chooseActionType(derivation({ opportunity: null }));
  assert.ok(type === "validate_account_context" || type === "monitor_development");
  const priority = deriveActionPriority({
    opportunityRelevance: null,
    opportunityUrgency: null,
    maturity: null,
    relationshipStrength: "unknown",
  });
  assert.notEqual(priority, "high");
});

test("6. LLM meeting suggestion is outside the enum", () => {
  assert.equal(isActionType("schedule_meeting"), false);
  assert.equal(isForbiddenActionType("schedule_meeting"), true);
});

test("7. send proposal is rejected / needs_review", () => {
  assert.equal(detectForbiddenOutreach("Please send proposal to the client"), true);
  const decision = decideActionCandidateStatus({
    actionTypeOther: false,
    forbiddenOutreach: true,
    ownerInvented: false,
    validations: [],
  });
  assert.equal(decision.status, "rejected");
});

test("8. unknown relationship must not be described as weak", () => {
  assert.equal(detectRelationshipOverclaim("relationship is weak", true), true);
  const records = runActionDeterministicValidators(
    context({
      draft: draft({ rationale: "The relationship is weak so we should wait." }),
    }),
  );
  const language = records.find((row) => row.validatorCode === "relationship_unknown_language");
  assert.equal(language?.result, "fail");
});

test("9. no internal owner is invented", () => {
  assert.equal(detectInventedOwner("Ask Partner A to take this", false), true);
  const produced = proposeActionDrafts(derivation());
  for (const item of produced) {
    assert.doesNotMatch(item.rationale, /Demo Partner|Partner A|Consultant B/i);
  }
  const withRecord = proposeActionDrafts(
    derivation({
      relationship: relationship({ id: "rel-1", strength: "unknown", hasAccountOwner: false }),
    }),
  );
  for (const item of withRecord) {
    assert.match(item.rationale, /Responsável interno não identificado/);
  }
});

test("10. relevant case can produce review_relevant_case", () => {
  const type = chooseActionType(
    derivation({
      opportunity: opportunity({ relevanceLevel: "medium", urgencyLevel: "medium", maturity: "developing" }),
      relationship: relationship({ status: "prospect", strength: "medium" }),
      hasRelevantCase: true,
    }),
  );
  assert.equal(type, "review_relevant_case");
});

test("11. dismissed opportunity cannot generate a new commercial action", () => {
  const records = runActionDeterministicValidators(
    context({
      opportunityDismissed: true,
      draft: draft({ actionType: "contact_account_owner", title: "Align with the recorded account owner" }),
    }),
  );
  const status = records.find((row) => row.validatorCode === "opportunity_status");
  assert.equal(status?.result, "fail");
});

test("12. duplicate validate relationship / check relationship / confirm access share a fingerprint family", () => {
  const a = fingerprintFromDraft(COMPANY, draft({ actionType: "validate_relationship" }));
  const b = fingerprintFromDraft(COMPANY, draft({ actionType: "validate_account_context" }));
  assert.equal(a, b);
  const other = computeActionFingerprint({
    companyId: COMPANY,
    opportunityId: "opp-1",
    actionType: "monitor_development",
    relationshipId: null,
  });
  assert.notEqual(a, other);
  const records = runActionDeterministicValidators(context({ existingFingerprints: [a] }));
  const dup = records.find((row) => row.validatorCode === "duplicate_detection");
  assert.equal(dup?.result, "warn");
});

test("LLM cannot raise deterministic priority", () => {
  assert.equal(clampPriority("medium", "high"), "medium");
  const confidence = deriveActionConfidence({
    actionType: "validate_relationship",
    relationshipStrength: "unknown",
    hasAccountOwner: false,
    opportunityExplicit: true,
  });
  assert.equal(confidence, "inferred");
});
