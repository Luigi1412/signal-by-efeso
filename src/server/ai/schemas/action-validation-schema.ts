import { z } from "zod";
import { ACTION_VALIDATION_SCHEMA_VERSION } from "@/server/ai/versions";
import { ACTION_PRIORITIES } from "@/server/recommended-actions/taxonomy";

const validatorResult = z.object({
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string(),
});

export const actionValidationOutputSchema = z.object({
  schema_version: z.literal(ACTION_VALIDATION_SCHEMA_VERSION),
  suggested_priority: z.enum(ACTION_PRIORITIES).nullable(),
  validators: z.object({
    action_existence: validatorResult,
    rationale_grounding: validatorResult,
    relationship_honesty: validatorResult,
    owner_honesty: validatorResult,
    outreach_overreach: validatorResult,
    priority_reasoning: validatorResult,
    uncertainty_handling: validatorResult,
  }),
});

export type ActionValidationOutput = z.infer<typeof actionValidationOutputSchema>;
