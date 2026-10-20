export function isExternalResearchEnabled(): boolean {
  return process.env.EXTERNAL_RESEARCH_ENABLED !== "false";
}

export function getExternalResearchProviderName(): "tavily" | "http" | "fake" | "none" {
  const value = (process.env.EXTERNAL_RESEARCH_PROVIDER ?? "none").trim().toLowerCase();
  if (value === "tavily") return "tavily";
  if (value === "fake") return "fake";
  if (value === "http") return "http";
  return "none";
}

export function getTavilyApiKey(): string | null {
  const key = process.env.TAVILY_API_KEY?.trim();
  return key ? key : null;
}

export function allowFakeExternalResearch(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return getExternalResearchProviderName() === "fake";
}

export function getExternalResearchLimits() {
  return {
    maxQueries: readPositiveInt("EXTERNAL_RESEARCH_MAX_QUERIES", 12),
    maxResultsPerQuery: readPositiveInt("EXTERNAL_RESEARCH_MAX_RESULTS_PER_QUERY", 8),
    maxAcceptedSources: readPositiveInt("EXTERNAL_RESEARCH_MAX_ACCEPTED_SOURCES", 32),
    initialAcceptedSourceLimit: readPositiveInt("RESEARCH_INITIAL_ACCEPTED_SOURCE_LIMIT", 8),
    enrichmentSourceLimit: readPositiveInt("RESEARCH_ENRICHMENT_SOURCE_LIMIT", 18),
    maxBytesPerSource: readPositiveInt("EXTERNAL_RESEARCH_MAX_BYTES_PER_SOURCE", 4 * 1024 * 1024),
    maxTotalBytes: readPositiveInt("EXTERNAL_RESEARCH_MAX_TOTAL_BYTES", 28 * 1024 * 1024),
    maxRedirects: readPositiveInt("EXTERNAL_RESEARCH_MAX_REDIRECTS", 3),
    fetchTimeoutMs: readPositiveInt("EXTERNAL_RESEARCH_FETCH_TIMEOUT_MS", 8000),
    defaultHorizonMonths: readPositiveInt("EXTERNAL_RESEARCH_TIME_HORIZON_MONTHS", 24),
    maxConcurrentRuns: readPositiveInt("EXTERNAL_RESEARCH_MAX_CONCURRENT_RUNS", 2),
    maxRunsPerUserPerHour: readPositiveInt("EXTERNAL_RESEARCH_MAX_RUNS_PER_USER_HOUR", 6),
  };
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}
