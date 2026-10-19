import type { PromotionDecision } from "@/server/extraction/promotion-policy";
import type { ValidationRecord } from "@/server/extraction/validation-types";

export function signalGroundingLevel(records: ValidationRecord[]): "direct" | "supported" | "unsupported" | "mixed" | null {
  const grounding = records.find((row) => row.validatorCode === "grounding");
  const level = grounding?.details.support_level;
  if (level === "direct" || level === "supported" || level === "unsupported" || level === "mixed") return level;
  return null;
}

export function decideSignalCandidateStatus(input: {
  hasPrimaryClaim: boolean;
  companyResolved: boolean;
  signalType: string;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (!input.hasPrimaryClaim) {
    return {
      status: "rejected",
      rejectionReasonCode: "primary_claim_present",
      rejectionReasonText: "Signal candidate has no primary Claim.",
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

  if (!input.companyResolved) {
    return {
      status: "needs_review",
      rejectionReasonCode: "company_exists",
      rejectionReasonText: "Company is not resolved.",
    };
  }

  if (input.signalType === "other") {
    return {
      status: "needs_review",
      rejectionReasonCode: "signal_type_allowed",
      rejectionReasonText: "Type other requires review.",
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
  const support = signalGroundingLevel(input.validations);
  if (!grounding || grounding.result === "fail" || support === "unsupported" || support == null) {
    return {
      status: "rejected",
      rejectionReasonCode: "grounding",
      rejectionReasonText: "Grounding is unsupported.",
    };
  }
  if (grounding.result !== "pass" || (support !== "direct" && support !== "supported")) {
    return {
      status: "needs_review",
      rejectionReasonCode: "grounding",
      rejectionReasonText: "Grounding is not a passing direct or supported citation.",
    };
  }

  return { status: "validated", rejectionReasonCode: null, rejectionReasonText: null };
}
