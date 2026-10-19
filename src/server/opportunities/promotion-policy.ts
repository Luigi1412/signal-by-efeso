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

export function decideOpportunityCandidateStatus(input: {
  triggerActive: boolean;
  primaryFitActive: boolean;
  companyResolved: boolean;
  opportunityTypeOther: boolean;
  commercialOverreach: boolean;
  uncertaintyPreserved: boolean;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (!input.triggerActive) {
    return {
      status: "rejected",
      rejectionReasonCode: "trigger_signal_active",
      rejectionReasonText: "Opportunity requires an active trigger Signal.",
    };
  }
  if (!input.primaryFitActive) {
    return {
      status: "rejected",
      rejectionReasonCode: "efeso_fit_active",
      rejectionReasonText: "Opportunity requires an active primary EFESO Fit.",
    };
  }
  if (input.commercialOverreach) {
    return {
      status: "rejected",
      rejectionReasonCode: "commercial_overreach",
      rejectionReasonText: "Commercial overreach is not allowed.",
    };
  }
  const decided = decideFromValidations(input.validations);
  if (decided.status !== "validated") return decided;
  if (!input.companyResolved) {
    return {
      status: "needs_review",
      rejectionReasonCode: "company_exists",
      rejectionReasonText: "Company is not resolved.",
    };
  }
  if (input.opportunityTypeOther) {
    return {
      status: "needs_review",
      rejectionReasonCode: "opportunity_type_allowed",
      rejectionReasonText: "Opportunity type other requires review.",
    };
  }
  if (!input.uncertaintyPreserved) {
    return {
      status: "needs_review",
      rejectionReasonCode: "uncertainty_handling",
      rejectionReasonText: "Uncertainty must remain visible.",
    };
  }
  const grounding = input.validations.find((row) => row.validatorCode === "rationale_grounding");
  if (grounding && grounding.result !== "pass") {
    return {
      status: grounding.result === "fail" ? "rejected" : "needs_review",
      rejectionReasonCode: "rationale_grounding",
      rejectionReasonText: grounding.message,
    };
  }
  return decided;
}
