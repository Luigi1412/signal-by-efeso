import { hostnameOf, isSubdomainOrEqual, registrableDomain } from "./normalize";
import { isAggregatorHost } from "./aggregators";
import { isRejectedNoiseUrl } from "./source-noise";
import type { AssessedSource } from "./types";

export type SourcePriorityBand =
  | "official_report"
  | "official_ir"
  | "regulatory_filing"
  | "official_newsroom"
  | "reputable_financial_news"
  | "secondary"
  | "weak";

const BAND_RANK: Record<SourcePriorityBand, number> = {
  official_report: 0,
  official_ir: 1,
  regulatory_filing: 2,
  official_newsroom: 3,
  reputable_financial_news: 4,
  secondary: 5,
  weak: 6,
};

const REPUTABLE_NEWS = new Set([
  "reuters.com",
  "ft.com",
  "bloomberg.com",
  "wsj.com",
  "valor.globo.com",
  "folha.uol.com.br",
  "estadao.com.br",
  "exame.com",
  "bnamericas.com",
]);

const IR_HINT = /(?:^|\.)(?:ir|ri)\.|investor|investidores|relations-with-investors|relacoes-com-investidores/i;
const REPORT_HINT =
  /earnings|resultado|resultados|relat[oó]rio|annual.?report|quarter|trimestr|20-f|10-k|financial.?statement|demonstrac/i;
const OPERATIONAL_DISCLOSURE_HINT =
  /deliver(y|ies)|backlog|production|throughput|capacity|ramp[- ]?up|nivelamento|aircraft delivered/i;
const FILING_HOST = /(?:^|\.)(?:sec\.gov|cvm\.gov\.br|b3\.com\.br|gov\.br)$/i;
const NEWSROOM_HINT = /newsroom|media-center|imprensa|press|releases?|noticias|notícias/i;

export function sourcePriorityBand(source: AssessedSource, officialDomain?: string | null): SourcePriorityBand {
  if (!source.accepted || source.sourceQuality === "weak") return "weak";
  const host = hostnameOf(source.canonicalUrl || source.url) ?? "";
  const path = safePath(source.canonicalUrl || source.url);
  const haystack = `${host} ${path} ${source.title ?? ""}`;
  const official = officialDomain ? isSubdomainOrEqual(host, officialDomain) : false;

  const isReportType =
    source.sourceType === "earnings_release" ||
    source.sourceType === "annual_report" ||
    source.sourceType === "sustainability_report" ||
    REPORT_HINT.test(haystack);
  const isFiling =
    source.sourceType === "filing" ||
    source.sourceType === "regulator" ||
    FILING_HOST.test(host) ||
    source.sourceQuality === "authoritative_secondary";
  const isIr = IR_HINT.test(haystack);
  const isNewsroom = NEWSROOM_HINT.test(haystack) || source.sourceType === "press_release";

  if (isListingOrShell(source.canonicalUrl || source.url, source.title ?? "")) {
    if (official) return isNewsroom ? "official_newsroom" : "official_ir";
  }
  if (official && (isReportType || OPERATIONAL_DISCLOSURE_HINT.test(haystack))) return "official_report";
  if (official && isIr) return "official_ir";
  if (isFiling && (official || source.sourceType === "filing" || source.sourceType === "regulator" || FILING_HOST.test(host))) {
    return "regulatory_filing";
  }
  if (official) return isNewsroom ? "official_newsroom" : "official_ir";
  if (REPUTABLE_NEWS.has(registrableDomain(host))) return "reputable_financial_news";
  return "secondary";
}

export function rankSourcesForInitialPass(
  sources: AssessedSource[],
  officialDomain?: string | null,
  companyName?: string | null,
): AssessedSource[] {
  return [...sources].sort((left, right) => {
    const leftSubstance = urlSubstanceScore(left.canonicalUrl || left.url, left.title, officialDomain, companyName);
    const rightSubstance = urlSubstanceScore(right.canonicalUrl || right.url, right.title, officialDomain, companyName);
    // Large substance gaps (e.g. recent operational disclosure vs stale earnings title) outweigh band.
    if (Math.abs(leftSubstance - rightSubstance) >= 40) return rightSubstance - leftSubstance;
    const bandDelta = BAND_RANK[sourcePriorityBand(left, officialDomain)] - BAND_RANK[sourcePriorityBand(right, officialDomain)];
    if (bandDelta !== 0) return bandDelta;
    const qualityDelta = qualityRank(left.sourceQuality) - qualityRank(right.sourceQuality);
    if (qualityDelta !== 0) return qualityDelta;
    const substanceDelta = rightSubstance - leftSubstance;
    if (substanceDelta !== 0) return substanceDelta;
    return comparePublishedAt(right.publishedAt, left.publishedAt);
  });
}

