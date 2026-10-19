import { mapSuggestedTag, normalizeKnowledgeName } from "./taxonomy";

export interface KnowledgeSearchRecord {
  id: string;
  canonicalName: string;
  normalizedName: string;
  objectType: string;
  shortDescription: string;
  status: string;
  aliases: string[];
  tags: { category: string; canonicalName: string }[];
  demoOrigin?: boolean;
}

export interface KnowledgeSearchFilters {
  query?: string | null;
  objectType?: string | null;
  industry?: string | null;
  capability?: string | null;
  businessProblem?: string | null;
  geography?: string | null;
  status?: string | null;
  limit?: number;
}

export interface RankedKnowledgeHit {
  record: KnowledgeSearchRecord;
  rank: number;
  matchedBecause: string[];
}

export interface RelevantKnowledgeContext {
  companyId?: string | null;
  industries?: string[];
  themes?: string[];
  businessProblems?: string[];
  geographies?: string[];
  signalKeywords?: string[];
}

function hasTag(record: KnowledgeSearchRecord, category: string, canonicalName: string): boolean {
  return record.tags.some((tag) => tag.category === category && tag.canonicalName === canonicalName);
}

function mappedTag(category: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const mapped = mapSuggestedTag(category, value);
  return mapped.ok ? mapped.canonicalName : null;
}

export function rankKnowledgeSearch(
  records: KnowledgeSearchRecord[],
  filters: KnowledgeSearchFilters,
): RankedKnowledgeHit[] {
  const status = filters.status ?? "active";
  const query = filters.query?.trim() ?? "";
  const queryNorm = normalizeKnowledgeName(query);
  const industry = mappedTag("INDUSTRY", filters.industry);
  const capability = mappedTag("CAPABILITY_DOMAIN", filters.capability);
  const problem = mappedTag("BUSINESS_PROBLEM", filters.businessProblem);
  const geography = mappedTag("GEOGRAPHY", filters.geography);
  const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;

  const hits: RankedKnowledgeHit[] = [];
  for (const record of records) {
    if (record.status !== status) continue;
    if (filters.objectType && record.objectType !== filters.objectType) continue;
    if (industry && !hasTag(record, "INDUSTRY", industry)) continue;
    if (capability && !hasTag(record, "CAPABILITY_DOMAIN", capability)) continue;
    if (problem && !hasTag(record, "BUSINESS_PROBLEM", problem)) continue;
    if (geography && !hasTag(record, "GEOGRAPHY", geography)) continue;

    const matchedBecause: string[] = [];
    let rank = 4;
    if (queryNorm) {
      const canonicalNorm = normalizeKnowledgeName(record.canonicalName);
      const aliasHit = record.aliases.some((alias) => normalizeKnowledgeName(alias) === queryNorm);
      const tagHit = record.tags.some((tag) => normalizeKnowledgeName(tag.canonicalName) === queryNorm);
      const textHit =
        canonicalNorm.includes(queryNorm) ||
        normalizeKnowledgeName(record.shortDescription).includes(queryNorm) ||
        record.aliases.some((alias) => normalizeKnowledgeName(alias).includes(queryNorm));
      if (canonicalNorm === queryNorm) {
        rank = 1;
        matchedBecause.push(`exact_canonical:${record.canonicalName}`);
      } else if (aliasHit) {
        rank = 2;
        matchedBecause.push("alias_match");
      } else if (tagHit) {
        rank = 3;
        matchedBecause.push("tag_match");
      } else if (textHit) {
        rank = 4;
        matchedBecause.push("text_match");
      } else {
        continue;
      }
    }
    if (industry) matchedBecause.push(`industry:${industry}`);
    if (capability) matchedBecause.push(`capability_domain:${capability}`);
    if (problem) matchedBecause.push(`business_problem:${problem}`);
    if (geography) matchedBecause.push(`geography:${geography}`);

    hits.push({ record, rank, matchedBecause });
  }

  hits.sort((a, b) => a.rank - b.rank || a.record.canonicalName.localeCompare(b.record.canonicalName));
  return hits.slice(0, limit);
}

export function matchRelevantKnowledge(
  records: KnowledgeSearchRecord[],
  context: RelevantKnowledgeContext,
): RankedKnowledgeHit[] {
  const industries = (context.industries ?? []).map((value) => mappedTag("INDUSTRY", value)).filter(Boolean) as string[];
  const problems = (context.businessProblems ?? [])
    .map((value) => mappedTag("BUSINESS_PROBLEM", value))
    .filter(Boolean) as string[];
  const geographies = (context.geographies ?? [])
    .map((value) => mappedTag("GEOGRAPHY", value))
    .filter(Boolean) as string[];
  const themes = context.themes ?? [];
  const keywords = (context.signalKeywords ?? []).map((value) => normalizeKnowledgeName(value)).filter(Boolean);

  const hits: RankedKnowledgeHit[] = [];
  for (const record of records) {
    if (record.status !== "active") continue;
    const matchedBecause: string[] = [];
    for (const industry of industries) {
      if (hasTag(record, "INDUSTRY", industry)) matchedBecause.push(`industry:${industry}`);
    }
    for (const problem of problems) {
      if (hasTag(record, "BUSINESS_PROBLEM", problem)) matchedBecause.push(`business_problem:${problem}`);
    }
    for (const geography of geographies) {
      if (hasTag(record, "GEOGRAPHY", geography)) matchedBecause.push(`geography:${geography}`);
    }
    for (const theme of themes) {
      const capability = mappedTag("CAPABILITY_DOMAIN", theme);
      if (capability && hasTag(record, "CAPABILITY_DOMAIN", capability)) {
        matchedBecause.push(`capability_domain:${capability}`);
      }
      const problem = mappedTag("BUSINESS_PROBLEM", theme);
      if (problem && hasTag(record, "BUSINESS_PROBLEM", problem)) {
        matchedBecause.push(`business_problem:${problem}`);
      }
      if (normalizeKnowledgeName(record.canonicalName) === normalizeKnowledgeName(theme)) {
        matchedBecause.push(`exact_canonical:${record.canonicalName}`);
      }
    }
    for (const keyword of keywords) {
      const inName = normalizeKnowledgeName(record.canonicalName).includes(keyword);
      const inAlias = record.aliases.some((alias) => normalizeKnowledgeName(alias).includes(keyword));
      const inTag = record.tags.some((tag) => normalizeKnowledgeName(tag.canonicalName).includes(keyword));
      const inText = normalizeKnowledgeName(record.shortDescription).includes(keyword);
      if (inName || inAlias || inTag || inText) {
        matchedBecause.push(`signal_keyword:${keyword}`);
      }
    }
    if (matchedBecause.length === 0) continue;
    hits.push({
      record,
      rank: matchedBecause.some((reason) => reason.startsWith("exact_canonical")) ? 1 : 3,
      matchedBecause: [...new Set(matchedBecause)],
    });
  }
  hits.sort((a, b) => a.rank - b.rank || a.record.canonicalName.localeCompare(b.record.canonicalName));
  return hits;
}
