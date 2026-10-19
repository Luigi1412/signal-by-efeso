import type { CandidateStatus, ValidationRecord } from "./validation-types";

export type GroundingSupportLevel = "direct" | "strong_indirect" | "weak_indirect" | "none" | null;

export interface PromotionDecision {
  status: Exclude<CandidateStatus, "pending_validation" | "promoted">;
  rejectionReasonCode: string | null;
  rejectionReasonText: string | null;
}

export function groundingSupportFromValidations(records: ValidationRecord[]): GroundingSupportLevel {
  const grounding = records.find((row) => row.validatorCode === "grounding");
  const level = grounding?.details.support_level;
  if (level === "direct" || level === "strong_indirect" || level === "weak_indirect" || level === "none") {
    return level;
  }
  return null;
}

/**
 * Conservative auto-promotion gate.
 * A candidate may become validated only when every validator passes,
 * no review-severity warning exists, and grounding support is direct.
 */
export function decideCandidateStatus(input: {
  claimType: string;
  hasSupportingCitation: boolean;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (input.claimType !== "fact") {
    return {
      status: "rejected",
      rejectionReasonCode: "claim_type",
      rejectionReasonText: "Sprint 3 extraction only accepts fact candidates.",
    };
  }
  if (!input.hasSupportingCitation) {
    return {
      status: "rejected",
      rejectionReasonCode: "citation_exists",
      rejectionReasonText: "Candidate has no supporting citation.",
    };
  }

  const blockingFail = input.validations.find((row) => row.result === "fail" && row.severity === "blocking");
  if (blockingFail) {
    return {
      status: "rejected",
      rejectionReasonCode: blockingFail.validatorCode,
      rejectionReasonText: blockingFail.message,
    };
  }

  const anyFail = input.validations.find((row) => row.result === "fail");
  if (anyFail) {
    return {
      status: "rejected",
      rejectionReasonCode: anyFail.validatorCode,
      rejectionReasonText: anyFail.message,
    };
  }

  const reviewWarn = input.validations.find((row) => row.result === "warn" && row.severity === "review");
  if (reviewWarn) {
    return {
      status: "needs_review",
      rejectionReasonCode: reviewWarn.validatorCode,
      rejectionReasonText: reviewWarn.message,
    };
  }

  const grounding = input.validations.find((row) => row.validatorCode === "grounding");
  const support = groundingSupportFromValidations(input.validations);
  if (!grounding || grounding.result !== "pass" || support !== "direct") {
    return {
      status: "needs_review",
      rejectionReasonCode: "grounding",
      rejectionReasonText: "Grounding is not a passing direct citation.",
    };
  }

  return { status: "validated", rejectionReasonCode: null, rejectionReasonText: null };
}

export function canTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  if (from === "pending_validation") {
    return to === "validated" || to === "needs_review" || to === "rejected";
  }
  if (from === "needs_review") {
    // Allow promotion-policy corrections to lift optional-absence reviews.
    return to === "validated" || to === "rejected";
  }
  if (from === "validated") return to === "promoted";
  return false;
}
