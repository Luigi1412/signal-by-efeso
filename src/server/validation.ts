import "server-only";
import { z } from "zod";
import type { Geography, ResearchFocus } from "@/types";

const researchFocusValues = [
  "General EFESO opportunity scan",
  "Manufacturing",
  "Operational Excellence",
  "Supply Chain",
  "Cost & Profitability",
  "Procurement",
  "Organization & Transformation",
  "Digital & AI",
  "Other",
] as const satisfies readonly ResearchFocus[];

const geographyValues = ["Brazil", "Latin America", "Global"] as const satisfies readonly Geography[];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createDraftAnalysisInput = z.object({
  companyQuery: z.string().trim().min(1).max(200),
  website: z.string().trim().max(300).optional(),
  geography: z.enum(geographyValues),
  focus: z.enum(researchFocusValues),
  additionalInstructions: z.string().trim().max(4000).optional(),
});

export const uuidSchema = z.string().uuid();

export const confirmAnalysisInput = z.object({
  analysisId: uuidSchema,
});

export const persistResearchProgressInput = z.object({
  runId: uuidSchema,
  analysisId: uuidSchema,
  phaseIndex: z.number().int().min(0).max(20),
});

export const completeResearchInput = z.object({
  runId: uuidSchema,
  analysisId: uuidSchema,
});

export type CreateDraftAnalysisInput = z.infer<typeof createDraftAnalysisInput>;

const sourceTypeValues = [
  "annual_report",
  "earnings_release",
  "investor_presentation",
  "regulatory_filing",
  "corporate_page",
  "corporate_press_release",
  "government",
  "industry_association",
  "trade_press",
  "business_press",
  "news",
  "job_posting",
  "linkedin_company",
  "linkedin_person",
  "partner_supplier",
  "academic",
  "internal_efeso",
  "other",
] as const;

const sourceTierValues = ["A", "B", "C", "D", "E"] as const;
const accessTypeValues = ["public", "workspace_internal", "restricted"] as const;
const researchWaveValues = [
  "corporate_truth",
  "brazil_truth",
  "strategic_signals",
  "operational_signals",
  "market_context",
  "opportunity_specific",
  "challenge",
  "manual",
] as const;
const snapshotModeValues = ["full", "partial", "metadata_only"] as const;
const fragmentTypeValues = [
  "quote",
  "paragraph",
  "table_cell",
  "table_row",
  "chart",
  "headline",
  "caption",
  "metadata",
  "other",
] as const;
const claimCategoryValues = [
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
] as const;
const claimTypeValues = ["fact", "derived", "hypothesis", "client_confirmed"] as const;
const verificationStatusValues = [
  "unverified",
  "supported",
  "corroborated",
  "conflicted",
  "rejected",
] as const;
const reviewStatusValues = ["pending", "approved", "rejected", "needs_review"] as const;
const relationshipValues = ["supports", "contradicts", "contextualizes"] as const;
const directnessValues = ["direct", "strong_indirect", "weak_indirect"] as const;
const geographyLevelValues = [
  "global",
  "region",
  "country",
  "state",
  "city",
  "site",
  "entity",
  "not_applicable",
] as const;
const periodTypeValues = [
  "instant",
  "month",
  "quarter",
  "semester",
  "year",
  "range",
  "as_of",
  "not_applicable",
] as const;

export const registerSourceInput = z.object({
  canonicalUrl: z.string().trim().url().max(2000).nullable().optional(),
  domain: z.string().trim().max(255).nullable().optional(),
  publisherName: z.string().trim().min(1).max(300),
  sourceType: z.enum(sourceTypeValues),
  sourceTier: z.enum(sourceTierValues),
  isPrimarySource: z.boolean().optional(),
  languageCode: z.string().trim().max(12).nullable().optional(),
  countryCode: z
    .string()
    .length(2)
    .nullable()
    .optional(),
  accessType: z.enum(accessTypeValues).optional(),
  researchRunId: uuidSchema.optional(),
  researchWave: z.enum(researchWaveValues).optional(),
  disposition: z.enum(["discovered", "retained", "discarded", "duplicate"]).optional(),
  discoveryMethod: z.enum(["manual", "search", "crawler", "api", "upload", "other"]).optional(),
});

export const captureSourceSnapshotInput = z.object({
  sourceId: uuidSchema,
  capturedByResearchRunId: uuidSchema.nullable().optional(),
  publicationDate: isoDate.nullable().optional(),
  title: z.string().trim().max(500).nullable().optional(),
  author: z.string().trim().max(300).nullable().optional(),
  languageCode: z.string().trim().max(12).nullable().optional(),
  mimeType: z.string().trim().max(200).nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  snapshotMode: z.enum(snapshotModeValues),
  normalizedText: z.string().nullable().optional(),
  originalFileName: z.string().trim().max(200).optional(),
});

export const createManualEvidenceFragmentInput = z.object({
  sourceSnapshotId: uuidSchema,
  fragmentType: z.enum(fragmentTypeValues),
  excerpt: z.string().trim().min(1).max(8000),
  contextBefore: z.string().max(4000).nullable().optional(),
  contextAfter: z.string().max(4000).nullable().optional(),
  pageNumber: z.number().int().positive().nullable().optional(),
  sectionTitle: z.string().trim().max(300).nullable().optional(),
});

/**
 * A Claim is one atomic assertion. Callers must not join unrelated facts
 * into a single statement. Sprint 2 does not auto-detect atomicity.
 */
export const createAtomicClaimInput = z.object({
  analysisId: uuidSchema,
  originatingResearchRunId: uuidSchema,
  entityId: uuidSchema.nullable().optional(),
  statement: z.string().trim().min(1).max(2000),
  claimCategory: z.enum(claimCategoryValues),
  claimType: z.enum(claimTypeValues).optional(),
  verificationStatus: z.enum(verificationStatusValues).optional(),
  reviewStatus: z.enum(reviewStatusValues).optional(),
  geographyLevel: z.enum(geographyLevelValues).nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  periodType: z.enum(periodTypeValues).nullable().optional(),
  periodStart: isoDate.nullable().optional(),
  periodEnd: isoDate.nullable().optional(),
  asOfDate: isoDate.nullable().optional(),
  confidenceScore: z.number().int().min(0).max(100).nullable().optional(),
  confidenceMethodVersion: z.string().trim().max(64).nullable().optional(),
  supersedesClaimId: uuidSchema.nullable().optional(),
});

export const attachEvidenceToClaimInput = z.object({
  claimId: uuidSchema,
  evidenceFragmentId: uuidSchema,
  relationship: z.enum(relationshipValues),
  directness: z.enum(directnessValues),
  relevanceScore: z.number().int().min(0).max(100).nullable().optional(),
});

export const signedSourceUrlInput = z.object({
  snapshotId: uuidSchema,
});

export type RegisterSourceInput = z.infer<typeof registerSourceInput>;
export type CaptureSourceSnapshotInput = z.infer<typeof captureSourceSnapshotInput>;
export type CreateAtomicClaimInput = z.infer<typeof createAtomicClaimInput>;
