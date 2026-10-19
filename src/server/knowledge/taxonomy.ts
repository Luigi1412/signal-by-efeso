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
  "Automotive",
  "Aerospace",
  "Chemicals",
  "Consumer Goods",
  "Energy",
  "Food & Beverage",
  "Forest & Packaging",
  "Life Sciences",
  "Manufacturing",
  "Mining & Metals",
  "Oil & Gas",
  "Retail",
  "Transportation",
  "Utilities",
  "Other",
] as const;

export const CAPABILITY_DOMAIN_TAGS = [
  "Operational Excellence",
  "Supply Chain",
  "Procurement",
  "Asset Productivity",
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
  "Cost Reduction",
  "Working Capital",
] as const;

export const BUSINESS_PROBLEM_TAGS = [
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

export const GEOGRAPHY_TAGS = [
  "Brazil",
  "Latin America",
  "Global",
  "Europe",
  "North America",
  "Asia",
  "Other",
] as const;

export const TAG_ALIASES: Record<KnowledgeTagCategory, Record<string, string>> = {
  INDUSTRY: {
    auto: "Automotive",
    automotive: "Automotive",
    "automotive industry": "Automotive",
    "food and beverage": "Food & Beverage",
    fmcg: "Consumer Goods",
    cpgs: "Consumer Goods",
    mining: "Mining & Metals",
    metals: "Mining & Metals",
    pharma: "Life Sciences",
    "oil and gas": "Oil & Gas",
  },
  CAPABILITY_DOMAIN: {
    opex: "Operational Excellence",
    "operations excellence": "Operational Excellence",
    "operational excellence transformation": "Operational Excellence",
    "supply-chain": "Supply Chain",
    "asset productivity": "Asset Productivity",
    "cost reduction": "Cost Reduction",
    "working capital": "Working Capital",
    "ramp up": "Ramp-up",
  },
  BUSINESS_PROBLEM: {
    "set-up reduction": "setup reduction",
    "setup time": "setup reduction",
    oee: "OEE",
    "lead-time": "lead time",
    "service-level": "service level",
    "ramp up": "ramp-up",
  },
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
};

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

export function allCanonicalTags(): { category: KnowledgeTagCategory; canonicalName: string }[] {
  return [
    ...INDUSTRY_TAGS.map((canonicalName) => ({ category: "INDUSTRY" as const, canonicalName })),
    ...CAPABILITY_DOMAIN_TAGS.map((canonicalName) => ({ category: "CAPABILITY_DOMAIN" as const, canonicalName })),
    ...BUSINESS_PROBLEM_TAGS.map((canonicalName) => ({ category: "BUSINESS_PROBLEM" as const, canonicalName })),
    ...GEOGRAPHY_TAGS.map((canonicalName) => ({ category: "GEOGRAPHY" as const, canonicalName })),
  ];
}

export function mapSuggestedTag(
  category: string,
  suggestedName: string,
): { ok: true; category: KnowledgeTagCategory; canonicalName: string } | { ok: false } {
  if (!KNOWLEDGE_TAG_CATEGORIES.includes(category as KnowledgeTagCategory)) return { ok: false };
  const typed = category as KnowledgeTagCategory;
  const normalized = normalizeKnowledgeName(suggestedName);
  const aliasTarget = TAG_ALIASES[typed][normalized];
  const canonicalList =
    typed === "INDUSTRY"
      ? INDUSTRY_TAGS
      : typed === "CAPABILITY_DOMAIN"
        ? CAPABILITY_DOMAIN_TAGS
        : typed === "BUSINESS_PROBLEM"
          ? BUSINESS_PROBLEM_TAGS
          : GEOGRAPHY_TAGS;
  const direct = canonicalList.find((name) => normalizeKnowledgeName(name) === normalized);
  const canonicalName = aliasTarget ?? direct ?? null;
  if (!canonicalName) return { ok: false };
  return { ok: true, category: typed, canonicalName };
}
