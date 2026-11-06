import { getExternalResearchLimits } from "./config";
import type { DocumentClass } from "./document-classes";
import type { SearchQuery } from "./types";

export interface ClassSearchQuery extends SearchQuery {
  documentClass?: DocumentClass;
}

/**
 * Directed discovery by documentary class after official identity/domain resolve.
 * Language adapts to BR vs international; never company-hardcoded.
 */
export function generateResearchQueries(input: {
  companyName: string;
  officialDomain?: string | null;
  country?: string | null;
  aliases?: string[] | null;
  maxQueries?: number;
}): ClassSearchQuery[] {
  const limit = input.maxQueries ?? getExternalResearchLimits().maxQueries;
  const name = input.companyName.trim();
  const aliases = [...new Set([name, ...(input.aliases ?? []).map((a) => a.trim()).filter(Boolean)])];
  const primary = `"${name}"`;
  const aliasClause =
    aliases.length > 1 ? `(${aliases.map((a) => `"${a}"`).join(" OR ")})` : primary;
  const domain = input.officialDomain?.replace(/^www\./, "") ?? null;
  const isBr = (input.country ?? "").toUpperCase().startsWith("BR") || /\.br$/i.test(domain ?? "");

  const onDomain: ClassSearchQuery[] = domain
    ? [
        {
          query: `${aliasClause} ("investor relations" OR "relações com investidores" OR investidores OR investors OR RI OR IR)`,
          site: domain,
          documentClass: "investor_relations",
        },
        {
          query: `${aliasClause} filetype:pdf (earnings OR results OR resultados OR "full year" OR interim OR quarterly OR trimestr OR balanço)`,
          site: domain,
          documentClass: "financial_results",
        },
        {
          query: `${aliasClause} (resultados OR earnings OR "financial results" OR "release de resultados")`,
          site: domain,
          documentClass: "financial_results",
        },
        {
          query: `${aliasClause} filetype:pdf ("annual report" OR "relatório anual" OR "universal registration" OR 20-F OR 10-K)`,
          site: domain,
          documentClass: "annual_report",
        },
        {
          query: `${aliasClause} (newsroom OR imprensa OR "press release" OR comunicado OR releases)`,
          site: domain,
          documentClass: "official_release",
        },
        {
          query: `${aliasClause} (presentation OR apresentação OR "investor day" OR slides)`,
          site: domain,
          documentClass: "presentation",
        },
        {
          query: isBr
            ? `${aliasClause} (expansão OR investimento OR fábrica OR capacidade OR CapEx OR aquisição OR integração OR automação OR logística OR produtividade)`
            : `${aliasClause} (expansion OR investment OR factory OR capacity OR CapEx OR acquisition OR integration OR automation OR logistics OR productivity)`,
          site: domain,
          documentClass: "operations_capex",
        },
      ]
    : [];

  // Prefer ri.* for BR issuers and ir.* internationally when domain is known.
  const irHostQueries: ClassSearchQuery[] = domain
    ? isBr || /\.br$/i.test(domain)
      ? [
          {
            query: `${aliasClause} filetype:pdf (resultados OR earnings OR release OR trimestr OR anual)`,
            site: `ri.${domain}`,
            documentClass: "financial_results",
          },
          {
            query: `${aliasClause} (resultados OR "central de resultados" OR investidores)`,
            site: `ri.${domain}`,
            documentClass: "investor_relations",
          },
        ]
      : [
          {
            query: `${aliasClause} filetype:pdf (earnings OR results OR "annual report" OR interim)`,
            site: `ir.${domain}`,
            documentClass: "financial_results",
          },
          {
            query: `${aliasClause} (earnings OR "investor relations" OR reports)`,
            site: `ir.${domain}`,
            documentClass: "investor_relations",
          },
        ]
    : [];

  const openWeb: ClassSearchQuery[] = [
    {
      query: isBr
        ? `${aliasClause} (CVM OR B3 OR "fatos relevantes" OR "comunicado ao mercado")`
        : `${aliasClause} (SEC OR "8-K" OR "10-K" OR "20-F" OR filing OR AMF)`,
      site: null,
      documentClass: "regulatory_filing",
    },
    {
      query: isBr
        ? `${aliasClause} (aquisição OR fusão OR investimento OR expansão OR fábrica OR CapEx OR reestruturação OR capacidade)`
        : `${aliasClause} (acquisition OR merger OR investment OR expansion OR factory OR CapEx OR restructuring OR capacity)`,
      site: null,
      documentClass: "operations_capex",
    },
    {
      query: `${aliasClause} (resultados OR earnings OR receita OR EBITDA OR guidance OR revenue OR "net revenue")`,
      site: null,
      documentClass: "financial_results",
    },
    {
      query: isBr
        ? `${aliasClause} (supply chain OR logística OR operações OR manufatura OR produção OR produtividade OR automação)`
        : `${aliasClause} (supply chain OR logistics OR operations OR manufacturing OR production OR productivity OR automation)`,
      site: null,
      documentClass: "operations_capex",
    },
    {
      query: isBr
        ? `${aliasClause} (Valor OR Exame OR InfoMoney OR "Brazil Journal" OR NeoFeed)`
        : `${aliasClause} (Reuters OR Bloomberg OR "Financial Times" OR WSJ)`,
      site: null,
      documentClass: "news_secondary",
    },
  ];

  const pressSites: ClassSearchQuery[] = isBr
    ? [
        { query: aliasClause, site: "valor.globo.com", documentClass: "news_secondary" },
        { query: aliasClause, site: "exame.com", documentClass: "news_secondary" },
      ]
    : [
        { query: aliasClause, site: "reuters.com", documentClass: "news_secondary" },
        { query: aliasClause, site: "bloomberg.com", documentClass: "news_secondary" },
      ];

  // Core official/financial first; press last so maxQueries cuts news before IR/results.
  const queries = [...onDomain, ...irHostQueries, ...openWeb, ...pressSites];
  return prioritizeUniqueQueries(queries).slice(0, limit);
}

export function officialSeedUrls(domain: string): string[] {
  const host = domain.replace(/^www\./, "");
  const isBr = /\.br$/i.test(host);
  const seeds = [
    `https://www.${host}/`,
    `https://www.${host}/investors`,
    `https://www.${host}/en/investors`,
    `https://www.${host}/investidores`,
    `https://www.${host}/ri`,
    `https://www.${host}/newsroom`,
    `https://www.${host}/en/newsroom/press-releases`,
    `https://www.${host}/imprensa`,
  ];
  // BR public companies commonly use ri.*; international IR often ir.*.
  if (isBr) {
    seeds.unshift(`https://ri.${host}/`, `https://ri.${host}/pt/`, `https://ri.${host}/en/`);
  } else {
    seeds.unshift(`https://ir.${host}/`, `https://ri.${host}/`);
  }
  return [...new Set(seeds)];
}

export function seedTypeForUrl(url: string): "official_page" | "press_release" | "annual_report" {
  const lower = url.toLowerCase();
  if (/newsroom|press|imprensa|noticias|notícias/.test(lower)) return "press_release";
  if (/sustainab|sustentab/.test(lower)) return "annual_report";
  return "official_page";
}

function prioritizeUniqueQueries(queries: ClassSearchQuery[]): ClassSearchQuery[] {
  const seen = new Set<string>();
  const out: ClassSearchQuery[] = [];
  for (const row of queries) {
    const key = `${row.site ?? ""}|${row.query}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
