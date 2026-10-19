import { KNOWLEDGE_SEMANTIC_VALIDATOR_VERSION } from "@/server/ai/versions";
import type { KnowledgeValidationOutput } from "@/server/ai/schemas/knowledge-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "@/server/extraction/validation-types";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function knowledgeSemanticOutputToRecords(
  output: KnowledgeValidationOutput,
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
      validatorVersion: KNOWLEDGE_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details,
      modelRunId,
    });
  };

  push("object_existence", entries.object_existence.result, entries.object_existence.reason);
  push("object_type", entries.object_type.result, entries.object_type.reason);
  push("naming", entries.naming.result, entries.naming.reason);
  push("overgeneralization", entries.overgeneralization.result, entries.overgeneralization.reason);
  push("entity_attribution", entries.entity_attribution.result, entries.entity_attribution.reason);
  push("taxonomy_fit", entries.taxonomy_fit.result, entries.taxonomy_fit.reason);
  push("duplicate_semantics", entries.duplicate_semantics.result, entries.duplicate_semantics.reason);

  let groundingResult = entries.grounding.result;
  let groundingSeverity = severityFor(entries.grounding.result);
  if (entries.grounding.support_level !== "direct" && groundingResult === "pass") {
    groundingResult = "warn";
    groundingSeverity = "review";
  }
  records.push({
    validatorCode: "grounding",
    validatorVersion: KNOWLEDGE_SEMANTIC_VALIDATOR_VERSION,
    validatorType: "model",
    result: groundingResult,
    severity: groundingSeverity,
    message: entries.grounding.reason,
    details: { support_level: entries.grounding.support_level },
    modelRunId,
  });

  return records;
}
