import { SIGNAL_SEMANTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { SignalValidationOutput } from "@/server/ai/schemas/signal-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "@/server/extraction/validation-types";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function signalSemanticOutputToRecords(
  output: SignalValidationOutput,
  modelRunId: string,
): ValidationRecord[] {
  const entries = output.validators;
  const records: ValidationRecord[] = [];
  const push = (code: string, result: ValidatorResult, reason: string, details: Record<string, unknown> = {}) => {
    records.push({
      validatorCode: code,
      validatorVersion: SIGNAL_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details,
      modelRunId,
    });
  };

  push("event_or_state_existence", entries.event_or_state_existence.result, entries.event_or_state_existence.reason);
  push("signal_type_fit", entries.signal_type_fit.result, entries.signal_type_fit.reason);
  push("title_factuality", entries.title_factuality.result, entries.title_factuality.reason);
  push("summary_grounding", entries.summary_grounding.result, entries.summary_grounding.reason);
  push("company_attribution", entries.company_attribution.result, entries.company_attribution.reason);
  push("geography", entries.geography.result, entries.geography.reason);
  push("period", entries.period.result, entries.period.reason);
  push("magnitude", entries.magnitude.result, entries.magnitude.reason);
  push("assertion_mode", entries.assertion_mode.result, entries.assertion_mode.reason);
  push("unsupported_inference", entries.unsupported_inference.result, entries.unsupported_inference.reason);
  push("commercial_language", entries.commercial_language.result, entries.commercial_language.reason);
  push("duplicate_semantics", entries.duplicate_semantics.result, entries.duplicate_semantics.reason);

  let groundingResult = entries.grounding.result;
  let groundingSeverity = severityFor(entries.grounding.result);
  if (entries.grounding.support_level === "unsupported") {
    groundingResult = "fail";
    groundingSeverity = "blocking";
  } else if (entries.grounding.support_level === "supported" && entries.grounding.ambiguity && groundingResult === "pass") {
    groundingResult = "warn";
    groundingSeverity = "review";
  }
  records.push({
    validatorCode: "grounding",
    validatorVersion: SIGNAL_SEMANTIC_VALIDATOR_VERSION,
    validatorType: "model",
    result: groundingResult,
    severity: groundingSeverity,
    message: entries.grounding.reason,
    details: {
      support_level: entries.grounding.support_level,
      ambiguity: entries.grounding.ambiguity,
    },
    modelRunId,
  });

  return records;
}
