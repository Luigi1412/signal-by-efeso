import { getExternalResearchLimits } from "./config";
import type { SearchQuery } from "./types";

export function generateResearchQueries(input: {
  companyName: string;
  officialDomain?: string | null;
  country?: string | null;
  aliases?: string[] | null;
  maxQueries?: number;
}): SearchQuery[] {
  const limit = input.maxQueries ?? getExternalResearchLimits().maxQueries;
  const name = input.companyName.trim();
  const aliases = [...new Set([name, ...(input.aliases ?? []).map((a) => a.trim()).filter(Boolean)])];
  const primary = `"${name}"`;
  const aliasClause =
    aliases.length > 1 ? `(${aliases.map((a) => `"${a}"`).join(" OR ")})` : primary;
  const domain = input.officialDomain?.replace(/^www\./, "") ?? null;
  const isBr = (input.country ?? "").toUpperCase().startsWith("BR") || /\.br$/i.test(domain ?? "");

  const onDomain: SearchQuery[] = domain
    ? [
        { query: `${aliasClause} (newsroom OR imprensa OR "press release" OR comunicado OR results OR resultados)`, site: domain },
        { query: `${aliasClause} filetype:pdf (earnings OR results OR resultados OR "full year" OR interim OR annual)`, site: domain },
        { query: `${aliasClause} ("investor relations" OR "relações com investidores" OR investidores OR investors)`, site: domain },
        { query: `${aliasClause} filetype:pdf ("annual report" OR "relatório anual" OR "universal registration" OR 20-F)`, site: domain },
        { query: `${aliasClause} (expansão OR investimento OR fábrica OR capacidade OR aquisição OR integration OR CapEx)`, site: domain },
      ]
    : [];

  const openWeb: SearchQuery[] = [
    { query: `${aliasClause} (aquisição OR fusão OR investimento OR expansão OR fábrica OR CapEx OR reestruturação)`, site: null },
    { query: `${aliasClause} (resultados OR earnings OR receita OR EBITDA OR guidance OR revenue)`, site: null },
    {
      query: isBr
        ? `${aliasClause} (CVM OR B3 OR "fatos relevantes" OR "comunicado ao mercado")`
        : `${aliasClause} (SEC OR "8-K" OR "10-K" OR "20-F" OR filing OR AMF)`,
      site: null,
    },
    {
      query: isBr
        ? `${aliasClause} (Valor OR Exame OR InfoMoney OR "Brazil Journal" OR NeoFeed)`
        : `${aliasClause} (Reuters OR Bloomberg OR "Financial Times" OR WSJ)`,
      site: null,
    },
    { query: `${aliasClause} (supply chain OR logística OR operações OR manufatura OR produção OR productivity)`, site: null },
    { query: `${primary} (markets OR Brasil OR Brazil OR Europe) (2024 OR 2025 OR 2026)`, site: null },
  ];

  const pressSites: SearchQuery[] = isBr
    ? [
        { query: aliasClause, site: "valor.globo.com" },
        { query: aliasClause, site: "exame.com" },
      ]
    : [
        { query: aliasClause, site: "reuters.com" },
        { query: aliasClause, site: "bloomberg.com" },
      ];

  const queries = [...onDomain, ...openWeb, ...pressSites];
  return queries.slice(0, limit);
}

export function officialSeedUrls(domain: string): string[] {
  const host = domain.replace(/^www\./, "");
  return [
    `https://ir.${host}/`,
    `https://ri.${host}/`,
    `https://www.${host}/investors`,
    `https://www.${host}/investor-relations`,
    `https://www.${host}/en/investors`,
    `https://www.${host}/investidores`,
    `https://www.${host}/ri`,
    `https://${host}/investidores`,
    `https://${host}/ri`,
    `https://www.${host}/newsroom`,
    `https://www.${host}/en/newsroom`,
    `https://www.${host}/press-releases`,
    `https://www.${host}/en/newsroom/press-releases`,
    `https://www.${host}/imprensa`,
    `https://www.${host}/noticias`,
    `https://www.${host}/sustainability`,
    `https://www.${host}/sustentabilidade`,
  ];
}

export function seedTypeForUrl(url: string): "official_page" | "press_release" | "annual_report" {
  const lower = url.toLowerCase();
  if (/newsroom|press|imprensa|noticias|notícias/.test(lower)) return "press_release";
  if (/sustainab|sustentab/.test(lower)) return "annual_report";
  return "official_page";
}
