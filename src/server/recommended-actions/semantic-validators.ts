import { ACTION_SEMANTIC_VALIDATOR_VERSION, ACTION_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import type { ActionValidationOutput } from "@/server/ai/schemas/action-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "@/server/extraction/validation-types";
import type { ActionPriority } from "./taxonomy";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function actionSemanticOutputToRecords(
  output: ActionValidationOutput,
  modelRunId: string,
  derivedPriority: ActionPriority,
): ValidationRecord[] {
  const records: ValidationRecord[] = [];
  const push = (code: string, result: ValidatorResult, reason: string) => {
    records.push({
      validatorCode: code,
      validatorVersion: ACTION_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details: {},
      modelRunId,
    });
  };
  const entries = output.validators;
  push("action_existence", entries.action_existence.result, entries.action_existence.reason);
  push("rationale_grounding", entries.rationale_grounding.result, entries.rationale_grounding.reason);
  push("relationship_honesty", entries.relationship_honesty.result, entries.relationship_honesty.reason);
  push("owner_honesty", entries.owner_honesty.result, entries.owner_honesty.reason);
  push("outreach_overreach", entries.outreach_overreach.result, entries.outreach_overreach.reason);
  push("priority_reasoning", entries.priority_reasoning.result, entries.priority_reasoning.reason);
  push("uncertainty_handling", entries.uncertainty_handling.result, entries.uncertainty_handling.reason);
  const rank = { low: 0, medium: 1, high: 2 };
  if (output.suggested_priority && rank[output.suggested_priority] > rank[derivedPriority]) {
    push("llm_cannot_raise_priority", "fail", "The model suggested a stronger priority than deterministic derivation allows.");
  } else {
    push("llm_cannot_raise_priority", "pass", "The model did not raise deterministic priority.");
  }
  return records;
}

export function passingActionValidation() {
  const pass = { result: "pass" as const, reason: "Grounded in supplied Opportunity and Relationship Intelligence." };
  return {
    schema_version: ACTION_VALIDATION_SCHEMA_VERSION,
    suggested_priority: null as null,
    validators: {
      action_existence: pass,
      rationale_grounding: pass,
      relationship_honesty: pass,
      owner_honesty: pass,
      outreach_overreach: pass,
      priority_reasoning: pass,
      uncertainty_handling: pass,
    },
  };
}
