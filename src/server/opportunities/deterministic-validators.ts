import { OPPORTUNITY_DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import {
  detectCausalOverreach,
  detectOpportunityPromotionalLanguage,
  detectUnsupportedDirectNeed,
  hasHypothesisLanguage,
} from "./commercial-language";
import { fingerprintFromDraft, normalizeCoreHypothesis } from "./fingerprint";
import { OPPORTUNITY_TYPES, isOpportunityType } from "./taxonomy";
import type { OpportunityDeterministicContext } from "./types";

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: OPPORTUNITY_DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function hasBlockingOpportunityFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}

export function runOpportunityDeterministicValidators(input: OpportunityDeterministicContext): ValidationRecord[] {
  return [
    schemaValidity(input),
    companyExists(input),
    opportunityTypeAllowed(input),
    triggerSignalExists(input),
    triggerSignalActive(input),
    efesoFitExists(input),
    efesoFitActive(input),
    knowledgeObjectExists(input),
    workspaceConsistency(input),
    companyConsistency(input),
    assertionModeConsistency(input),
    maturityConsistency(input),
    relevanceConsistency(input),
    urgencyConsistency(input),
    duplicateDetection(input),
    unsupportedDirectNeed(input),
    commercialLanguageDetection(input),
  ];
}

function schemaValidity(input: OpportunityDeterministicContext): ValidationRecord {
  const draft = input.draft;
  if (!draft.title.trim() || !draft.summary.trim() || !hasHypothesisLanguage(draft.title)) {
    return record("schema_validity", "fail", "blocking", "Title/summary must be a short hypothesis, not a fact.");
  }
  if (draft.opportunityType === "other") {
    return record("schema_validity", "warn", "review", "Opportunity type other requires review.");
  }
  return record("schema_validity", "pass", "info", "Schema is valid.");
}

function companyExists(input: OpportunityDeterministicContext): ValidationRecord {
  if (!input.companyExists) {
    return record("company_exists", "fail", "blocking", "Company was not found in the workspace.");
  }
  if (!input.companyResolved) {
    return record("company_exists", "warn", "review", "Company is not resolved.", { company_id: input.companyId });
  }
  return record("company_exists", "pass", "info", "Company exists and is resolved.");
}

function opportunityTypeAllowed(input: OpportunityDeterministicContext): ValidationRecord {
  if (!isOpportunityType(input.draft.opportunityType) || !OPPORTUNITY_TYPES.includes(input.draft.opportunityType)) {
    return record("opportunity_type_allowed", "fail", "blocking", "Opportunity type is not in the closed taxonomy.");
  }
  return record("opportunity_type_allowed", "pass", "info", "Opportunity type is allowed.");
}

function triggerSignalExists(input: OpportunityDeterministicContext): ValidationRecord {
  const triggers = input.draft.signalLinks.filter((link) => link.relationshipType === "trigger");
  const missing = triggers.filter((link) => !input.signals.some((signal) => signal.id === link.signalId));
  if (triggers.length === 0 || missing.length > 0) {
    return record("trigger_signal_exists", "fail", "blocking", "Opportunity requires an existing trigger Signal.", {
      missing: missing.map((row) => row.signalId),
    });
  }
  return record("trigger_signal_exists", "pass", "info", "Trigger Signal exists.");
}

function triggerSignalActive(input: OpportunityDeterministicContext): ValidationRecord {
  const triggers = input.draft.signalLinks.filter((link) => link.relationshipType === "trigger");
  const inactive = triggers
    .map((link) => input.signals.find((signal) => signal.id === link.signalId))
    .filter((signal) => !signal || signal.status !== "active");
  if (inactive.length > 0) {
    return record("trigger_signal_active", "fail", "blocking", "Trigger Signal must be active.", {
      ids: inactive.map((signal) => signal?.id),
    });
  }
  return record("trigger_signal_active", "pass", "info", "Trigger Signals are active.");
}

function efesoFitExists(input: OpportunityDeterministicContext): ValidationRecord {
  const primaries = input.draft.fitLinks.filter((link) => link.relationshipType === "primary");
  const missing = primaries.filter((link) => !input.fits.some((fit) => fit.id === link.efesoFitId));
  if (primaries.length === 0 || missing.length > 0) {
    return record("efeso_fit_exists", "fail", "blocking", "Opportunity requires an existing primary EFESO Fit.");
  }
  return record("efeso_fit_exists", "pass", "info", "Primary EFESO Fit exists.");
}

function efesoFitActive(input: OpportunityDeterministicContext): ValidationRecord {
  const primaries = input.draft.fitLinks.filter((link) => link.relationshipType === "primary");
  const inactive = primaries
    .map((link) => input.fits.find((fit) => fit.id === link.efesoFitId))
    .filter((fit) => !fit || fit.status !== "active");
  if (inactive.length > 0) {
    return record("efeso_fit_active", "fail", "blocking", "Primary EFESO Fit must be active.");
  }
  return record("efeso_fit_active", "pass", "info", "Primary EFESO Fit is active.");
}

function knowledgeObjectExists(input: OpportunityDeterministicContext): ValidationRecord {
  const missing = input.draft.knowledgeLinks.filter(
    (link) => !input.knowledge.some((object) => object.id === link.knowledgeObjectId && object.status === "active"),
  );
  if (input.draft.knowledgeLinks.length === 0 || missing.length > 0) {
    return record(
      "knowledge_object_exists",
      "fail",
      "blocking",
      "Opportunity may only reference active KnowledgeObjects.",
      { missing: missing.map((row) => row.knowledgeObjectId) },
    );
  }
  return record("knowledge_object_exists", "pass", "info", "KnowledgeObjects exist and are active.");
}

function workspaceConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  const foreignSignals = input.signals.filter((signal) => signal.workspaceId !== input.workspaceId);
  const foreignFits = input.fits.filter((fit) => fit.workspaceId !== input.workspaceId);
  if (foreignSignals.length > 0 || foreignFits.length > 0) {
    return record("workspace_consistency", "fail", "blocking", "Linked records must share the workspace.");
  }
  return record("workspace_consistency", "pass", "info", "Workspace is consistent.");
}

function companyConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  const foreignSignals = input.signals.filter((signal) => signal.companyId !== input.companyId);
  const foreignFits = input.fits.filter((fit) => fit.companyId !== input.companyId);
  if (foreignSignals.length > 0 || foreignFits.length > 0) {
    return record("company_consistency", "fail", "blocking", "Linked records must belong to the same company.");
  }
  return record("company_consistency", "pass", "info", "Company is consistent.");
}

function assertionModeConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  const trigger = input.draft.signalLinks.find((link) => link.relationshipType === "trigger");
  const signal = input.signals.find((row) => row.id === trigger?.signalId);
  if (signal && ["planned", "expected", "target"].includes(signal.assertionMode)) {
    if (!["planned", "expected", "target", "conditional"].includes(input.draft.assertionMode)) {
      return record(
        "assertion_mode_consistency",
        "fail",
        "blocking",
        "Planned/expected Signals cannot be collapsed into a current opportunity.",
      );
    }
  }
  return record("assertion_mode_consistency", "pass", "info", "Assertion mode is conservative.");
}

function maturityConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  if (input.draft.maturity !== input.derivedMaturity) {
    return record("maturity_consistency", "fail", "blocking", "LLM cannot override deterministic maturity.", {
      proposed: input.draft.maturity,
      derived: input.derivedMaturity,
    });
  }
  return record("maturity_consistency", "pass", "info", "Maturity matches the deterministic derivation.");
}

function relevanceConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  const rank = { low: 0, medium: 1, high: 2 };
  if (rank[input.draft.relevanceLevel] > rank[input.derivedRelevance]) {
    return record("relevance_consistency", "fail", "blocking", "Deterministic relevance wins over the model.", {
      proposed: input.draft.relevanceLevel,
      derived: input.derivedRelevance,
    });
  }
  return record("relevance_consistency", "pass", "info", "Relevance does not exceed the deterministic level.");
}

function urgencyConsistency(input: OpportunityDeterministicContext): ValidationRecord {
  const rank = { low: 0, medium: 1, high: 2 };
  if (rank[input.draft.urgencyLevel] > rank[input.derivedUrgency]) {
    return record("urgency_consistency", "fail", "blocking", "Deterministic urgency wins over the model.", {
      proposed: input.draft.urgencyLevel,
      derived: input.derivedUrgency,
    });
  }
  return record("urgency_consistency", "pass", "info", "Urgency does not exceed the deterministic level.");
}

function duplicateDetection(input: OpportunityDeterministicContext): ValidationRecord {
  const fingerprint = fingerprintFromDraft(input.companyId, input.draft, primaryCapability(input));
  if (input.existingFingerprints.includes(fingerprint)) {
    return record("duplicate_detection", "warn", "review", "An Opportunity with this fingerprint already exists.", {
      fingerprint,
    });
  }
  const core = normalizeCoreHypothesis(`${input.draft.title} ${input.draft.summary}`);
  if (input.similarHypothesisFingerprints.includes(core) && core.length > 0) {
    return record("duplicate_detection", "warn", "review", "A semantically similar Opportunity hypothesis already exists.", {
      core,
    });
  }
  return record("duplicate_detection", "pass", "info", "No duplicate fingerprint detected.");
}

function unsupportedDirectNeed(input: OpportunityDeterministicContext): ValidationRecord {
  const text = `${input.draft.title} ${input.draft.summary} ${input.draft.rationale}`;
  const hits = detectUnsupportedDirectNeed(text);
  if (input.draft.confidenceTier === "direct" && input.derivedConfidence !== "direct") {
    return record(
      "unsupported_direct_need",
      "fail",
      "blocking",
      "Direct confidence requires an explicit client need in the source.",
    );
  }
  if (hits.length > 0) {
    return record("unsupported_direct_need", "fail", "blocking", "Text asserts an unsupported client need.", { hits });
  }
  return record("unsupported_direct_need", "pass", "info", "Need language stays hypothetical.");
}

function commercialLanguageDetection(input: OpportunityDeterministicContext): ValidationRecord {
  const text = `${input.draft.title} ${input.draft.summary} ${input.draft.rationaleBlocks.map((row) => row.statement).join(" ")}`;
  const hits = [...detectOpportunityPromotionalLanguage(text), ...detectCausalOverreach(text)];
  if (hits.length > 0) {
    return record("commercial_language_detection", "fail", "blocking", "Promotional or causal overreach language is not allowed.", {
      hits,
    });
  }
  return record("commercial_language_detection", "pass", "info", "Language stays neutral.");
}

function primaryCapability(input: OpportunityDeterministicContext): string | null {
  const primary = input.draft.fitLinks.find((link) => link.relationshipType === "primary");
  return input.fits.find((fit) => fit.id === primary?.efesoFitId)?.knowledgeName ?? null;
}
