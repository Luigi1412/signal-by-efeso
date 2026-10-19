import { z } from "zod";
import { EFESO_FIT_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import { FIT_LEVELS } from "@/server/intelligence/taxonomy";

export const efesoFitValidatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const efesoFitValidationOutputSchema = z.object({
  schema_version: z.literal(EFESO_FIT_VALIDATION_SCHEMA_VERSION),
  suggested_fit_level: z.enum(FIT_LEVELS).nullable(),
  validators: z.object({
    case_relevance: efesoFitValidatorResultSchema,
    capability_relevance: efesoFitValidatorResultSchema,
    unsupported_inference: efesoFitValidatorResultSchema,
    industry_mismatch: efesoFitValidatorResultSchema,
    explanation_grounding: efesoFitValidatorResultSchema,
  }),
});

export type EfesoFitValidationOutput = z.infer<typeof efesoFitValidationOutputSchema>;
