import { t, ui } from "@/i18n";
import type { Geography, ResearchFocus, SignalCategory, SourceType } from "@/types";
import type { EfesoFit } from "@/types/opportunity";

export const evidenceTypeLabel = ui.evidenceType;
export const analysisStatusLabel = ui.analysisStatus;
export const relevanceLabel = ui.relevance;

export type OpportunityStrengthBand = "forte" | "moderada" | "emergente" | "fraca";

/** Maps the 0–100 opportunity score to the strength taxonomy. Not economic size. */
export function opportunityStrengthBand(score: number): OpportunityStrengthBand {
  if (score >= 80) return "forte";
  if (score >= 65) return "moderada";
  if (score >= 50) return "emergente";
  return "fraca";
}

export function opportunityStrengthLabel(score: number): string {
  return ui.opportunityStrength[opportunityStrengthBand(score)];
}

export type ConfidenceBand = "veryHigh" | "high" | "moderate" | "low";

export function confidenceBand(value: number): ConfidenceBand {
  if (value >= 90) return "veryHigh";
  if (value >= 75) return "high";
  if (value >= 50) return "moderate";
  return "low";
}

export function confidenceLabel(value: number | null): string {
  if (value === null) return ui.confidence.notAssigned;
  return ui.confidence[confidenceBand(value)];
}

export const evidenceStrengthLabel = ui.evidenceStrength;
export const evidenceQualityLabel = ui.evidenceQuality;
export const efesoFitLabel = ui.efesoFit;
export const clientValidationLabel = ui.clientValidation;
export const researchFocusLabel: Record<ResearchFocus, string> = ui.researchFocus;
export const geographyLabel: Record<Geography, string> = ui.geography;
export const signalCategoryLabel: Record<SignalCategory, string> = ui.signalCategory;
export const sourceTypeLabel: Record<SourceType, string> = ui.sourceType;

const MONTHS_PT_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

/** Deterministic executive pt-BR date, e.g. 15 out 2026. Avoids Node vs browser Intl ICU drift. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  const [year, month, date] = day.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11 || !date) return day;
  return `${Number(date)} ${MONTHS_PT_SHORT[monthIndex]} ${year}`;
}

export { t, ui };
export type { EfesoFit };
