import { ACTION_DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import { detectForbiddenOutreach, detectInventedOwner, detectRelationshipOverclaim } from "./commercial-language";
import { fingerprintFromDraft } from "./fingerprint";
import { FORBIDDEN_ACTION_TYPES, isActionType } from "./taxonomy";
import type { ActionDeterministicContext } from "./types";

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: ACTION_DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function hasBlockingActionFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}

export function runActionDeterministicValidators(input: ActionDeterministicContext): ValidationRecord[] {
  return [
    schemaValidity(input),
    companyExists(input),
    actionTypeAllowed(input),
    forbiddenActionType(input),
    opportunityStatus(input),
    ownerInvention(input),
    relationshipUnknownLanguage(input),
    priorityConsistency(input),
    outreachLanguage(input),
    duplicateDetection(input),
  ];
}

function schemaValidity(input: ActionDeterministicContext): ValidationRecord {
  if (!input.draft.title.trim() || !input.draft.rationale.trim()) {
    return record("schema_validity", "fail", "blocking", "Title and rationale are required.");
  }
  return record("schema_validity", "pass", "info", "Draft schema is valid.");
}

function companyExists(input: ActionDeterministicContext): ValidationRecord {
  return input.companyExists
    ? record("company_exists", "pass", "info", "Company exists.")
    : record("company_exists", "fail", "blocking", "Company does not exist.");
}

function actionTypeAllowed(input: ActionDeterministicContext): ValidationRecord {
  if (!isActionType(input.draft.actionType)) {
    return record("action_type_allowed", "fail", "blocking", "Action type is not in the closed enum.");
  }
  if (input.draft.actionType === "other") {
    return record("action_type_allowed", "warn", "review", "Action type other requires review.");
  }
  return record("action_type_allowed", "pass", "info", "Action type is allowed.");
}

function forbiddenActionType(input: ActionDeterministicContext): ValidationRecord {
  if ((FORBIDDEN_ACTION_TYPES as readonly string[]).includes(input.draft.actionType)) {
    return record("forbidden_action_type", "fail", "blocking", "Executable outreach actions are out of scope.");
  }
  return record("forbidden_action_type", "pass", "info", "Action type is not an executable outreach.");
}

function opportunityStatus(input: ActionDeterministicContext): ValidationRecord {
  if (input.opportunityDismissed && ["contact_account_owner", "explore_client_need"].includes(input.draft.actionType)) {
    return record("opportunity_status", "fail", "blocking", "Dismissed opportunities cannot generate commercial actions.");
  }
  if (!input.opportunityActive && input.draft.priority === "high" && input.draft.actionType !== "validate_account_context") {
    return record("opportunity_status", "fail", "blocking", "No active Opportunity cannot produce a high-priority commercial action.");
  }
  return record("opportunity_status", "pass", "info", "Opportunity status is consistent with the action.");
}

function ownerInvention(input: ActionDeterministicContext): ValidationRecord {
  if (detectInventedOwner(`${input.draft.title} ${input.draft.rationale}`, input.hasAccountOwner)) {
    return record("owner_invention", "fail", "blocking", "The draft invents an internal owner.");
  }
  return record("owner_invention", "pass", "info", "No invented owner.");
}

function relationshipUnknownLanguage(input: ActionDeterministicContext): ValidationRecord {
  if (detectRelationshipOverclaim(input.draft.rationale, input.relationshipStrength === "unknown")) {
    return record("relationship_unknown_language", "fail", "blocking", "Unknown relationship must not be described as weak or absent.");
  }
  return record("relationship_unknown_language", "pass", "info", "Unknown relationship language is preserved.");
}

function priorityConsistency(input: ActionDeterministicContext): ValidationRecord {
  const rank = { low: 0, medium: 1, high: 2 };
  if (rank[input.draft.priority] > rank[input.derivedPriority]) {
    return record("priority_consistency", "fail", "blocking", "LLM or draft cannot raise deterministic priority.");
  }
  return record("priority_consistency", "pass", "info", "Priority matches deterministic derivation.");
}

function outreachLanguage(input: ActionDeterministicContext): ValidationRecord {
  if (detectForbiddenOutreach(`${input.draft.title} ${input.draft.rationale}`)) {
    return record("outreach_language", "fail", "blocking", "Outreach execution language is not allowed.");
  }
  return record("outreach_language", "pass", "info", "No outreach execution language.");
}

function duplicateDetection(input: ActionDeterministicContext): ValidationRecord {
  const fingerprint = fingerprintFromDraft(input.companyId, input.draft);
  if (input.existingFingerprints.includes(fingerprint)) {
    return record("duplicate_detection", "warn", "review", "An equivalent action already exists.", { fingerprint });
  }
  return record("duplicate_detection", "pass", "info", "No duplicate fingerprint.");
}
