import type { PromotionDecision } from "@/server/extraction/promotion-policy";
import type { ValidationRecord } from "@/server/extraction/validation-types";

function decideFromValidations(validations: ValidationRecord[]): PromotionDecision {
  const blockingFail = validations.find((row) => row.result === "fail" && row.severity === "blocking");
  if (blockingFail) {
    return {
      status: "rejected",
      rejectionReasonCode: blockingFail.validatorCode,
      rejectionReasonText: blockingFail.message,
    };
  }
  const anyFail = validations.find((row) => row.result === "fail");
  if (anyFail) {
    return {
      status: "rejected",
      rejectionReasonCode: anyFail.validatorCode,
      rejectionReasonText: anyFail.message,
    };
  }
  const reviewWarn = validations.find((row) => row.result === "warn" && row.severity === "review");
  if (reviewWarn) {
    return {
      status: "needs_review",
      rejectionReasonCode: reviewWarn.validatorCode,
      rejectionReasonText: reviewWarn.message,
    };
  }
  return { status: "validated", rejectionReasonCode: null, rejectionReasonText: null };
}

export function decideActionCandidateStatus(input: {
  actionTypeOther: boolean;
  forbiddenOutreach: boolean;
  ownerInvented: boolean;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (input.forbiddenOutreach) {
    return {
      status: "rejected",
      rejectionReasonCode: "outreach_language",
      rejectionReasonText: "Executable outreach is out of scope.",
    };
  }
  if (input.ownerInvented) {
    return {
      status: "rejected",
      rejectionReasonCode: "owner_invention",
      rejectionReasonText: "Internal owner was invented.",
    };
  }
  const decided = decideFromValidations(input.validations);
  if (decided.status !== "validated") return decided;
  if (input.actionTypeOther) {
    return {
      status: "needs_review",
      rejectionReasonCode: "action_type_allowed",
      rejectionReasonText: "Action type other requires review.",
    };
  }
  return decided;
}
