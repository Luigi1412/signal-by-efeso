import { z } from "zod";
import { CLAIM_EXTRACTION_SCHEMA_VERSION } from "@/server/ai/versions";
import {
  assertionModeSchema,
  claimCategorySchema,
  claimExtractionOutputSchema,
  type ClaimExtractionOutput,
  type ExtractedClaim,
} from "./claim-extraction-schema";

const CLAIM_CATEGORIES = new Set(claimCategorySchema.options);
const ASSERTION_MODES = new Set(assertionModeSchema.options);

/** Salvage pipe-copied or near-miss enum strings from local 8B output. */
function coerceClaimCategory(value: unknown): z.infer<typeof claimCategorySchema> {
  if (typeof value !== "string") return "other";
  const raw = value.trim().toLowerCase();
  if (CLAIM_CATEGORIES.has(raw as never)) return raw as z.infer<typeof claimCategorySchema>;
  const first = raw.split(/[|,/\s]+/).find((part) => CLAIM_CATEGORIES.has(part as never));
  return (first as z.infer<typeof claimCategorySchema> | undefined) ?? "other";
}

function coerceAssertionMode(value: unknown): z.infer<typeof assertionModeSchema> {
  if (typeof value !== "string" || !value.trim()) return "unspecified";
  const raw = value.trim().toLowerCase();
  if (ASSERTION_MODES.has(raw as never)) return raw as z.infer<typeof assertionModeSchema>;
  const first = raw.split(/[|,/\s]+/).find((part) => ASSERTION_MODES.has(part as never));
  return (first as z.infer<typeof assertionModeSchema> | undefined) ?? "unspecified";
}

/**
 * Compact local-model extraction shape. Nested geography/period/entity objects
 * are expanded deterministically after the model returns.
 * Max 1 claim: prefer one closed JSON over truncated multi-claim output on 8B.
 */
export const compactExtractedClaimSchema = z.object({
  statement: z.string().min(1),
  claim_category: z.preprocess(coerceClaimCategory, claimCategorySchema),
  assertion_mode: z.preprocess(coerceAssertionMode, assertionModeSchema).default("unspecified"),
  metric_name: z.string().nullable().optional(),
  numeric_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  currency_code: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  as_of: z.string().nullable().optional(),
  block_id: z.string().min(1),
  exact_quote: z.string().min(1),
  model_extraction_confidence: z.number().int().min(0).max(100).nullable().optional(),
});

export const claimExtractionCompactOutputSchema = z.object({
  schema_version: z.literal(CLAIM_EXTRACTION_SCHEMA_VERSION),
  claims: z
    .array(compactExtractedClaimSchema)
    .transform((rows) => rows.slice(0, 1)),
});

export type ClaimExtractionCompactOutput = z.infer<typeof claimExtractionCompactOutputSchema>;

export function expandCompactExtraction(output: ClaimExtractionCompactOutput): ClaimExtractionOutput {
  const claims: ExtractedClaim[] = output.claims.map((claim, index) => ({
    candidate_key: `c${index + 1}`,
    entity_relationship: "unresolved",
    operational_theme: null,
    statement: claim.statement,
    claim_category: claim.claim_category,
    claim_type: "fact" as const,
    assertion_mode: claim.assertion_mode,
    entity: { entity_id: null },
    geography: {
      level: null,
      country_code: null,
      state_region: null,
      city: null,
    },
    period: {
      type: claim.as_of || claim.period_end ? "as_of" : null,
      start: null,
      end: claim.period_end ?? null,
      as_of: claim.as_of ?? claim.period_end ?? null,
    },
    quantitative: {
      metric_name: claim.metric_name ?? null,
      numeric_value: claim.numeric_value ?? null,
      unit: claim.unit ?? null,
      currency_code: claim.currency_code ?? null,
      scale: null,
    },
    citations: [{ block_id: claim.block_id, exact_quote: claim.exact_quote }],
    model_extraction_confidence: claim.model_extraction_confidence ?? null,
  }));
  const full = {
    schema_version: CLAIM_EXTRACTION_SCHEMA_VERSION,
    claims,
  };
  return claimExtractionOutputSchema.parse(full);
}
