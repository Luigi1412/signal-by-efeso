import {
  OPPORTUNITY_SEMANTIC_VALIDATOR_VERSION,
  OPPORTUNITY_VALIDATION_SCHEMA_VERSION,
} from "@/server/ai/versions";
import type { OpportunityValidationOutput } from "@/server/ai/schemas/opportunity-validation-schema";
import type { ValidationRecord, ValidatorResult, ValidatorSeverity } from "@/server/extraction/validation-types";
import type { OpportunityConfidenceTier, OpportunityLevel, OpportunityMaturity } from "./taxonomy";

function severityFor(result: ValidatorResult): ValidatorSeverity {
  if (result === "fail") return "blocking";
  if (result === "warn") return "review";
  return "info";
}

export function opportunitySemanticOutputToRecords(
  output: OpportunityValidationOutput,
  modelRunId: string,
  derived: {
    relevance: OpportunityLevel;
    urgency: OpportunityLevel;
    maturity: OpportunityMaturity;
    confidence: OpportunityConfidenceTier;
  },
): ValidationRecord[] {
  const records: ValidationRecord[] = [];
  const push = (code: string, result: ValidatorResult, reason: string, details: Record<string, unknown> = {}) => {
    records.push({
      validatorCode: code,
      validatorVersion: OPPORTUNITY_SEMANTIC_VALIDATOR_VERSION,
      validatorType: "model",
      result,
      severity: severityFor(result),
      message: reason,
      details,
      modelRunId,
    });
  };
  const entries = output.validators;
  push("opportunity_existence", entries.opportunity_existence.result, entries.opportunity_existence.reason);
  push("rationale_grounding", entries.rationale_grounding.result, entries.rationale_grounding.reason);
  push("need_inference_quality", entries.need_inference_quality.result, entries.need_inference_quality.reason);
  push("efeso_relevance", entries.efeso_relevance.result, entries.efeso_relevance.reason);
  push("capability_fit", entries.capability_fit.result, entries.capability_fit.reason);
  push("commercial_overreach", entries.commercial_overreach.result, entries.commercial_overreach.reason);
  push("unsupported_client_need", entries.unsupported_client_need.result, entries.unsupported_client_need.reason);
  push("causal_overreach", entries.causal_overreach.result, entries.causal_overreach.reason);
  push("urgency_reasoning", entries.urgency_reasoning.result, entries.urgency_reasoning.reason);
  push("maturity_reasoning", entries.maturity_reasoning.result, entries.maturity_reasoning.reason);
  push("confidence_tier_fit", entries.confidence_tier_fit.result, entries.confidence_tier_fit.reason);
  push("duplicate_semantics", entries.duplicate_semantics.result, entries.duplicate_semantics.reason);
  push("uncertainty_handling", entries.uncertainty_handling.result, entries.uncertainty_handling.reason);

  const rank = { low: 0, medium: 1, high: 2, emerging: 0, developing: 1, established: 2, inferred: 0, supported: 1, direct: 2 };
  if (output.suggested_relevance_level && rank[output.suggested_relevance_level] > rank[derived.relevance]) {
    push("llm_cannot_raise_relevance", "fail", "The model suggested a stronger relevance than deterministic derivation allows.", {
      suggested: output.suggested_relevance_level,
      derived: derived.relevance,
    });
  } else {
    push("llm_cannot_raise_relevance", "pass", "The model did not raise deterministic relevance.");
  }
  return records;
}

export function passingOpportunityValidation() {
  const pass = { result: "pass" as const, reason: "Grounded in supplied Signals, Fit, and Knowledge." };
  return {
    schema_version: OPPORTUNITY_VALIDATION_SCHEMA_VERSION,
    suggested_relevance_level: null as null,
    suggested_urgency_level: null as null,
    suggested_maturity: null as null,
    validators: {
      opportunity_existence: pass,
      rationale_grounding: pass,
      need_inference_quality: pass,
      efeso_relevance: pass,
      capability_fit: pass,
      commercial_overreach: pass,
      unsupported_client_need: pass,
      causal_overreach: pass,
      urgency_reasoning: pass,
      maturity_reasoning: pass,
      confidence_tier_fit: pass,
      duplicate_semantics: pass,
      uncertainty_handling: pass,
    },
  };
}