export function splitInitialAndDeferred(
  accepted: AssessedSource[],
  officialDomain: string | null | undefined,
  initialLimit: number,
  companyName?: string | null,
): { initial: AssessedSource[]; deferred: AssessedSource[] } {
  const ranked = rankSourcesForInitialPass(
    accepted.filter((row) => row.accepted),
    officialDomain,
    companyName,
  );
  const limit = Math.max(1, initialLimit);
  return {
    initial: ranked.slice(0, limit),
    deferred: ranked.slice(limit),
  };
}

function qualityRank(quality: AssessedSource["sourceQuality"]): number {
  if (quality === "primary") return 0;
  if (quality === "authoritative_secondary") return 1;
  if (quality === "secondary") return 2;
  return 3;
}

function comparePublishedAt(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

export function urlSubstanceScore(
  url: string,
  title?: string | null,
  officialDomain?: string | null,
  companyName?: string | null,
): number {
  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = (title ?? "").toLowerCase();
  const hay = `${normalizedUrl} ${normalizedTitle}`;
  const path = normalizedUrl;
  const officialHost = officialDomain?.replace(/^www\./, "").toLowerCase() ?? null;
  const isOfficial = Boolean(officialHost && normalizedUrl.includes(officialHost));
  const named = mentionsCompany(hay, companyName);
  let score = 0;
  if (/\.pdf(?:$|\?)/i.test(normalizedUrl)) score += 50;
  if (/news-post|\/noticias\/|press-release/.test(hay)) score += 40;
  if (/resultado|earnings|2q|1q|3q|4q|quarterly|financial results/.test(hay) && !/central-de-resultados|results-center/.test(path)) {
    score += 40;
  }
  // Operational disclosures only boost when they clearly belong to this company (or its official domain).
  // Otherwise aerospace/backlog articles can outrank retail IR pages for unrelated queries.
  const operationalHit =
    /deliver(y|ies)|backlog|production|throughput|capacity|ramp[- ]?up|nivelamento|aircraft delivered/.test(hay);
  if (operationalHit && (named || isOfficial)) {
    score += 45;
  }
  if (/edgar|20-f|6-k|10-k/.test(hay)) score += 35;
  const year = inferTitleYear(title) ?? inferUrlYear(normalizedUrl);
  if (year !== null) {
    if (year >= 2025) score += 25;
    else if (year <= 2023) score -= 35;
  }
  if (isListingOrShell(normalizedUrl, normalizedTitle)) score -= 40;
  if (isRejectedNoiseUrl(normalizedUrl)) score -= 80;
  if (isAggregatorHost(normalizedUrl)) score -= 70;
  if (isOfficial) score += 5;
  if (isOfficial && /\.pdf(?:$|\?)/i.test(normalizedUrl)) score += 35;
  if (named) score += 30;
  else if (companyTokens(companyName).length > 0 && !isOfficial) score -= 50;
  // Prefer named articles on reputable press over generic IR index pages.
  if (named && /reuters|bloomberg|valor\.globo|exame\.com|infomoney|yahoo\.com|cnbc/i.test(normalizedUrl)) {
    score += 20;
  }
  if (/aquisi[cç][aã]o|fus[aã]o|investimento|expans[aã]o|fábrica|capex|m&a|takeover/i.test(hay) && named) {
    score += 25;
  }
  // Thin media-center detail pages often lack article body; prefer substantive articles/PDFs.
  if (/mediatype=news&detail=/i.test(normalizedUrl) && !/\.pdf(?:$|\?)/i.test(normalizedUrl)) score -= 20;
  return score;
}

function companyTokens(companyName?: string | null): string[] {
  if (!companyName) return [];
  return companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !GENERIC_COMPANY_TOKENS.has(token));
}

function mentionsCompany(hay: string, companyName?: string | null): boolean {
  const tokens = companyTokens(companyName);
  if (tokens.length === 0) return false;
  const normalizedHay = hay
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return tokens.some((token) => normalizedHay.includes(token));
}

const GENERIC_COMPANY_TOKENS = new Set([
  "ltda",
  "limitada",
  "company",
  "companies",
  "group",
  "grupo",
  "holding",
  "sa",
  "inc",
  "corp",
  "corporation",
  "plc",
  "llc",
]);

function inferTitleYear(title?: string | null): number | null {
  if (!title) return null;
  const match = title.match(/\b(20[12]\d)\b/);
  if (!match?.[1]) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function inferUrlYear(url: string): number | null {
  const match = url.match(/\/(20[12]\d)\//);
  if (!match?.[1]) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function isListingOrShell(url: string, title: string): boolean {
  const hay = `${url} ${title}`.toLowerCase();
  if (/investor-faqs|investor-contacts|ir-agenda|ir contact/.test(hay)) return true;
  if (/central-de-resultados|results-center/.test(hay) && /default\.aspx|\/$/.test(url)) return true;
  if (/default\.aspx/.test(url) && /home|faq|contact|agenda/.test(hay)) return true;
  if (/relatorios-de-sustentabilidade\/?$/.test(url)) return true;
  return false;
}

function safePath(raw: string): string {
  try {
    return new URL(raw).pathname.toLowerCase();
  } catch {
    return "";
  }
}
