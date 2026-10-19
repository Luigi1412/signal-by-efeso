import { z } from "zod";
import { SIGNAL_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const signalValidatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const signalGroundingResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  support_level: z.enum(["direct", "supported", "unsupported"]),
  ambiguity: z.boolean(),
  reason: z.string(),
});

export const signalValidationOutputSchema = z.object({
  schema_version: z.literal(SIGNAL_VALIDATION_SCHEMA_VERSION),
  validators: z.object({
    event_or_state_existence: signalValidatorResultSchema,
    signal_type_fit: signalValidatorResultSchema,
    title_factuality: signalValidatorResultSchema,
    summary_grounding: signalValidatorResultSchema,
    company_attribution: signalValidatorResultSchema,
    geography: signalValidatorResultSchema,
    period: signalValidatorResultSchema,
    magnitude: signalValidatorResultSchema,
    assertion_mode: signalValidatorResultSchema,
    unsupported_inference: signalValidatorResultSchema,
    commercial_language: signalValidatorResultSchema,
    duplicate_semantics: signalValidatorResultSchema,
    grounding: signalGroundingResultSchema,
  }),
});

export type SignalValidationOutput = z.infer<typeof signalValidationOutputSchema>;
