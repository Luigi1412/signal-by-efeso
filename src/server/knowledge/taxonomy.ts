import {
  CANONICAL_BUSINESS_PROBLEMS,
  CANONICAL_CAPABILITIES,
  CANONICAL_INDUSTRIES,
  CANONICAL_METHODOLOGIES,
  ENGAGEMENT_STAGES,
  INDUSTRY_SUBSEGMENTS,
  LEGACY_INDUSTRY_ALIASES,
  SERVICE_FAMILIES,
  SERVICE_FAMILY_ALIASES,
  TRANSFORMATION_DIMENSIONS,
} from "./canonical-taxonomy";

export const KNOWLEDGE_OBJECT_TYPES = [
  "capability",
  "methodology",
  "service",
  "industry_expertise",
  "case",
  "credential",
  "result",
  "testimonial",
  "concept",
] as const;

export type KnowledgeObjectType = (typeof KNOWLEDGE_OBJECT_TYPES)[number];

export const KNOWLEDGE_TAG_CATEGORIES = [
  "INDUSTRY",
  "CAPABILITY_DOMAIN",
  "BUSINESS_PROBLEM",
  "GEOGRAPHY",
  "SERVICE_FAMILY",
  "METHODOLOGY",
  "TRANSFORMATION_DIMENSION",
  "ENGAGEMENT_STAGE",
  "SUBSEGMENT",
] as const;

export type KnowledgeTagCategory = (typeof KNOWLEDGE_TAG_CATEGORIES)[number];

export const KNOWLEDGE_OBJECT_STATUSES = [
  "draft",
  "validated",
  "needs_review",
  "active",
  "archived",
] as const;

export const KNOWLEDGE_CANDIDATE_STATUSES = [
  "pending_validation",
  "validated",
  "needs_review",
  "rejected",
  "promoted",
] as const;

export const KNOWLEDGE_CLAIM_RELATIONSHIPS = [
  "defines",
  "supports",
  "describes",
  "quantifies",
  "demonstrates",
] as const;

export const KNOWLEDGE_OBJECT_RELATION_TYPES = [
  "applicable_to_industry",
  "addresses_problem",
  "uses_methodology",
  "demonstrates_capability",
  "related_to",
  "produces_result",
  "part_of",
  "supports_service",
] as const;

export type KnowledgeObjectRelationType = (typeof KNOWLEDGE_OBJECT_RELATION_TYPES)[number];

export const INDUSTRY_TAGS = [
  ...CANONICAL_INDUSTRIES,
  "Automotive",
  "Aerospace",
  "Consumer Goods",
  "Energy",
  "Food & Beverage",
  "Manufacturing",
  "Mining & Metals",
  "Oil & Gas",
  "Transportation",
  "Utilities",
  "Other",
] as const;

export const CAPABILITY_DOMAIN_TAGS = [
  ...CANONICAL_CAPABILITIES.map((row) => row.name),
  "Supply Chain",
  "Procurement",
  "Maintenance",
  "Quality",
  "Manufacturing",
  "Digital",
  "Sustainability",
  "Strategy",
  "Transformation",
  "Organization",
  "Performance Management",
  "Ramp-up",
] as const;

export const BUSINESS_PROBLEM_TAGS = [
  ...CANONICAL_BUSINESS_PROBLEMS.map((row) => row.name),
  "setup reduction",
  "throughput",
  "productivity",
  "inventory",
  "reliability",
  "OEE",
  "yield",
  "waste",
  "cost",
  "lead time",
  "service level",
  "capacity",
  "ramp-up",
  "maintenance",
  "planning",
] as const;

export const SERVICE_FAMILY_TAGS = SERVICE_FAMILIES;
export const METHODOLOGY_TAGS = CANONICAL_METHODOLOGIES.map((row) => row.name);
export const TRANSFORMATION_DIMENSION_TAGS = TRANSFORMATION_DIMENSIONS;
export const ENGAGEMENT_STAGE_TAGS = ENGAGEMENT_STAGES;
export const SUBSEGMENT_TAGS = INDUSTRY_SUBSEGMENTS.map((row) => row.name);

