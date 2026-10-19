import { getExternalResearchLimits } from "./config";
import type { SearchQuery } from "./types";

export function generateResearchQueries(input: {
  companyName: string;
  officialDomain?: string | null;
  country?: string | null;
  maxQueries?: number;
}): SearchQuery[] {
  const limit = input.maxQueries ?? getExternalResearchLimits().maxQueries;
  const name = input.companyName.trim();
  const domain = input.officialDomain?.replace(/^www\./, "") ?? null;
  const queries: SearchQuery[] = [
    { query: `${name} newsroom press release deliveries production`, site: domain },
    { query: `${name} earnings results`, site: domain },
    { query: `${name} resultados earnings pdf`, site: domain },
    { query: `${name} deliveries backlog production capacity ramp-up`, site: null },
    { query: `${name} investor relations`, site: domain },
    { query: `${name} regulatory filing SEC CVM`, site: null },
    { query: `${name} financial news Reuters Bloomberg`, site: null },
    { query: `${name} annual report relatório anual pdf`, site: domain },
  ];
  return queries.slice(0, limit);
}

export function officialSeedUrls(domain: string): string[] {
  const host = domain.replace(/^www\./, "");
  return [
    `https://${host}/`,
    `https://www.${host}/`,
    `https://${host}/investors`,
    `https://${host}/investor-relations`,
    `https://ir.${host}/`,
    `https://${host}/newsroom`,
    `https://${host}/press-releases`,
    `https://${host}/sustainability`,
  ];
}
