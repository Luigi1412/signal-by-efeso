import { z } from "zod";
import { ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const accountIntelligenceValidatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const accountIntelligenceValidationOutputSchema = z.object({
  schema_version: z.literal(ACCOUNT_INTELLIGENCE_VALIDATION_SCHEMA_VERSION),
  validators: z.object({
    summary_grounding: accountIntelligenceValidatorResultSchema,
    strategic_priority_grounding: accountIntelligenceValidatorResultSchema,
    pressure_grounding: accountIntelligenceValidatorResultSchema,
    risk_grounding: accountIntelligenceValidatorResultSchema,
    theme_grounding: accountIntelligenceValidatorResultSchema,
    unsupported_inference: accountIntelligenceValidatorResultSchema,
    causal_overreach: accountIntelligenceValidatorResultSchema,
    temporal_accuracy: accountIntelligenceValidatorResultSchema,
    contradiction_handling: accountIntelligenceValidatorResultSchema,
  }),
});

export type AccountIntelligenceValidationOutput = z.infer<typeof accountIntelligenceValidationOutputSchema>;