export const GEOGRAPHY_TAGS = [
  "Brazil",
  "Latin America",
  "Global",
  "Europe",
  "North America",
  "Asia",
  "Other",
] as const;

const NAME_NOISE = new Set([
  "methodology",
  "method",
  "programme",
  "program",
  "approach",
  "capability",
  "service",
  "framework",
  "the",
  "efeso",
  "a",
  "an",
]);

export function normalizeKnowledgeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function coreKnowledgeName(value: string): string {
  const tokens = normalizeKnowledgeName(value)
    .split(" ")
    .filter((token) => token.length > 0 && !NAME_NOISE.has(token));
  return tokens.join(" ") || normalizeKnowledgeName(value);
}

const CAPABILITY_ALIAS_MAP: Record<string, string> = {
  opex: "Operational Excellence",
  "operations excellence": "Operational Excellence",
  "operational excellence transformation": "Operational Excellence",
  "supply-chain": "Supply Chain Strategy",
  "asset productivity": "Asset Productivity",
  "cost reduction": "Cost Reduction",
  "working capital": "Working Capital",
  "ramp up": "Ramp-up",
  maintenance: "Maintenance & Reliability",
  quality: "Quality Excellence",
  digital: "Operations AI",
  organization: "Change Management",
  transformation: "Transformation PMO",
  procurement: "Procurement Transformation",
};
for (const capability of CANONICAL_CAPABILITIES) {
  for (const alias of capability.aliases) {
    CAPABILITY_ALIAS_MAP[normalizeKnowledgeName(alias)] = capability.name;
  }
}

const PROBLEM_ALIAS_MAP: Record<string, string> = {
  "set-up reduction": "excessive setup",
  "setup time": "excessive setup",
  "setup reduction": "excessive setup",
  oee: "low OEE",
  "lead-time": "order-cycle delays",
  "lead time": "order-cycle delays",
  "service-level": "low service level",
  "service level": "low service level",
  "ramp up": "ramp-up risk",
  "ramp-up": "ramp-up risk",
  capacity: "capacity constraint",
  maintenance: "asset reliability loss",
  productivity: "low productivity",
  throughput: "low productivity",
  inventory: "excess inventory",
  reliability: "asset reliability loss",
  cost: "cost leakage",
  planning: "disconnected planning",
  yield: "defects and rework",
  waste: "defects and rework",
};
for (const problem of CANONICAL_BUSINESS_PROBLEMS) {
  for (const alias of problem.aliases) {
    PROBLEM_ALIAS_MAP[normalizeKnowledgeName(alias)] = problem.name;
  }
}

const INDUSTRY_ALIAS_MAP: Record<string, string> = { ...LEGACY_INDUSTRY_ALIASES };

const SERVICE_FAMILY_ALIAS_MAP: Record<string, string> = { ...SERVICE_FAMILY_ALIASES };

const METHODOLOGY_ALIAS_MAP: Record<string, string> = {};
for (const method of CANONICAL_METHODOLOGIES) {
  for (const alias of method.aliases) {
    METHODOLOGY_ALIAS_MAP[normalizeKnowledgeName(alias)] = method.name;
  }
}

