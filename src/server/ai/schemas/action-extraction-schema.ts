import { z } from "zod";
import { ACTION_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import { ACTION_TYPES } from "@/server/recommended-actions/taxonomy";

export const actionExtractionOutputSchema = z.object({
  schema_version: z.literal(ACTION_EXTRACTION_SCHEMA_VERSION),
  title: z.string(),
  rationale: z.string(),
  action_type: z.enum(ACTION_TYPES),
  uncertainty: z.string(),
});

export type ActionExtractionOutput = z.infer<typeof actionExtractionOutputSchema>;
