import { SEMANTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { ClaimValidationOutput } from "@/server/ai/schemas/claim-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "./validation-types";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function semanticOutputToRecords(
  output: ClaimValidationOutput,
  modelRunId: string,
): ValidationRecord[] {
  const entries = output.validators;
  const records: ValidationRecord[] = [];

  const push = (
    code: string,
    result: ValidatorResult,
    reason: string,
    details: Record<string, unknown> = {},
  ) => {
    records.push({
      validatorCode: code,
      validatorVersion: SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details,
      modelRunId,
    });
  };

  push("atomicity", entries.atomicity.result, entries.atomicity.reason);
  push("geography_alignment", entries.geography_alignment.result, entries.geography_alignment.reason);
  push("entity_alignment", entries.entity_alignment.result, entries.entity_alignment.reason);
  push("period_alignment", entries.period_alignment.result, entries.period_alignment.reason);
  push("numeric_consistency", entries.numeric_consistency.result, entries.numeric_consistency.reason);
  push("unit_currency_consistency", entries.unit_currency_consistency.result, entries.unit_currency_consistency.reason);
  push("modality_preservation", entries.modality_preservation.result, entries.modality_preservation.reason);
  push("unsupported_inference", entries.unsupported_inference.result, entries.unsupported_inference.reason);

  const grounding = entries.grounding;
  let groundingResult = grounding.result;
  let groundingSeverity = severityFor(grounding.result);
  if (grounding.support_level !== "direct" && groundingResult === "pass") {
    groundingResult = "warn";
    groundingSeverity = "review";
  }
  records.push({
    validatorCode: "grounding",
    validatorVersion: SEMANTIC_VALIDATOR_VERSION,
    validatorType: "model",
    result: groundingResult,
    severity: groundingSeverity,
    message: grounding.reason,
    details: { support_level: grounding.support_level },
    modelRunId,
  });

  return records;
}
