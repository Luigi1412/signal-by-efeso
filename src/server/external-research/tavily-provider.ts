import { getExternalResearchLimits, getTavilyApiKey } from "./config";
import { HttpExternalResearchProvider } from "./http-provider";
import { extractSiteRestriction, mapTavilySearchResults, type TavilySearchHit } from "./tavily-map";
import { TavilyProviderError } from "./tavily-errors";
import type { DiscoveredSource, ExternalResearchProvider, FetchedDocument } from "./types";

export const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 5000;

/**
 * Tavily is used for source discovery only (Search API).
 * Tavily `content`, `raw_content` and ranking `score` are ignored.
 * Fetch always goes through HttpExternalResearchProvider → safeFetch so
 * SSRF, MIME, redirect, timeout and byte limits stay in Signal.
 * Tavily Extract is not used: it would skip Signal fetch security and provenance.
 */
export interface TavilyProviderOptions {
  officialDomain?: string | null;
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
}

export class TavilyExternalResearchProvider implements ExternalResearchProvider {
  readonly name = "tavily";
  private readonly http: HttpExternalResearchProvider;
  private readonly officialDomain: string | null;
  private readonly apiKey: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(options: TavilyProviderOptions = {}) {
    this.officialDomain = options.officialDomain ?? null;
    // Explicit null must win over env (tests / fail-closed callers).
    this.apiKey = options.apiKey !== undefined ? options.apiKey : getTavilyApiKey();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.timeoutMs = options.timeoutMs ?? getExternalResearchLimits().fetchTimeoutMs;
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
    this.http = new HttpExternalResearchProvider(this.officialDomain);
  }

  async search(input: { query: string; limit: number }): Promise<DiscoveredSource[]> {
    const started = Date.now();
    const limits = getExternalResearchLimits();
    const limit = Math.min(Math.max(1, input.limit), limits.maxResultsPerQuery);
    try {
      const payload = await this.searchTavily(input.query, limit);
      const mapped = mapTavilySearchResults(payload, this.officialDomain);
      logProvider({ status: "ok", resultCount: mapped.length, latencyMs: Date.now() - started });
      return mapped;
    } catch (error) {
      const code = error instanceof TavilyProviderError ? error.code : "TAVILY_PROVIDER_ERROR";
      logProvider({ status: code, resultCount: 0, latencyMs: Date.now() - started });
      throw error instanceof TavilyProviderError
        ? error
        : new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily search failed.");
    }
  }

  async fetchPage(url: string): Promise<FetchedDocument> {
    return this.http.fetchPage(url);
  }

  async fetchDocument(url: string): Promise<FetchedDocument> {
    return this.http.fetchDocument(url);
  }

  private async searchTavily(rawQuery: string, limit: number): Promise<TavilySearchHit[]> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new TavilyProviderError("TAVILY_AUTH_FAILED", "Tavily API key is not configured.");
    }

    const { query, includeDomains } = extractSiteRestriction(rawQuery);
    const payload: Record<string, unknown> = {
      query,
      max_results: limit,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    };
    if (includeDomains.length > 0) payload.include_domains = includeDomains;
    const body = JSON.stringify(payload);

    let lastError: TavilyProviderError | null = null;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(TAVILY_SEARCH_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body,
        });
        if (response.status === 401 || response.status === 403) {
          throw new TavilyProviderError("TAVILY_AUTH_FAILED", "Tavily authentication failed.");
        }
        if (response.status === 429) {
          lastError = new TavilyProviderError("TAVILY_RATE_LIMITED", "Tavily rate limited the request.");
          if (attempt >= this.maxAttempts) throw lastError;
          await this.sleep(retryDelayMs(response, attempt));
          continue;
        }
        if (response.status === 408 || response.status === 504) {
          lastError = new TavilyProviderError("TAVILY_TIMEOUT", "Tavily request timed out.");
          if (attempt >= this.maxAttempts) throw lastError;
          await this.sleep(retryDelayMs(response, attempt));
          continue;
        }
        if (response.status >= 500) {
          lastError = new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily returned a server error.");
          if (attempt >= this.maxAttempts) throw lastError;
          await this.sleep(retryDelayMs(response, attempt));
          continue;
        }
        if (!response.ok) {
          throw new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily request failed.");
        }
        return parseTavilyResults(await response.text());
      } catch (error) {
        if (error instanceof TavilyProviderError) throw error;
        if (isTimeoutError(error)) {
          lastError = new TavilyProviderError("TAVILY_TIMEOUT", "Tavily request timed out.");
          if (attempt >= this.maxAttempts) throw lastError;
          await this.sleep(backoffMs(attempt));
          continue;
        }
        lastError = new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily network error.");
        if (attempt >= this.maxAttempts) throw lastError;
        await this.sleep(backoffMs(attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError ?? new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily search failed.");
  }
}

function parseTavilyResults(text: string): TavilySearchHit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily returned a malformed response.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily returned a malformed response.");
  }
  const results = (parsed as { results?: unknown }).results;
  if (results == null) {
    throw new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily returned a malformed response.");
  }
  if (!Array.isArray(results)) {
    throw new TavilyProviderError("TAVILY_PROVIDER_ERROR", "Tavily returned a malformed response.");
  }
  return results as TavilySearchHit[];
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

function retryDelayMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  }
  return backoffMs(attempt);
}

function backoffMs(attempt: number): number {
  return Math.min(BACKOFF_MS * attempt, MAX_BACKOFF_MS);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logProvider(input: { status: string; resultCount: number; latencyMs: number }) {
  console.info(
    JSON.stringify({
      provider: "tavily",
      queryCount: 1,
      resultCount: input.resultCount,
      latencyMs: input.latencyMs,
      status: input.status,
    }),
  );
}
