export const SIGNAL_TYPES = [
  "capex_investment",
  "expansion",
  "new_facility",
  "plant_closure",
  "acquisition",
  "divestment",
  "merger",
  "leadership_change",
  "restructuring",
  "cost_reduction_program",
  "workforce_change",
  "supply_chain_change",
  "capacity_increase",
  "capacity_reduction",
  "production_ramp_up",
  "maintenance_shutdown",
  "digital_transformation",
  "automation_program",
  "sustainability_program",
  "decarbonization",
  "operational_issue",
  "quality_issue",
  "financial_pressure",
  "regulatory_change",
  "partnership",
  "new_market_entry",
  "strategic_plan",
  "performance_improvement",
  "performance_decline",
  "other",
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_NATURES = ["event", "state"] as const;
export type SignalNature = (typeof SIGNAL_NATURES)[number];

export const SIGNAL_STATUSES = ["draft", "validated", "needs_review", "active", "archived"] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export const SIGNAL_CANDIDATE_STATUSES = [
  "pending_validation",
  "validated",
  "needs_review",
  "rejected",
  "promoted",
] as const;

export const SIGNAL_IMPORTANCE_LEVELS = ["low", "medium", "high"] as const;
export type SignalImportance = (typeof SIGNAL_IMPORTANCE_LEVELS)[number];

export const SIGNAL_CONFIDENCE_TIERS = ["direct", "supported", "mixed"] as const;
export type SignalConfidenceTier = (typeof SIGNAL_CONFIDENCE_TIERS)[number];

export const SIGNAL_CLAIM_RELATIONSHIPS = [
  "primary_evidence",
  "supporting_evidence",
  "contextual_evidence",
] as const;
export type SignalClaimRelationship = (typeof SIGNAL_CLAIM_RELATIONSHIPS)[number];

export const SIGNAL_COMPANY_ROLES = [
  "primary",
  "acquirer",
  "target",
  "partner",
  "supplier",
  "customer",
  "affected",
] as const;
export type SignalCompanyRole = (typeof SIGNAL_COMPANY_ROLES)[number];

export const HIGH_IMPORTANCE_TYPES = new Set<SignalType>([
  "plant_closure",
  "acquisition",
  "divestment",
  "merger",
  "new_facility",
  "restructuring",
  "capex_investment",
]);

export const MEDIUM_IMPORTANCE_TYPES = new Set<SignalType>([
  "expansion",
  "capacity_increase",
  "capacity_reduction",
  "workforce_change",
  "cost_reduction_program",
  "digital_transformation",
  "automation_program",
  "sustainability_program",
  "decarbonization",
  "partnership",
  "new_market_entry",
  "strategic_plan",
  "production_ramp_up",
  "supply_chain_change",
  "leadership_change",
  "financial_pressure",
]);

const EVENT_NOISE = new Set([
  "the",
  "a",
  "an",
  "company",
  "announces",
  "announced",
  "plans",
  "planned",
  "to",
  "will",
  "is",
  "are",
  "of",
  "in",
  "for",
  "and",
  "build",
  "building",
  "construct",
  "constructing",
]);

const EVENT_SYNONYMS: Record<string, string> = {
  facility: "plant",
  facilities: "plant",
};

export function normalizeSignalText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function coreEventPhrase(value: string): string {
  const tokens = normalizeSignalText(value)
    .split(" ")
    .map((token) => EVENT_SYNONYMS[token] ?? token)
    .filter((token) => token.length > 0 && !EVENT_NOISE.has(token));
  return tokens.join(" ") || normalizeSignalText(value);
}

export function isAllowedSignalType(value: string): value is SignalType {
  return (SIGNAL_TYPES as readonly string[]).includes(value);
}
