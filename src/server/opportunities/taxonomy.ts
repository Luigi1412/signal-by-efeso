export const OPPORTUNITY_STATUSES = [
  "draft",
  "validated",
  "needs_review",
  "active",
  "archived",
  "dismissed",
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const OPPORTUNITY_CANDIDATE_STATUSES = [
  "pending_validation",
  "validated",
  "needs_review",
  "rejected",
  "promoted",
] as const;

export const OPPORTUNITY_TYPES = [
  "operational_excellence",
  "asset_productivity",
  "maintenance",
  "ramp_up",
  "capacity_optimization",
  "supply_chain",
  "procurement",
  "working_capital",
  "cost_reduction",
  "restructuring_support",
  "performance_management",
  "digital_transformation",
  "automation",
  "sustainability",
  "decarbonization",
  "organization_transformation",
  "strategy_execution",
  "quality",
  "productivity",
  "transformation_management",
  "other",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_MATURITIES = ["emerging", "developing", "established"] as const;
export type OpportunityMaturity = (typeof OPPORTUNITY_MATURITIES)[number];

export const OPPORTUNITY_LEVELS = ["low", "medium", "high"] as const;
export type OpportunityLevel = (typeof OPPORTUNITY_LEVELS)[number];

export const OPPORTUNITY_CONFIDENCE_TIERS = ["direct", "supported", "inferred"] as const;
export type OpportunityConfidenceTier = (typeof OPPORTUNITY_CONFIDENCE_TIERS)[number];

export const OPPORTUNITY_ASSERTION_MODES = [
  "reported_actual",
  "announced",
  "planned",
  "expected",
  "target",
  "estimated",
  "conditional",
  "unspecified",
] as const;

export type OpportunityAssertionMode = (typeof OPPORTUNITY_ASSERTION_MODES)[number];

export const OPPORTUNITY_SIGNAL_RELATIONSHIPS = ["trigger", "supporting", "contextual"] as const;
export type OpportunitySignalRelationship = (typeof OPPORTUNITY_SIGNAL_RELATIONSHIPS)[number];

export const OPPORTUNITY_FIT_RELATIONSHIPS = ["primary", "supporting"] as const;
export type OpportunityFitRelationship = (typeof OPPORTUNITY_FIT_RELATIONSHIPS)[number];

export const OPPORTUNITY_KNOWLEDGE_RELATIONSHIPS = [
  "capability",
  "service",
  "methodology",
  "case",
  "result",
  "credential",
] as const;

export type OpportunityKnowledgeRelationship = (typeof OPPORTUNITY_KNOWLEDGE_RELATIONSHIPS)[number];

export const OPPORTUNITY_RATIONALE_TYPES = [
  "signal_trigger",
  "account_context",
  "efeso_relevance",
  "supporting_case",
  "urgency_reason",
  "uncertainty",
] as const;

export type OpportunityRationaleType = (typeof OPPORTUNITY_RATIONALE_TYPES)[number];

export const OPPORTUNITY_DISMISSAL_REASONS = [
  "not_relevant",
  "already_known",
  "no_client_need",
  "poor_fit",
  "duplicate",
  "outdated",
  "other",
] as const;

export type OpportunityDismissalReason = (typeof OPPORTUNITY_DISMISSAL_REASONS)[number];

export const SIGNAL_TYPE_TO_OPPORTUNITY_TYPES: Record<string, OpportunityType[]> = {
  capacity_increase: ["ramp_up", "asset_productivity", "capacity_optimization"],
  capacity_reduction: ["capacity_optimization", "asset_productivity"],
  capex_investment: ["asset_productivity", "ramp_up", "capacity_optimization"],
  expansion: ["ramp_up", "capacity_optimization", "asset_productivity"],
  new_facility: ["ramp_up"],
  production_ramp_up: ["ramp_up"],
  maintenance_shutdown: ["maintenance", "asset_productivity"],
  operational_issue: ["operational_excellence", "productivity"],
  quality_issue: ["quality"],
  financial_pressure: ["cost_reduction", "working_capital"],
  cost_reduction_program: ["cost_reduction"],
  restructuring: ["restructuring_support", "organization_transformation", "cost_reduction"],
  workforce_change: ["organization_transformation"],
  leadership_change: ["organization_transformation"],
  supply_chain_change: ["supply_chain"],
  sustainability_program: ["sustainability"],
  decarbonization: ["decarbonization", "sustainability"],
  digital_transformation: ["digital_transformation"],
  automation_program: ["automation", "digital_transformation"],
  strategic_plan: ["strategy_execution"],
  performance_improvement: ["performance_management", "productivity"],
  performance_decline: ["performance_management", "operational_excellence"],
  plant_closure: ["restructuring_support", "cost_reduction"],
};

export const OPPORTUNITY_TYPE_TO_CAPABILITIES: Record<OpportunityType, string[]> = {
  operational_excellence: ["Operational Excellence"],
  asset_productivity: ["Asset Productivity"],
  maintenance: ["Maintenance"],
  ramp_up: ["Ramp-up", "Asset Productivity"],
  capacity_optimization: ["Asset Productivity", "Manufacturing"],
  supply_chain: ["Supply Chain"],
  procurement: ["Procurement"],
  working_capital: ["Working Capital"],
  cost_reduction: ["Cost Reduction"],
  restructuring_support: ["Transformation", "Organization"],
  performance_management: ["Performance Management"],
  digital_transformation: ["Digital"],
  automation: ["Digital"],
  sustainability: ["Sustainability"],
  decarbonization: ["Sustainability"],
  organization_transformation: ["Organization", "Transformation"],
  strategy_execution: ["Strategy", "Operational Excellence"],
  quality: ["Quality"],
  productivity: ["Operational Excellence", "Asset Productivity"],
  transformation_management: ["Transformation"],
  other: [],
};

export const EXPLICIT_NEED_SIGNAL_TYPES = new Set([
  "cost_reduction_program",
  "production_ramp_up",
  "maintenance_shutdown",
  "operational_issue",
  "quality_issue",
  "restructuring",
  "sustainability_program",
  "decarbonization",
  "digital_transformation",
  "automation_program",
]);

export function isOpportunityType(value: string): value is OpportunityType {
  return (OPPORTUNITY_TYPES as readonly string[]).includes(value);
}
