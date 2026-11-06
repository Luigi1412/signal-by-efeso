import { z } from "zod";
import { CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import {
  claimValidationOutputSchema,
  type ClaimValidationOutput,
} from "./claim-validation-schema";

/**
 * Compact local-model semantic validation shape.
 * One binary support decision + short reason code — not 9 narrative validators.
 */
export const VALIDATION_REASON_CODES = [
  "direct_support",
  "strong_indirect",
  "weak_support",
  "unsupported",
  "not_atomic",
  "geography_mismatch",
  "entity_mismatch",
  "period_mismatch",
  "numeric_mismatch",
  "modality_mismatch",
  "inference",
  "ambiguous",
] as const;

export type ValidationReasonCode = (typeof VALIDATION_REASON_CODES)[number];

const REASON_SET = new Set<string>(VALIDATION_REASON_CODES);

function coerceReasonCode(value: unknown): ValidationReasonCode {
  if (typeof value !== "string") return "ambiguous";
  const parts = value
    .split(/[|,/]+/)
    .map((part) => part.trim().toLowerCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
  for (const part of parts) {
    if (REASON_SET.has(part)) return part as ValidationReasonCode;
  }
  return "ambiguous";
}

function coerceSupported(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (["true", "yes", "1", "pass", "supported"].includes(raw)) return true;
    if (["false", "no", "0", "fail", "unsupported"].includes(raw)) return false;
  }
  return false;
}

function coerceConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(100, Math.round(Number(value))));
  }
  return 0;
}

export const claimValidationCompactOutputSchema = z.object({
  schema_version: z.literal(CLAIM_VALIDATION_SCHEMA_VERSION),
  supported: z.preprocess(coerceSupported, z.boolean()),
  confidence: z.preprocess(coerceConfidence, z.number().int().min(0).max(100)),
  reason_code: z.preprocess(coerceReasonCode, z.enum(VALIDATION_REASON_CODES)),
});

export type ClaimValidationCompactOutput = z.infer<typeof claimValidationCompactOutputSchema>;

const FAIL_BY_REASON: Partial<Record<ValidationReasonCode, string>> = {
  not_atomic: "atomicity",
  geography_mismatch: "geography_alignment",
  entity_mismatch: "entity_alignment",
  period_mismatch: "period_alignment",
  numeric_mismatch: "numeric_consistency",
  modality_mismatch: "modality_preservation",
  inference: "unsupported_inference",
  unsupported: "grounding",
  weak_support: "grounding",
  ambiguous: "grounding",
};

function supportLevelFor(
  supported: boolean,
  reason: ValidationReasonCode,
): "direct" | "strong_indirect" | "weak_indirect" | "none" {
  if (reason === "direct_support" && supported) return "direct";
  if (reason === "strong_indirect") return "strong_indirect";
  if (reason === "weak_support" || reason === "ambiguous") return "weak_indirect";
  return "none";
}

function shortReason(code: ValidationReasonCode, supported: boolean): string {
  if (supported && code === "direct_support") return "Evidence directly supports the claim.";
  return `Semantic validation: ${code}.`;
}

/** Expand compact model output into the pipeline's full validator map. */
export function expandCompactValidation(output: ClaimValidationCompactOutput): ClaimValidationOutput {
  const reason = output.reason_code;
  const supported = output.supported && reason === "direct_support";
  const failCode = supported ? null : (FAIL_BY_REASON[reason] ?? "grounding");
  const level = supportLevelFor(output.supported, reason);
  const message = shortReason(reason, supported);

  const unit = (code: string) => ({
    result: (failCode === code ? "fail" : "pass") as "pass" | "fail",
    reason: failCode === code ? message : "Ok.",
  });

  const groundingResult =
    level === "direct" && supported ? "pass" : failCode === "grounding" || !supported ? "fail" : "warn";

  const full = {
    schema_version: CLAIM_VALIDATION_SCHEMA_VERSION,
    validators: {
      atomicity: unit("atomicity"),
      grounding: {
        result: groundingResult as "pass" | "warn" | "fail",
        support_level: level,
        reason: message,
      },
      geography_alignment: unit("geography_alignment"),
      entity_alignment: unit("entity_alignment"),
      period_alignment: unit("period_alignment"),
      numeric_consistency: unit("numeric_consistency"),
      unit_currency_consistency: unit("unit_currency_consistency"),
      modality_preservation: unit("modality_preservation"),
      unsupported_inference: unit("unsupported_inference"),
    },
  };
  return claimValidationOutputSchema.parse(full);
}
