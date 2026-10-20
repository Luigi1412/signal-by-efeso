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
  const batches = await Promise.all(
    queries.map(async (item) => {
      const q = item.site ? `site:${item.site} ${item.query}` : item.query;
      try {
        return await input.provider.search({ query: q, limit: limits.maxResultsPerQuery });
      } catch {
        return [] as DiscoveredSource[];
      }
    }),
  );
  for (const rows of batches) discovered.push(...rows);

  const assessed = dedupeSources(
    discovered.map((row) =>
      assessSource(row, input.officialDomain ?? null, input.asOf, input.companyName),
    ),
  );
  return { queries, assessed: assessed.slice(0, limits.maxAcceptedSources * 3) };
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
