import { hostnameOf, isSubdomainOrEqual, normalizeUrl } from "./normalize";
import { assertSafeHttpUrl } from "./ssrf";
import { classifySource } from "./tavily-map";
import { mapBounded, researchSignal } from "./runtime";
import { officialSeedUrls } from "./queries";
import { extractOfficialPdfLinks } from "./html";
import type { DiscoveredSource, ExternalResearchProvider } from "./types";

/** Only first-party links may establish an additional official IR hostname. */
export function officialLinksFromHtml(html: string, baseUrl: string, domain: string, company: string) {
  const sources: DiscoveredSource[] = [];
  const domains = new Set<string>([domain]);
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = match[2]!.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    let url: URL;
    try {
      url = assertSafeHttpUrl(new URL(match[1]!.replace(/&amp;/g, "&"), baseUrl).href);
    } catch {
      continue;
    }
    const host = hostnameOf(url.href) ?? "";
    // Cross-domain trust only for explicit IR/RI navigation — never for generic "annual report" labels.
    const investorNav =
      /investor relations|rela[cç][oõ]es com investidores|\binvestidores\b|\binvestors\b|\bIR\b|\bRI\b/i.test(label) ||
      /(?:^|\.)(?:ir|ri)\./i.test(host);
    const same = isSubdomainOrEqual(host, domain);
    if (!same && !investorNav) continue;
    if (!same && investorNav) domains.add(host);
    const materialDoc =
      /annual.?report|resultados|financial.?results|press.?release|earnings|relat[oó]rio|production|capacidade|release|capex|f[aá]brica|\.pdf|presentation|apresenta/i.test(
        `${label} ${url.pathname}`,
      );
    if (!investorNav && !materialDoc) continue;
    const classified = classifySource(url.href, label, same ? domain : host);
    sources.push({
      url: normalizeUrl(url.href),
      title: `${company} — ${label || url.pathname}`,
      publisher: company,
      sourceType: classified.sourceType,
      sourceTier: 1,
      publishedAt: null,
    });
    if (sources.length >= 24) break;
  }

  // Explicit PDF harvest from the same HTML (shells often hide docs in footer/assets).
  for (const known of domains) {
    for (const pdf of extractOfficialPdfLinks(html, baseUrl, known, 8)) {
      if (sources.some((row) => row.url === normalizeUrl(pdf))) continue;
      const classified = classifySource(pdf, pdf, known);
      sources.push({
        url: normalizeUrl(pdf),
        title: `${company} — PDF oficial`,
        publisher: company,
        sourceType: classified.sourceType,
        sourceTier: 1,
        publishedAt: null,
      });
    }
  }
  return { sources, domains: [...domains] };
}

export async function discoverOfficialLinks(
  provider: ExternalResearchProvider,
  domain: string,
  company: string,
) {
  const domains = new Set<string>([domain]);
  const sources: DiscoveredSource[] = [];
  const seedPages = [
    `https://${domain}/`,
    `https://www.${domain}/`,
    ...officialSeedUrls(domain).slice(0, 8),
  ];
  const uniqueSeeds = [...new Set(seedPages.map((url) => normalizeUrl(url)))];

  const pages = await mapBounded(uniqueSeeds.slice(0, 6), 2, async (seed) => {
    try {
      const document = await provider.fetchDocument(seed);
      const host = hostnameOf(document.finalUrl) ?? "";
      const trusted =
        isSubdomainOrEqual(host, domain) || /(?:^|\.)(?:ir|ri)\./i.test(host);
      if (!trusted || !document.mimeType.includes("html")) return [] as DiscoveredSource[];
      if (/(?:^|\.)(?:ir|ri)\./i.test(host)) domains.add(host.replace(/^www\./, ""));
      const parsed = officialLinksFromHtml(
        new TextDecoder().decode(document.bytes),
        document.finalUrl,
        domain,
        company,
      );
      for (const extra of parsed.domains) domains.add(extra);
      return parsed.sources;
    } catch {
      researchSignal()?.throwIfAborted();
      return [];
    }
  });

  for (const batch of pages) sources.push(...batch);

  // One hop into IR/results landings for report PDFs.
  const landings = sources
    .filter(
      (source) =>
        source.sourceType === "official_page" ||
        source.sourceType === "earnings_release" ||
        /investor|resultados|earnings|ri\.|ir\./i.test(source.url),
    )
    .slice(0, 3);
  const nested = await mapBounded(landings, 2, async (source) => {
    try {
      const document = await provider.fetchDocument(source.url);
      const trusted = [...domains].find((known) =>
        isSubdomainOrEqual(hostnameOf(document.finalUrl) ?? "", known),
      );
      if (!trusted || !document.mimeType.includes("html")) return [] as DiscoveredSource[];
      return officialLinksFromHtml(
        new TextDecoder().decode(document.bytes),
        document.finalUrl,
        trusted,
        company,
      ).sources.filter((row) =>
        [...domains].some((known) => isSubdomainOrEqual(hostnameOf(row.url) ?? "", known)),
      );
    } catch {
      researchSignal()?.throwIfAborted();
      return [];
    }
  });
  for (const batch of nested) sources.push(...batch);

  return {
    sources: [...new Map(sources.map((source) => [source.url, source])).values()].slice(0, 48),
    domains: [...domains],
  };
}
