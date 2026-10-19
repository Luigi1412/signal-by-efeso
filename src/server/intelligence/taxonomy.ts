export const ACCOUNT_INTELLIGENCE_STATUSES = [
  "draft",
  "validated",
  "needs_review",
  "active",
  "archived",
] as const;

export type AccountIntelligenceStatus = (typeof ACCOUNT_INTELLIGENCE_STATUSES)[number];

export const ACCOUNT_INTELLIGENCE_CANDIDATE_STATUSES = [
  "pending_validation",
  "validated",
  "needs_review",
  "rejected",
  "promoted",
] as const;

export const ACCOUNT_INTELLIGENCE_SECTIONS = [
  "strategic_priorities",
  "investments_and_expansion",
  "operational_pressures",
  "transformation_themes",
  "risk_and_constraints",
  "leadership_and_organization",
  "financial_context",
  "sustainability_context",
  "unresolved_questions",
] as const;

export type AccountIntelligenceSectionKey = (typeof ACCOUNT_INTELLIGENCE_SECTIONS)[number];

export const ACCOUNT_SIGNAL_RELATIONSHIPS = ["primary", "supporting", "contextual"] as const;
export type AccountSignalRelationship = (typeof ACCOUNT_SIGNAL_RELATIONSHIPS)[number];

export const TENSION_TYPES = [
  "growth_vs_cost_pressure",
  "expansion_vs_restructuring",
  "capacity_vs_demand_pressure",
  "investment_vs_financial_constraint",
  "sustainability_vs_operational_constraint",
  "leadership_change_during_transformation",
  "other",
] as const;

export type TensionType = (typeof TENSION_TYPES)[number];

export const TEMPORAL_STATES = [
  "historical",
  "recent",
  "ongoing",
  "planned",
  "expected",
  "target",
  "completed",
] as const;

export type TemporalState = (typeof TEMPORAL_STATES)[number];

export const FIT_LEVELS = ["low", "medium", "high"] as const;
export type FitLevel = (typeof FIT_LEVELS)[number];

export const FIT_COMPONENT_TYPES = [
  "industry_match",
  "capability_match",
  "business_problem_match",
  "geography_match",
  "signal_type_match",
  "methodology_match",
  "case_relevance",
  "credential_relevance",
  "result_relevance",
  "recurring_theme_match",
] as const;

export type FitComponentType = (typeof FIT_COMPONENT_TYPES)[number];

export const FIT_SOURCE_TYPES = [
  "knowledge_tag",
  "knowledge_object",
  "signal",
  "account_theme",
  "company",
] as const;

export const SIGNAL_KNOWLEDGE_MATCH_TYPES = [
  "industry",
  "capability",
  "business_problem",
  "methodology",
  "case",
  "result",
  "credential",
  "geography",
  "theme",
] as const;

export type SignalKnowledgeMatchType = (typeof SIGNAL_KNOWLEDGE_MATCH_TYPES)[number];

export const MATCH_STRENGTHS = ["weak", "medium", "strong"] as const;
export type MatchStrength = (typeof MATCH_STRENGTHS)[number];

export const OFFERING_OBJECT_TYPES = ["capability", "service", "methodology"] as const;

export const SIGNAL_TYPE_TAG_HINTS: Record<string, { category: string; canonicalName: string }[]> = {
  capex_investment: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Manufacturing" },
    { category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
  ],
  expansion: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Manufacturing" },
    { category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
  ],
  new_facility: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Manufacturing" }],
  plant_closure: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Manufacturing" },
    { category: "BUSINESS_PROBLEM", canonicalName: "cost" },
  ],
  acquisition: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  divestment: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  merger: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  leadership_change: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Organization" }],
  restructuring: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Transformation" },
    { category: "BUSINESS_PROBLEM", canonicalName: "cost" },
  ],
  cost_reduction_program: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Cost Reduction" },
    { category: "BUSINESS_PROBLEM", canonicalName: "cost" },
  ],
  workforce_change: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Organization" }],
  supply_chain_change: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Supply Chain" }],
  capacity_increase: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
    { category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
  ],
  capacity_reduction: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Asset Productivity" },
    { category: "BUSINESS_PROBLEM", canonicalName: "capacity" },
  ],
  production_ramp_up: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Ramp-up" },
    { category: "BUSINESS_PROBLEM", canonicalName: "ramp-up" },
  ],
  maintenance_shutdown: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Maintenance" },
    { category: "BUSINESS_PROBLEM", canonicalName: "maintenance" },
  ],
  digital_transformation: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Digital" }],
  automation_program: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Digital" }],
  sustainability_program: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Sustainability" }],
  decarbonization: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Sustainability" }],
  operational_issue: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Operational Excellence" }],
  quality_issue: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Quality" }],
  financial_pressure: [
    { category: "CAPABILITY_DOMAIN", canonicalName: "Working Capital" },
    { category: "BUSINESS_PROBLEM", canonicalName: "cost" },
  ],
  regulatory_change: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  partnership: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  new_market_entry: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  strategic_plan: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Strategy" }],
  performance_improvement: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Performance Management" }],
  performance_decline: [{ category: "CAPABILITY_DOMAIN", canonicalName: "Performance Management" }],
};

export const SIGNAL_TYPE_SECTION: Partial<Record<string, AccountIntelligenceSectionKey>> = {
  strategic_plan: "strategic_priorities",
  partnership: "strategic_priorities",
  new_market_entry: "strategic_priorities",
  acquisition: "investments_and_expansion",
  capex_investment: "investments_and_expansion",
  expansion: "investments_and_expansion",
  new_facility: "investments_and_expansion",
  operational_issue: "operational_pressures",
  maintenance_shutdown: "operational_pressures",
  production_ramp_up: "operational_pressures",
  workforce_change: "operational_pressures",
  capacity_increase: "operational_pressures",
  capacity_reduction: "operational_pressures",
  digital_transformation: "transformation_themes",
  automation_program: "transformation_themes",
  restructuring: "transformation_themes",
  performance_improvement: "transformation_themes",
  plant_closure: "risk_and_constraints",
  quality_issue: "risk_and_constraints",
  regulatory_change: "risk_and_constraints",
  leadership_change: "leadership_and_organization",
  financial_pressure: "financial_context",
  cost_reduction_program: "financial_context",
  divestment: "financial_context",
  sustainability_program: "sustainability_context",
  decarbonization: "sustainability_context",
};

export function mapCompanyIndustryToTag(industry: string | null | undefined): string | null {
  const value = (industry ?? "").toLowerCase();
  if (!value) return null;
  if (value.includes("minera") || value.includes("mining") || value.includes("metal")) return "Mining & Metals";
  if (value.includes("consumo") || value.includes("beleza") || value.includes("consumer") || value.includes("beauty")) {
    return "Consumer Goods";
  }
  if (value.includes("energia") || value.includes("energy") || value.includes("agroneg") || value.includes("oil")) {
    return "Energy";
  }
  if (value.includes("auto")) return "Automotive";
  if (value.includes("food") || value.includes("alimento")) return "Food & Beverage";
  if (value.includes("chemical") || value.includes("quimic")) return "Chemicals";
  return null;
}

export function isOfferingObjectType(objectType: string): boolean {
  return (OFFERING_OBJECT_TYPES as readonly string[]).includes(objectType);
}
