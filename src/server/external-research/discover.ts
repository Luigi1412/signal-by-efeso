import { getExternalResearchLimits } from "./config";
import { dedupeSources } from "./dedup";
import { generateResearchQueries } from "./queries";
import { splitInitialAndDeferred } from "./priority";
import { assessSource } from "./quality";
import type { AssessedSource, DiscoveredSource, ExternalResearchProvider, SearchQuery } from "./types";

export async function discoverCompanySources(input: {
  companyName: string;
  officialDomain?: string | null;
  country?: string | null;
  provider: ExternalResearchProvider;
  horizonMonths?: number;
  asOf?: Date;
}): Promise<{ queries: SearchQuery[]; assessed: AssessedSource[] }> {
  const limits = getExternalResearchLimits();
  const queries = generateResearchQueries({
    companyName: input.companyName,
    officialDomain: input.officialDomain,
    country: input.country,
    maxQueries: limits.maxQueries,
  });
  const discovered: DiscoveredSource[] = [];
  for (const item of queries) {
    const q = item.site ? `site:${item.site} ${item.query}` : item.query;
    const rows = await input.provider.search({ query: q, limit: limits.maxResultsPerQuery });
    discovered.push(...rows);
  }
  const assessed = dedupeSources(
    discovered.map((row) => assessSource(row, input.officialDomain ?? null, input.asOf)),
  );
  return { queries, assessed: assessed.slice(0, limits.maxAcceptedSources * 2) };
}

export function selectAcceptedSources(assessed: AssessedSource[]): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return assessed.filter((row) => row.accepted).slice(0, limits.maxAcceptedSources);
}

export function selectInitialSources(assessed: AssessedSource[], officialDomain?: string | null): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return splitInitialAndDeferred(selectAcceptedSources(assessed), officialDomain, limits.initialAcceptedSourceLimit)
    .initial;
}

export function selectDeferredSources(assessed: AssessedSource[], officialDomain?: string | null): AssessedSource[] {
  const limits = getExternalResearchLimits();
  return splitInitialAndDeferred(selectAcceptedSources(assessed), officialDomain, limits.initialAcceptedSourceLimit)
    .deferred;
}

export function describeSourceMix(accepted: AssessedSource[]) {
  return {
    official: accepted.some((row) => row.sourceQuality === "primary"),
    news: accepted.some((row) => row.sourceType === "news"),
    financial: accepted.some((row) => row.sourceType === "earnings_release" || row.sourceType === "annual_report"),
    strategic: accepted.some((row) => /invest|capex|expansion|restructur/i.test(`${row.title ?? ""} ${row.url}`)),
  };
}
