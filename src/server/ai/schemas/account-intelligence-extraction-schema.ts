import { z } from "zod";
import { ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import { ACCOUNT_INTELLIGENCE_SECTIONS } from "@/server/intelligence/taxonomy";

export const extractedAccountSectionSchema = z.object({
  key: z.enum(ACCOUNT_INTELLIGENCE_SECTIONS),
  text: z.string(),
});

export const accountIntelligenceExtractionOutputSchema = z.object({
  schema_version: z.literal(ACCOUNT_INTELLIGENCE_EXTRACTION_SCHEMA_VERSION),
  headline: z.string(),
  executive_summary: z.string(),
  strategic_direction: z.string().nullable(),
  pressure_summary: z.string().nullable(),
  investment_summary: z.string().nullable(),
  operating_context_summary: z.string().nullable(),
  risk_summary: z.string().nullable(),
  change_summary: z.string().nullable(),
  sections: z.array(extractedAccountSectionSchema),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
});

export type AccountIntelligenceExtractionOutput = z.infer<typeof accountIntelligenceExtractionOutputSchema>;
