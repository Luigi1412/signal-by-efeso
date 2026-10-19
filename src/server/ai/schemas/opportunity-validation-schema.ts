import { z } from "zod";
import { OPPORTUNITY_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const opportunityValidatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const opportunityValidationOutputSchema = z.object({
  schema_version: z.literal(OPPORTUNITY_VALIDATION_SCHEMA_VERSION),
  suggested_relevance_level: z.enum(["low", "medium", "high"]).nullable(),
  suggested_urgency_level: z.enum(["low", "medium", "high"]).nullable(),
  suggested_maturity: z.enum(["emerging", "developing", "established"]).nullable(),
  validators: z.object({
    opportunity_existence: opportunityValidatorResultSchema,
    rationale_grounding: opportunityValidatorResultSchema,
    need_inference_quality: opportunityValidatorResultSchema,
    efeso_relevance: opportunityValidatorResultSchema,
    capability_fit: opportunityValidatorResultSchema,
    commercial_overreach: opportunityValidatorResultSchema,
    unsupported_client_need: opportunityValidatorResultSchema,
    causal_overreach: opportunityValidatorResultSchema,
    urgency_reasoning: opportunityValidatorResultSchema,
    maturity_reasoning: opportunityValidatorResultSchema,
    confidence_tier_fit: opportunityValidatorResultSchema,
    duplicate_semantics: opportunityValidatorResultSchema,
    uncertainty_handling: opportunityValidatorResultSchema,
  }),
});

export type OpportunityValidationOutput = z.infer<typeof opportunityValidationOutputSchema>;
