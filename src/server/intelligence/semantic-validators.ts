import {
  ACCOUNT_INTELLIGENCE_SEMANTIC_VALIDATOR_VERSION,
  EFESO_FIT_SEMANTIC_VALIDATOR_VERSION,
} from "@/server/ai/versions";
import type { AccountIntelligenceValidationOutput } from "@/server/ai/schemas/account-intelligence-validation-schema";
import type { EfesoFitValidationOutput } from "@/server/ai/schemas/efeso-fit-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "@/server/extraction/validation-types";
import type { FitLevel } from "./taxonomy";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function accountIntelligenceSemanticOutputToRecords(
  output: AccountIntelligenceValidationOutput,
  modelRunId: string,
): ValidationRecord[] {
  const records: ValidationRecord[] = [];
  const push = (code: string, result: ValidatorResult, reason: string) => {
    records.push({
      validatorCode: code,
      validatorVersion: ACCOUNT_INTELLIGENCE_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details: {},
      modelRunId,
    });
  };
  const entries = output.validators;
  push("summary_grounding", entries.summary_grounding.result, entries.summary_grounding.reason);
  push("strategic_priority_grounding", entries.strategic_priority_grounding.result, entries.strategic_priority_grounding.reason);
  push("pressure_grounding", entries.pressure_grounding.result, entries.pressure_grounding.reason);
  push("risk_grounding", entries.risk_grounding.result, entries.risk_grounding.reason);
  push("theme_grounding", entries.theme_grounding.result, entries.theme_grounding.reason);
  push("unsupported_inference", entries.unsupported_inference.result, entries.unsupported_inference.reason);
  push("causal_overreach", entries.causal_overreach.result, entries.causal_overreach.reason);
  push("temporal_accuracy", entries.temporal_accuracy.result, entries.temporal_accuracy.reason);
  push("contradiction_handling", entries.contradiction_handling.result, entries.contradiction_handling.reason);
  return records;
}

export function efesoFitSemanticOutputToRecords(
  output: EfesoFitValidationOutput,
  modelRunId: string,
  deterministicLevel: FitLevel,
): ValidationRecord[] {
  const records: ValidationRecord[] = [];
  const push = (code: string, result: ValidatorResult, reason: string, details: Record<string, unknown> = {}) => {
    records.push({
      validatorCode: code,
      validatorVersion: EFESO_FIT_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details,
      modelRunId,
    });
  };
  const entries = output.validators;
  push("case_relevance", entries.case_relevance.result, entries.case_relevance.reason);
  push("capability_relevance", entries.capability_relevance.result, entries.capability_relevance.reason);
  push("unsupported_inference", entries.unsupported_inference.result, entries.unsupported_inference.reason);
  push("industry_mismatch", entries.industry_mismatch.result, entries.industry_mismatch.reason);
  push("explanation_grounding", entries.explanation_grounding.result, entries.explanation_grounding.reason);

  const rank = { low: 0, medium: 1, high: 2 };
  if (output.suggested_fit_level && rank[output.suggested_fit_level] > rank[deterministicLevel]) {
    push(
      "llm_cannot_raise_fit",
      "fail",
      "The model suggested a stronger fit than the deterministic components allow.",
      { suggested: output.suggested_fit_level, deterministic: deterministicLevel },
    );
  } else {
    push("llm_cannot_raise_fit", "pass", "The model did not raise the deterministic fit level.");
  }
  return records;
}

export function passingAccountIntelligenceValidation() {
  const pass = { result: "pass" as const, reason: "Supported by supplied Signals." };
  return {
    schema_version: "account-intelligence-semantic-validation-schema-v1",
    validators: {
      summary_grounding: pass,
      strategic_priority_grounding: pass,
      pressure_grounding: pass,
      risk_grounding: pass,
      theme_grounding: pass,
      unsupported_inference: pass,
      causal_overreach: pass,
      temporal_accuracy: pass,
      contradiction_handling: pass,
    },
  };
}

export function passingEfesoFitValidation() {
  const pass = { result: "pass" as const, reason: "Deterministic components are consistent." };
  return {
    schema_version: "efeso-fit-semantic-validation-schema-v1",
    suggested_fit_level: null as null,
    validators: {
      case_relevance: pass,
      capability_relevance: pass,
      unsupported_inference: pass,
      industry_mismatch: pass,
      explanation_grounding: pass,
    },
  };
}
