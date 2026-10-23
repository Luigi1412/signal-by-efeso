import { mapBounded, countResearch, researchSignal } from "./runtime";
import { rankSourcesForInitialPass } from "./priority";
import { discoverOfficialLinks } from "./official-links";
import { hostnameOf, isSubdomainOrEqual } from "./normalize";
import { classifySource } from "./tavily-map";
import { getExternalResearchLimits } from "./config";
import { dedupeSources } from "./dedup";
import { generateResearchQueries, officialSeedUrls, seedTypeForUrl } from "./queries";
import { splitInitialAndDeferred } from "./priority";
import { assessSource } from "./quality";
import type { AssessedSource, DiscoveredSource, ExternalResearchProvider, SearchQuery } from "./types";

export async function discoverCompanySources(input: {
  companyName: string;
  officialDomain?: string | null;
  country?: string | null;
  aliases?: string[] | null;
  provider: ExternalResearchProvider;
  horizonMonths?: number;
  asOf?: Date;
}): Promise<{ queries: SearchQuery[]; assessed: AssessedSource[] }> {
  const limits = getExternalResearchLimits();
  const queries = generateResearchQueries({
    companyName: input.companyName,
    officialDomain: input.officialDomain,
    country: input.country,
    aliases: input.aliases,
    maxQueries: limits.maxQueries,
  });
  const discovered: DiscoveredSource[] = [];
  let officialDomains = input.officialDomain ? [input.officialDomain] : [];
  if (input.officialDomain) {
    try {const links=await discoverOfficialLinks(input.provider,input.officialDomain,input.companyName);discovered.push(...links.sources);officialDomains=links.domains;}
    catch {researchSignal()?.throwIfAborted();}
  }
  const since = new Date(input.asOf ?? new Date());
  since.setUTCMonth(since.getUTCMonth() - (input.horizonMonths ?? limits.defaultHorizonMonths));

  if (input.officialDomain) {
    for (const url of officialSeedUrls(input.officialDomain)) {
      discovered.push({
        url,
        title: `${input.companyName} — ${seedLabel(url)}`,
        publisher: input.companyName,
        sourceType: seedTypeForUrl(url),
        sourceTier: 1,
        publishedAt: null,
      });
    }
  }

  // Independent queries in parallel (bounded by provider rate limits via existing retries).
  const searchErrors: unknown[] = [];
  const batches = await mapBounded(queries, 2, async (item) => {
      const q = item.site ? `site:${item.site} ${item.query}` : item.query;
      try {
        return await input.provider.search({ query: q, limit: limits.maxResultsPerQuery, publishedAfter: since.toISOString().slice(0,10) });
      } catch (error) {
        searchErrors.push(error);
        researchSignal()?.throwIfAborted();
        return [] as DiscoveredSource[];
      }
    });
  if (searchErrors.length === queries.length && queries.length > 0) throw searchErrors[0];
  for (const rows of batches) discovered.push(...rows);

  const assessed = dedupeSources(
    discovered.map((row) =>
      (() => {
        const trustedDomain=officialDomains.find(domain=>isSubdomainOrEqual(hostnameOf(row.url)??"",domain));
        const domain=trustedDomain ?? input.officialDomain ?? null;
        const classified=trustedDomain?classifySource(row.url,row.title??"",trustedDomain):null;
        return assessSource(classified?{...row,...classified}:row,domain,input.asOf,input.companyName,input.horizonMonths);
      })(),
    ),
  );
  countResearch("urlsDiscovered", assessed.length);
  return { queries, assessed: rankSourcesForInitialPass(assessed, input.officialDomain, input.companyName).slice(0, limits.maxAcceptedSources * 3) };
}

export function selectAcceptedSources(assessed: AssessedSource[]): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return assessed.filter((row) => row.accepted).slice(0, limits.maxAcceptedSources);
}

export function selectInitialSources(
  assessed: AssessedSource[],
  officialDomain?: string | null,
  companyName?: string | null,
): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return splitInitialAndDeferred(
    selectAcceptedSources(assessed),
    officialDomain,
    limits.initialAcceptedSourceLimit,
    companyName,
  ).initial;
}

export function selectDeferredSources(
  assessed: AssessedSource[],
  officialDomain?: string | null,
  companyName?: string | null,
): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return splitInitialAndDeferred(
    selectAcceptedSources(assessed),
    officialDomain,
    limits.initialAcceptedSourceLimit,
    companyName,
  ).deferred;
}

export function describeSourceMix(accepted: AssessedSource[]) {
  return {
    official: accepted.some((row) => row.sourceQuality === "primary"),
    news: accepted.some((row) => row.sourceType === "news"),
    financial: accepted.some((row) => row.sourceType === "earnings_release" || row.sourceType === "annual_report"),
    strategic: accepted.some((row) =>
      /invest|capex|expansion|restructur|aquisi|fus[aã]o|fábrica|capacidade/i.test(`${row.title ?? ""} ${row.url}`),
    ),
  };
}

function seedLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    if (/^(?:ir|ri)\./i.test(hostname)) return "Investor Relations";
    if (/invest/i.test(pathname)) return "Investidores";
    if (/newsroom|press|imprensa|noticias/i.test(pathname)) return "Imprensa";
    if (/sustain|sustent/i.test(pathname)) return "Sustentabilidade";
    return hostname.replace(/^www\./, "");
  } catch {
    return "Fonte oficial";
  }
}
