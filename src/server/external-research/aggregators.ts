import { registrableDomain } from "./normalize";

/** Low-authority financial aggregators — never treat as official earnings/annual reports. */
const AGGREGATOR_HOSTS = new Set([
  "companiesmarketcap.com",
  "marketcap.com",
  "stockanalysis.com",
  "investing.com",
  "marketscreener.com",
  "simplywall.st",
  "gurufocus.com",
  "macrotrends.net",
  "tracxn.com",
  "crunchbase.com",
  "pitchbook.com",
  "owler.com",
  "zoominfo.com",
  "craft.co",
]);

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
  "infomoney.com.br",
  "neofeed.com.br",
  "braziljournal.com",
  "cnbc.com",
]);

export function isAggregatorHost(hostOrUrl: string): boolean {
  const host = normalizeHost(hostOrUrl);
  const root = registrableDomain(host);
  return AGGREGATOR_HOSTS.has(root) || AGGREGATOR_HOSTS.has(host);
}

export function publisherAuthorityClass(
  hostOrUrl: string,
  officialDomain?: string | null,
): "official" | "regulatory" | "reputable_news" | "aggregator" | "unknown" {
  const host = normalizeHost(hostOrUrl);
  if (officialDomain) {
    const official = officialDomain.replace(/^www\./, "").toLowerCase();
    if (host === official || host.endsWith(`.${official}`)) return "official";
  }
  if (/(?:^|\.)(?:sec\.gov|cvm\.gov\.br|b3\.com\.br)$/i.test(host)) return "regulatory";
  if (isAggregatorHost(host)) return "aggregator";
  if (REPUTABLE_NEWS.has(registrableDomain(host))) return "reputable_news";
  return "unknown";
}

function normalizeHost(hostOrUrl: string): string {
  if (hostOrUrl.includes("://")) {
    try {
      return new URL(hostOrUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return hostOrUrl.toLowerCase();
    }
  }
  return hostOrUrl.replace(/^www\./, "").toLowerCase();
}
