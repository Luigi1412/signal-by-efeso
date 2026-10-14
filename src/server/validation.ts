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
