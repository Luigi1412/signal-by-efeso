import { z } from "zod";
import { CLAIM_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";

export const claimCategorySchema = z.enum([
  "financial",
  "strategy",
  "manufacturing",
  "capacity",
  "headcount",
  "investment",
  "supply_chain",
  "procurement",
  "leadership",
  "regulatory",
  "sustainability",
  "market",
  "other",
]);

export const assertionModeSchema = z.enum([
  "reported_actual",
  "announced",
  "planned",
  "expected",
  "target",
  "estimated",
  "conditional",
  "unspecified",
]);

export const geographyLevelSchema = z.enum([
  "global",
  "region",
  "country",
  "state",
  "city",
  "site",
  "entity",
  "not_applicable",
]);

export const periodTypeSchema = z.enum([
  "instant",
  "month",
  "quarter",
  "semester",
  "year",
  "range",
  "as_of",
  "not_applicable",
]);

export const scaleSchema = z.enum(["unit", "thousand", "million", "billion", "trillion"]);

export const extractionCitationSchema = z.object({
  block_id: z.string(),
  exact_quote: z.string(),
});

export const extractedClaimSchema = z.object({
  candidate_key: z.string(),
  statement: z.string(),
  claim_category: claimCategorySchema,
  claim_type: z.literal("fact"),
  assertion_mode: assertionModeSchema,
  entity: z.object({
    entity_id: z.string().nullable(),
  }),
  geography: z.object({
    level: geographyLevelSchema.nullable(),
    country_code: z.string().nullable(),
    state_region: z.string().nullable(),
    city: z.string().nullable(),
  }),
  period: z.object({
    type: periodTypeSchema.nullable(),
    start: z.string().nullable(),
    end: z.string().nullable(),
    as_of: z.string().nullable(),
  }),
  quantitative: z.object({
    metric_name: z.string().nullable(),
    numeric_value: z.number().nullable(),
    unit: z.string().nullable(),
    currency_code: z.string().nullable(),
    scale: scaleSchema.nullable(),
  }),
  citations: z.array(extractionCitationSchema),
  model_extraction_confidence: z.number().int().min(0).max(100).nullable(),
});

export const claimExtractionOutputSchema = z.object({
  schema_version: z.literal(CLAIM_EXTRACTION_SCHEMA_VERSION),
  claims: z.array(extractedClaimSchema),
});

export type ClaimExtractionOutput = z.infer<typeof claimExtractionOutputSchema>;
export type ExtractedClaim = z.infer<typeof extractedClaimSchema>;
