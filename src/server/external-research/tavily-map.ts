import { isAggregatorHost } from "./aggregators";
import { hostnameOf, isSubdomainOrEqual, registrableDomain } from "./normalize";
import { assertSafeHttpUrl } from "./ssrf";
import type { DiscoveredSource, ExternalSourceType } from "./types";

const NEWS_HOSTS = new Set([
  "reuters.com",
  "ft.com",
  "bloomberg.com",
  "wsj.com",
  "valor.globo.com",
  "folha.uol.com.br",
  "estadao.com.br",
  "exame.com",
  "bnamericas.com",
  "nytimes.com",
  "theguardian.com",
  "infomoney.com.br",
  "neofeed.com.br",
  "braziljournal.com",
  "cnbc.com",
]);

const REGULATOR_HOSTS = [/sec\.gov$/, /cvm\.gov\.br$/, /b3\.com\.br$/, /gov\.br$/, /europa\.eu$/];

export interface TavilySearchHit {
  url?: unknown;
  title?: unknown;
  published_date?: unknown;
  published_at?: unknown;
}

export function mapTavilySearchResults(
  hits: TavilySearchHit[],
  officialDomain?: string | null,
): DiscoveredSource[] {
  const mapped: DiscoveredSource[] = [];
  for (const hit of hits) {
    const url = typeof hit.url === "string" ? hit.url.trim() : "";
    if (!url) continue;
    try {
      assertSafeHttpUrl(url);
    } catch {
      continue;
    }
    const host = hostnameOf(url) ?? "";
    const classified = classifySource(url, typeof hit.title === "string" ? hit.title : "", officialDomain);
    mapped.push({
      url,
      title: typeof hit.title === "string" && hit.title.trim() ? hit.title.trim() : null,
      publisher: publisherFromHost(host),
      sourceType: classified.sourceType,
      sourceTier: classified.sourceTier,
      publishedAt: parsePublishedAt(hit.published_date ?? hit.published_at),
    });
  }
  return mapped;
}

export function parsePublishedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match?.[1]) return null;
  const stamp = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(stamp.getTime())) return null;
  return match[1];
}

/**
 * Classify by publisher authority first, then by official-domain path/title cues.
 * Aggregators must never be labeled earnings_release / annual_report.
 */
export function classifySource(
  url: string,
  title: string,
  officialDomain?: string | null,
): { sourceType: ExternalSourceType; sourceTier: 1 | 2 | 3 | 4 } {
  const host = (hostnameOf(url) ?? "").toLowerCase();
  const haystack = `${url} ${title}`.toLowerCase();
  const official = officialDomain ? isSubdomainOrEqual(host, officialDomain) : false;

  if (REGULATOR_HOSTS.some((pattern) => pattern.test(host))) {
    return {
      sourceType: host.includes("sec") || host.includes("cvm") || host.includes("b3") ? "filing" : "regulator",
      sourceTier: 2,
    };
  }

  if (isAggregatorHost(host)) {
    // Tier 3 = secondary context only — never earnings_release / annual_report.
    return { sourceType: "other", sourceTier: 3 };
  }

  if (isNewsHost(host)) {
    return { sourceType: "news", sourceTier: 3 };
  }

  // Document-type cues only promote to earnings/annual/press when on the official domain.
  if (official) {
    if (/sustainab|relatorio-de-sustent|esg|gri-report/.test(haystack)) {
      return { sourceType: "sustainability_report", sourceTier: 1 };
    }
    if (/annual[- ]?report|relatorio-anual|20-f|10-k|\.pdf/.test(haystack) && /annual|relat[oó]rio|20-f|10-k/.test(haystack)) {
      return { sourceType: "annual_report", sourceTier: 1 };
    }
    if (/earnings|quarterly[- ]?result|resultados|q[1-4][-/ ]?20|full[- ]?year|interim/.test(haystack)) {
      return { sourceType: "earnings_release", sourceTier: 1 };
    }
    if (/press[- ]?release|newsroom|media-center|sala-de-imprensa|comunicado|comunicati/.test(haystack)) {
      return { sourceType: "press_release", sourceTier: 1 };
    }
    if (/investor|relations|\/ir\/|ri\.|investidores|investisseurs/.test(haystack)) {
      return { sourceType: "official_page", sourceTier: 1 };
    }
    return { sourceType: "official_page", sourceTier: 1 };
  }

  // Non-official: never invent earnings_release from the word "earnings" in an aggregator-like path.
  if (/press[- ]?release|newsroom|comunicado/.test(haystack)) {
    return { sourceType: "other", sourceTier: 3 };
  }
  return { sourceType: "other", sourceTier: 3 };
}

function isNewsHost(host: string): boolean {
  if (NEWS_HOSTS.has(host) || NEWS_HOSTS.has(registrableDomain(host))) return true;
  for (const known of NEWS_HOSTS) {
    if (host === known || host.endsWith(`.${known}`)) return true;
  }
  return false;
}

function publisherFromHost(host: string): string {
  const domain = registrableDomain(host);
  return domain || host || "unknown";
}

export function extractSiteRestriction(query: string): { query: string; includeDomains: string[] } {
  const match = query.match(/\bsite:([a-z0-9.-]+)/i);
  if (!match?.[1]) return { query, includeDomains: [] };
  const domain = match[1].replace(/^www\./, "").toLowerCase();
  return {
    query: query.replace(/\bsite:[a-z0-9.-]+\s*/i, "").trim() || query,
    includeDomains: [domain],
  };
}
