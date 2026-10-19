import { z } from "zod";
import { SIGNAL_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import { assertionModeSchema } from "./claim-extraction-schema";
import { KNOWLEDGE_TAG_CATEGORIES } from "@/server/knowledge/taxonomy";
import {
  SIGNAL_CLAIM_RELATIONSHIPS,
  SIGNAL_COMPANY_ROLES,
  SIGNAL_IMPORTANCE_LEVELS,
  SIGNAL_NATURES,
  SIGNAL_TYPES,
} from "@/server/signals/taxonomy";

export const signalTypeSchema = z.enum(SIGNAL_TYPES);
export const signalNatureSchema = z.enum(SIGNAL_NATURES);
export const signalImportanceSchema = z.enum(SIGNAL_IMPORTANCE_LEVELS);

export const extractedSignalClaimSchema = z.object({
  claim_id: z.string(),
  relationship_type: z.enum(SIGNAL_CLAIM_RELATIONSHIPS),
});

export const extractedSignalCompanySchema = z.object({
  company_id: z.string(),
  role: z.enum(SIGNAL_COMPANY_ROLES),
});

export const extractedSignalTagSchema = z.object({
  category: z.enum(KNOWLEDGE_TAG_CATEGORIES),
  name: z.string(),
});

export const extractedSignalSchema = z.object({
  candidate_key: z.string(),
  signal_type: signalTypeSchema,
  signal_nature: signalNatureSchema,
  title: z.string(),
  summary: z.string(),
  suggested_importance: signalImportanceSchema,
  assertion_mode: assertionModeSchema,
  event_date: z.string().nullable(),
  effective_period_start: z.string().nullable(),
  effective_period_end: z.string().nullable(),
  geography: z.string().nullable(),
  metric_name: z.string().nullable(),
  numeric_value: z.number().nullable(),
  unit: z.string().nullable(),
  currency_code: z.string().nullable(),
  core_event: z.string(),
  parent_signal_id: z.string().nullable(),
  tags: z.array(extractedSignalTagSchema),
  companies: z.array(extractedSignalCompanySchema),
  claims: z.array(extractedSignalClaimSchema),
});

export const signalExtractionOutputSchema = z.object({
  schema_version: z.literal(SIGNAL_EXTRACTION_SCHEMA_VERSION),
  signals: z.array(extractedSignalSchema),
});

export type SignalExtractionOutput = z.infer<typeof signalExtractionOutputSchema>;
export type ExtractedSignal = z.infer<typeof extractedSignalSchema>;