export const TAG_ALIASES: Record<KnowledgeTagCategory, Record<string, string>> = {
  INDUSTRY: INDUSTRY_ALIAS_MAP,
  CAPABILITY_DOMAIN: CAPABILITY_ALIAS_MAP,
  BUSINESS_PROBLEM: PROBLEM_ALIAS_MAP,
  GEOGRAPHY: {
    brasil: "Brazil",
    br: "Brazil",
    "latin america": "Latin America",
    latam: "Latin America",
    "south america": "Latin America",
    worldwide: "Global",
    global: "Global",
    eu: "Europe",
  },
  SERVICE_FAMILY: SERVICE_FAMILY_ALIAS_MAP,
  METHODOLOGY: METHODOLOGY_ALIAS_MAP,
  TRANSFORMATION_DIMENSION: {},
  ENGAGEMENT_STAGE: {
    academy: "Academy / Capability Building",
    "capability building": "Academy / Capability Building",
  },
  SUBSEGMENT: {
    pharmaceutical: "Pharma",
    "med tech": "MedTech",
    "pulp & paper": "Pulp and Paper",
    agro: "Agribusiness",
  },
};

export function allCanonicalTags(): { category: KnowledgeTagCategory; canonicalName: string }[] {
  return [
    ...INDUSTRY_TAGS.map((canonicalName) => ({ category: "INDUSTRY" as const, canonicalName })),
    ...CAPABILITY_DOMAIN_TAGS.map((canonicalName) => ({ category: "CAPABILITY_DOMAIN" as const, canonicalName })),
    ...BUSINESS_PROBLEM_TAGS.map((canonicalName) => ({ category: "BUSINESS_PROBLEM" as const, canonicalName })),
    ...GEOGRAPHY_TAGS.map((canonicalName) => ({ category: "GEOGRAPHY" as const, canonicalName })),
    ...SERVICE_FAMILY_TAGS.map((canonicalName) => ({ category: "SERVICE_FAMILY" as const, canonicalName })),
    ...METHODOLOGY_TAGS.map((canonicalName) => ({ category: "METHODOLOGY" as const, canonicalName })),
    ...TRANSFORMATION_DIMENSION_TAGS.map((canonicalName) => ({
      category: "TRANSFORMATION_DIMENSION" as const,
      canonicalName,
    })),
    ...ENGAGEMENT_STAGE_TAGS.map((canonicalName) => ({ category: "ENGAGEMENT_STAGE" as const, canonicalName })),
    ...SUBSEGMENT_TAGS.map((canonicalName) => ({ category: "SUBSEGMENT" as const, canonicalName })),
  ];
}

function canonicalListFor(category: KnowledgeTagCategory): readonly string[] {
  switch (category) {
    case "INDUSTRY":
      return INDUSTRY_TAGS;
    case "CAPABILITY_DOMAIN":
      return CAPABILITY_DOMAIN_TAGS;
    case "BUSINESS_PROBLEM":
      return BUSINESS_PROBLEM_TAGS;
    case "GEOGRAPHY":
      return GEOGRAPHY_TAGS;
    case "SERVICE_FAMILY":
      return SERVICE_FAMILY_TAGS;
    case "METHODOLOGY":
      return METHODOLOGY_TAGS;
    case "TRANSFORMATION_DIMENSION":
      return TRANSFORMATION_DIMENSION_TAGS;
    case "ENGAGEMENT_STAGE":
      return ENGAGEMENT_STAGE_TAGS;
    case "SUBSEGMENT":
      return SUBSEGMENT_TAGS;
  }
}

export function mapSuggestedTag(
  category: string,
  suggestedName: string,
): { ok: true; category: KnowledgeTagCategory; canonicalName: string } | { ok: false } {
  if (!KNOWLEDGE_TAG_CATEGORIES.includes(category as KnowledgeTagCategory)) return { ok: false };
  const typed = category as KnowledgeTagCategory;
  const normalized = normalizeKnowledgeName(suggestedName);
  const aliasTarget = TAG_ALIASES[typed][normalized];
  const direct = canonicalListFor(typed).find((name) => normalizeKnowledgeName(name) === normalized);
  const canonicalName = aliasTarget ?? direct ?? null;
  if (!canonicalName) return { ok: false };
  return { ok: true, category: typed, canonicalName };
}

export function canonicalizeTagName(category: string, name: string): string {
  const mapped = mapSuggestedTag(category, name);
  return mapped.ok ? mapped.canonicalName : name;
}
