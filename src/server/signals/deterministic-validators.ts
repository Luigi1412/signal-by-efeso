import { SIGNAL_DETERMINISTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { ValidationRecord } from "@/server/extraction/validation-types";
import { isAllowedAssertionMode, signalOverstatesAssertion, titleImpliesRealized } from "./assertion-mode";
import { hasCommercialLanguage } from "./commercial-language";
import { computeSignalFingerprint } from "./fingerprint";
import { SIGNAL_NATURES, isAllowedSignalType } from "./taxonomy";
import type { SignalClaimContext, SignalDeterministicContext } from "./types";

function record(
  code: string,
  result: ValidationRecord["result"],
  severity: ValidationRecord["severity"],
  message: string,
  details: Record<string, unknown> = {},
): ValidationRecord {
  return {
    validatorCode: code,
    validatorVersion: SIGNAL_DETERMINISTIC_VALIDATOR_VERSION,
    validatorType: "deterministic",
    result,
    severity,
    message,
    details,
  };
}

export function runSignalDeterministicValidators(input: SignalDeterministicContext): ValidationRecord[] {
  const { draft } = input;
  const linked = draft.claims
    .map((link) => input.claimsById.get(link.claimId))
    .filter((row): row is SignalClaimContext => Boolean(row));
  return [
    schemaValidity(input),
    companyExists(input),
    signalTypeAllowed(input),
    claimExists(input),
    primaryClaimPresent(input),
    claimWorkspaceConsistency(input),
    claimCompanyConsistency(input),
    sourceConsistency(input),
    assertionModeConsistency(input, linked),
    geographyConsistency(input, linked),
    periodConsistency(input, linked),
    numericConsistency(input, linked),
    duplicateDetection(input),
  ];
}

function schemaValidity(input: SignalDeterministicContext): ValidationRecord {
  const { draft } = input;
  const issues: string[] = [];
  if (!draft.title.trim()) issues.push("empty_title");
  if (!draft.summary.trim()) issues.push("empty_summary");
  if (draft.title.trim().length > 160) issues.push("title_too_long");
  if (!SIGNAL_NATURES.includes(draft.signalNature as (typeof SIGNAL_NATURES)[number])) {
    issues.push("invalid_signal_nature");
  }
  if (!isAllowedAssertionMode(draft.assertionMode)) issues.push("invalid_assertion_mode");
  if (hasCommercialLanguage(draft.title, draft.summary)) issues.push("commercial_language");
  if (issues.length) {
    return record("schema_validity", "fail", "blocking", "Signal candidate schema is invalid.", { issues });
  }
  return record("schema_validity", "pass", "info", "Signal candidate schema is valid.");
}

function companyExists(input: SignalDeterministicContext): ValidationRecord {
  if (!input.companyExists) {
    return record("company_exists", "fail", "blocking", "Company was not found in the workspace.");
  }
  if (!input.companyResolved) {
    return record("company_exists", "warn", "review", "Company is not resolved. Do not auto-promote.", {
      company_id: input.companyId,
    });
  }
  return record("company_exists", "pass", "info", "Company exists and is resolved.");
}

function signalTypeAllowed(input: SignalDeterministicContext): ValidationRecord {
  if (!isAllowedSignalType(input.draft.signalType)) {
    return record("signal_type_allowed", "fail", "blocking", "Signal type is not in the closed catalog.");
  }
  if (input.draft.signalType === "other") {
    return record("signal_type_allowed", "warn", "review", "Type other requires review.", { signal_type: "other" });
  }
  return record("signal_type_allowed", "pass", "info", "Signal type is allowed.");
}

function claimExists(input: SignalDeterministicContext): ValidationRecord {
  const missing = input.draft.claims.filter((link) => !input.claimsById.has(link.claimId)).map((link) => link.claimId);
  if (input.draft.claims.length === 0 || missing.length > 0) {
    return record("claim_exists", "fail", "blocking", "Signal candidate is missing linked Claims.", { missing });
  }
  return record("claim_exists", "pass", "info", "Linked Claims exist.");
}

function primaryClaimPresent(input: SignalDeterministicContext): ValidationRecord {
  const primary = input.draft.claims.filter((link) => link.relationshipType === "primary_evidence");
  if (primary.length === 0) {
    return record("primary_claim_present", "fail", "blocking", "Active Signals require a primary Claim.");
  }
  return record("primary_claim_present", "pass", "info", "Primary Claim is present.");
}

function claimWorkspaceConsistency(input: SignalDeterministicContext): ValidationRecord {
  const mismatched = [...input.claimsById.values()].filter(
    (claim) =>
      input.draft.claims.some((link) => link.claimId === claim.id) && claim.workspaceId !== input.workspaceId,
  );
  if (mismatched.length > 0) {
    return record("claim_workspace_consistency", "fail", "blocking", "Linked Claim belongs to another workspace.", {
      claim_ids: mismatched.map((row) => row.id),
    });
  }
  return record("claim_workspace_consistency", "pass", "info", "Claims belong to the workspace.");
}

function claimCompanyConsistency(input: SignalDeterministicContext): ValidationRecord {
  const linked = [...input.claimsById.values()].filter((claim) =>
    input.draft.claims.some((link) => link.claimId === claim.id),
  );
  const foreign = linked.filter((claim) => claim.companyId !== input.companyId);
  if (foreign.length > 0) {
    return record("claim_company_consistency", "fail", "blocking", "Do not combine Claims from different companies.", {
      claim_ids: foreign.map((row) => row.id),
    });
  }
  const unresolved = linked.filter((claim) => !claim.companyResolved);
  if (unresolved.length > 0) {
    return record("claim_company_consistency", "warn", "review", "A linked Claim has an unresolved company.", {
      claim_ids: unresolved.map((row) => row.id),
    });
  }
  return record("claim_company_consistency", "pass", "info", "Claims belong to the same resolved company.");
}

function sourceConsistency(input: SignalDeterministicContext): ValidationRecord {
  const linked = [...input.claimsById.values()].filter((claim) =>
    input.draft.claims.some((link) => link.claimId === claim.id),
  );
  if (!input.sourceSnapshotId) {
    return record("source_consistency", "pass", "info", "No source snapshot was required for this candidate.");
  }
  const otherSource = linked.filter(
    (claim) => claim.sourceSnapshotId && claim.sourceSnapshotId !== input.sourceSnapshotId,
  );
  if (otherSource.length > 0 && linked.every((claim) => claim.sourceSnapshotId && claim.sourceSnapshotId !== input.sourceSnapshotId)) {
    return record("source_consistency", "warn", "review", "Linked Claims come from a different source snapshot.", {
      claim_ids: otherSource.map((row) => row.id),
    });
  }
  return record("source_consistency", "pass", "info", "Source snapshot is consistent with linked Claims.");
}

function assertionModeConsistency(
  input: SignalDeterministicContext,
  linked: SignalClaimContext[],
): ValidationRecord {
  const modes = linked.map((claim) => claim.assertionMode);
  if (signalOverstatesAssertion(input.draft.assertionMode, modes)) {
    return record(
      "assertion_mode_consistency",
      "fail",
      "blocking",
      "Signal assertion_mode is stronger than the linked Claims.",
      { signal: input.draft.assertionMode, claims: modes },
    );
  }
  const claimsAreUnrealized = modes.some((mode) => mode !== "reported_actual" && mode !== "announced");
  if (claimsAreUnrealized && titleImpliesRealized(input.draft.title, input.draft.summary)) {
    return record(
      "assertion_mode_consistency",
      "fail",
      "blocking",
      "Title or summary treats a non-realized Claim as completed.",
      { title: input.draft.title },
    );
  }
  return record("assertion_mode_consistency", "pass", "info", "Assertion mode is consistent with Claims.");
}

function geographyConsistency(input: SignalDeterministicContext, linked: SignalClaimContext[]): ValidationRecord {
  const geo = input.draft.geography?.toLowerCase() ?? "";
  if (!geo) return record("geography_consistency", "pass", "info", "No geography was asserted.");
  const claimCountries = linked.map((claim) => claim.countryCode).filter((code): code is string => Boolean(code));
  if (geo.includes("asia") && claimCountries.every((code) => code === "BR")) {
    return record("geography_consistency", "fail", "blocking", "Geography contradicts Claim country codes.", {
      geography: input.draft.geography,
      countries: claimCountries,
    });
  }
  return record("geography_consistency", "pass", "info", "Geography is consistent with Claims.");
}

function periodConsistency(input: SignalDeterministicContext, linked: SignalClaimContext[]): ValidationRecord {
  const start = input.draft.effectivePeriodStart ?? input.draft.eventDate;
  const end = input.draft.effectivePeriodEnd;
  if (start && end && start > end) {
    return record("period_consistency", "fail", "blocking", "Signal period start is after period end.");
  }
  const claimStarts = linked.map((claim) => claim.periodStart).filter((value): value is string => Boolean(value));
  if (start && claimStarts.length > 0 && claimStarts.every((value) => start < value.slice(0, 10))) {
    return record("period_consistency", "warn", "review", "Signal date is earlier than every Claim period.", {
      event_date: start,
    });
  }
  return record("period_consistency", "pass", "info", "Period is consistent with Claims.");
}

function numericConsistency(input: SignalDeterministicContext, linked: SignalClaimContext[]): ValidationRecord {
  if (input.draft.numericValue == null) {
    return record("numeric_consistency", "pass", "info", "No magnitude was asserted.");
  }
  const claimValues = linked
    .map((claim) => claim.numericValue)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (claimValues.length === 0) {
    return record("numeric_consistency", "fail", "blocking", "Signal magnitude is not present in linked Claims.", {
      numeric_value: input.draft.numericValue,
    });
  }
  const matches = claimValues.some((value) => Math.abs(value - input.draft.numericValue!) < 1e-6);
  if (!matches) {
    return record("numeric_consistency", "fail", "blocking", "Signal magnitude does not match linked Claims.", {
      numeric_value: input.draft.numericValue,
      claim_values: claimValues,
    });
  }
  return record("numeric_consistency", "pass", "info", "Magnitude matches linked Claims.");
}

function duplicateDetection(input: SignalDeterministicContext): ValidationRecord {
  const fingerprint = computeSignalFingerprint({
    companyId: input.companyId,
    signalType: String(input.draft.signalType),
    coreEvent: input.draft.coreEvent || input.draft.title,
    geography: input.draft.geography,
    eventDate: input.draft.eventDate,
    periodStart: input.draft.effectivePeriodStart,
    numericValue: input.draft.numericValue,
    unit: input.draft.unit,
  });
  if (input.existingFingerprints.includes(fingerprint)) {
    return record("duplicate_detection", "warn", "review", "An existing Signal has the same deterministic fingerprint.", {
      fingerprint,
    });
  }
  return record("duplicate_detection", "pass", "info", "No deterministic duplicate fingerprint was found.");
}

export function hasBlockingSignalFailure(records: ValidationRecord[]): boolean {
  return records.some((row) => row.result === "fail" && row.severity === "blocking");
}
