import type { PromotionDecision } from "@/server/extraction/promotion-policy";
import type { ValidationRecord } from "@/server/extraction/validation-types";

export function decideKnowledgeCandidateStatus(input: {
  hasSupportingCitation: boolean;
  attributedToEfeso: boolean;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (!input.hasSupportingCitation) {
    return {
      status: "rejected",
      rejectionReasonCode: "citation_exists",
      rejectionReasonText: "Knowledge candidate has no supporting citation.",
    };
  }
  if (!input.attributedToEfeso) {
    return {
      status: "needs_review",
      rejectionReasonCode: "entity_attribution",
      rejectionReasonText: "The source does not explicitly attribute this knowledge to EFESO.",
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
  const support = grounding?.details.support_level;
  if (!grounding || grounding.result !== "pass" || support !== "direct") {
    return {
      status: "needs_review",
      rejectionReasonCode: "grounding",
      rejectionReasonText: "Grounding is not a passing direct citation.",
    };
  }

  return { status: "validated", rejectionReasonCode: null, rejectionReasonText: null };
}
