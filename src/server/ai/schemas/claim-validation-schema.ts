import { z } from "zod";
import { CLAIM_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const validatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const groundingResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  support_level: z.enum(["direct", "strong_indirect", "weak_indirect", "none"]),
  reason: z.string(),
});

export const claimValidationOutputSchema = z.object({
  schema_version: z.literal(CLAIM_VALIDATION_SCHEMA_VERSION),
  validators: z.object({
    atomicity: validatorResultSchema,
    grounding: groundingResultSchema,
    geography_alignment: validatorResultSchema,
    entity_alignment: validatorResultSchema,
    period_alignment: validatorResultSchema,
    numeric_consistency: validatorResultSchema,
    unit_currency_consistency: validatorResultSchema,
    modality_preservation: validatorResultSchema,
    unsupported_inference: validatorResultSchema,
  }),
});

export type ClaimValidationOutput = z.infer<typeof claimValidationOutputSchema>;

export const claimValidationBatchOutputSchema = z.object({
  schema_version: z.literal(CLAIM_VALIDATION_SCHEMA_VERSION),
  items: z
    .array(
      z.object({
        candidate_index: z.number().int().nonnegative(),
        candidate_id: z.string().min(1).optional(),
        validators: claimValidationOutputSchema.shape.validators,
      }),
    )
    .min(1),
});

export type ClaimValidationBatchOutput = z.infer<typeof claimValidationBatchOutputSchema>;
