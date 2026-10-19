import { hostnameOf, isSubdomainOrEqual, registrableDomain } from "./normalize";
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
const FILING_HOST = /(?:^|\.)(?:sec\.gov|cvm\.gov\.br|b3\.com\.br|gov\.br)$/i;
const NEWSROOM_HINT = /newsroom|imprensa|press|releases?|noticias|notícias/i;

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
  if (official && isReportType) return "official_report";
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
): AssessedSource[] {
  return [...sources].sort((left, right) => {
    const bandDelta = BAND_RANK[sourcePriorityBand(left, officialDomain)] - BAND_RANK[sourcePriorityBand(right, officialDomain)];
    if (bandDelta !== 0) return bandDelta;
    const qualityDelta = qualityRank(left.sourceQuality) - qualityRank(right.sourceQuality);
    if (qualityDelta !== 0) return qualityDelta;
    const substanceDelta = urlSubstanceScore(right.canonicalUrl || right.url, right.title, officialDomain)
      - urlSubstanceScore(left.canonicalUrl || left.url, left.title, officialDomain);
    if (substanceDelta !== 0) return substanceDelta;
    return comparePublishedAt(right.publishedAt, left.publishedAt);
  });
}

export function splitInitialAndDeferred(
  accepted: AssessedSource[],
  officialDomain: string | null | undefined,
  initialLimit: number,
): { initial: AssessedSource[]; deferred: AssessedSource[] } {
  const ranked = rankSourcesForInitialPass(
    accepted.filter((row) => row.accepted),
    officialDomain,
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

export function urlSubstanceScore(url: string, title?: string | null, officialDomain?: string | null): number {
  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = (title ?? "").toLowerCase();
  const hay = `${normalizedUrl} ${normalizedTitle}`;
  const path = normalizedUrl;
  let score = 0;
  if (/\.pdf(?:$|\?)/i.test(normalizedUrl)) score += 50;
  if (/news-post|\/noticias\/|press-release/.test(hay)) score += 40;
  if (/resultado|earnings|2q|1q|3q|4q|quarterly|financial results/.test(hay) && !/central-de-resultados|results-center/.test(path)) {
    score += 40;
  }
  if (/edgar|20-f|6-k|10-k/.test(hay)) score += 35;
  if (isListingOrShell(normalizedUrl, normalizedTitle)) score -= 40;
  if (officialDomain && normalizedUrl.includes(officialDomain.replace(/^www\./, "").toLowerCase())) score += 5;
  return score;
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
