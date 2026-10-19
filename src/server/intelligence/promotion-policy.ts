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

export function decideAccountIntelligenceCandidateStatus(input: {
  hasActiveSignals: boolean;
  companyResolved: boolean;
  tensionsIncludeOther: boolean;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (!input.hasActiveSignals) {
    return {
      status: "rejected",
      rejectionReasonCode: "signal_exists",
      rejectionReasonText: "Account intelligence requires active Signals.",
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
  if (input.tensionsIncludeOther) {
    return {
      status: "needs_review",
      rejectionReasonCode: "tension_other",
      rejectionReasonText: "Tension type other requires review.",
    };
  }
  const grounding = input.validations.find((row) => row.validatorCode === "summary_grounding");
  if (grounding && grounding.result !== "pass") {
    return {
      status: grounding.result === "fail" ? "rejected" : "needs_review",
      rejectionReasonCode: "summary_grounding",
      rejectionReasonText: grounding.message,
    };
  }
  return decided;
}

export function decideEfesoFitCandidateStatus(input: {
  knowledgeActive: boolean;
  signalsActive: boolean;
  derivedFitScore: number;
  validations: ValidationRecord[];
}): PromotionDecision {
  if (!input.knowledgeActive) {
    return {
      status: "rejected",
      rejectionReasonCode: "knowledge_active",
      rejectionReasonText: "Knowledge object is not active.",
    };
  }
  if (!input.signalsActive) {
    return {
      status: "rejected",
      rejectionReasonCode: "all_signals_active",
      rejectionReasonText: "Fit cannot use review or inactive Signals.",
    };
  }
  if (input.derivedFitScore <= 0) {
    return {
      status: "rejected",
      rejectionReasonCode: "components_present",
      rejectionReasonText: "No positive fit components.",
    };
  }
  return decideFromValidations(input.validations);
}
