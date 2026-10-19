import { z } from "zod";
import { KNOWLEDGE_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";

export const knowledgeValidatorResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const knowledgeGroundingResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  support_level: z.enum(["direct", "indirect", "unsupported"]),
  reason: z.string(),
});

export const knowledgeValidationOutputSchema = z.object({
  schema_version: z.literal(KNOWLEDGE_VALIDATION_SCHEMA_VERSION),
  validators: z.object({
    object_existence: knowledgeValidatorResultSchema,
    object_type: knowledgeValidatorResultSchema,
    naming: knowledgeValidatorResultSchema,
    grounding: knowledgeGroundingResultSchema,
    overgeneralization: knowledgeValidatorResultSchema,
    entity_attribution: knowledgeValidatorResultSchema,
    taxonomy_fit: knowledgeValidatorResultSchema,
    duplicate_semantics: knowledgeValidatorResultSchema,
  }),
});

export type KnowledgeValidationOutput = z.infer<typeof knowledgeValidationOutputSchema>;
