import { z } from "zod";
import { OPPORTUNITY_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import { OPPORTUNITY_TYPES } from "@/server/opportunities/taxonomy";

export const opportunityExtractionOutputSchema = z.object({
  schema_version: z.literal(OPPORTUNITY_EXTRACTION_SCHEMA_VERSION),
  title: z.string(),
  summary: z.string(),
  opportunity_type: z.enum(OPPORTUNITY_TYPES),
  rationale: z.string(),
  observed_fact: z.string(),
  inferred_need: z.string(),
  uncertainty: z.string(),
});

export type OpportunityExtractionOutput = z.infer<typeof opportunityExtractionOutputSchema>;
