import assert from "node:assert/strict";
import test from "node:test";
import { assessSource } from "./quality";
import { dedupeSources } from "./dedup";
import {
  createAdminExternalResearchProvider,
  createMemberExternalResearchProvider,
  realExternalResearchConfigured,
} from "./provider";
import { TavilyProviderError } from "./tavily-errors";
import { classifySource, mapTavilySearchResults, parsePublishedAt } from "./tavily-map";
import { TavilyExternalResearchProvider, TAVILY_SEARCH_ENDPOINT } from "./tavily-provider";

const OFFICIAL = "acme-paper.com";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function tavilyHits() {
  return {
    results: [
      {
        url: "https://www.acme-paper.com/investors",
        title: "Investor Relations",
        content: "ignore this tavily snippet",
        score: 0.99,
        published_date: "2026-03-01",
      },
      {
        url: "https://www.reuters.com/business/acme-expands",
        title: "Acme announces expansion",
        content: "also ignored",
        score: 0.42,
        published_date: "2026-04-02",
      },
      {
        url: "https://www.acme-paper.com/investors",
        title: "Investor Relations duplicate",
        published_date: "2026-03-01",
      },
    ],
  };
}

function provider(fetchImpl: typeof fetch) {
  return new TavilyExternalResearchProvider({
    officialDomain: OFFICIAL,
    apiKey: "secret-test-key",
    fetchImpl,
    sleep: async () => undefined,
  });
}

test("maps Tavily hits to discovered sources without inventing dates", () => {
  const mapped = mapTavilySearchResults(
    [
      { url: "https://www.acme-paper.com/newsroom/release", title: "Press release" },
      { url: "https://www.reuters.com/markets/acme", title: "Acme in the news", published_date: "2026-01-15T12:00:00Z" },
      { url: "not-a-url", title: "bad" },
      { url: "http://127.0.0.1/secret", title: "blocked" },
      { url: "https://www.acme-paper.com/annual-report", title: "Annual report 2025", published_at: "not-a-date" },
    ],
    OFFICIAL,
  );
  assert.equal(mapped.length, 3);
  assert.equal(mapped[0]?.sourceType, "press_release");
  assert.equal(mapped[0]?.publishedAt, null);
  assert.equal(mapped[1]?.sourceType, "news");
  assert.equal(mapped[1]?.publishedAt, "2026-01-15");
  assert.equal(mapped[2]?.sourceType, "annual_report");
  assert.equal(mapped[2]?.publishedAt, null);
  assert.equal(parsePublishedAt(undefined), null);
  assert.equal(parsePublishedAt("soon"), null);
});

test("official domain pages are classified separately from secondary news", () => {
  assert.equal(classifySource("https://www.acme-paper.com/", "Home", OFFICIAL).sourceType, "official_page");
  assert.equal(classifySource("https://www.acme-paper.com/", "Home", OFFICIAL).sourceTier, 1);
  assert.equal(classifySource("https://www.reuters.com/world/acme", "Acme news", OFFICIAL).sourceType, "news");
  assert.equal(classifySource("https://www.sec.gov/cgi-bin/browse-edgar", "Acme 20-F", OFFICIAL).sourceType, "filing");
});

test("successful Tavily search maps official and secondary sources and ignores ranking/content", async () => {
  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  try {
    const rows = await provider(async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return jsonResponse(200, tavilyHits());
    }).search({ query: "site:acme-paper.com Acme investor relations", limit: 5 });

    assert.equal(capturedUrl, TAVILY_SEARCH_ENDPOINT);
    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get("authorization"), "Bearer secret-test-key");
    const body = JSON.parse(String(capturedInit?.body ?? "{}")) as Record<string, unknown>;
    assert.equal(body.include_raw_content, false);
    assert.equal(body.include_answer, false);
    assert.deepEqual(body.include_domains, ["acme-paper.com"]);
    assert.equal(typeof body.query, "string");
    assert.equal(String(body.query).includes("site:"), false);

    assert.equal(rows.length, 3);
    assert.ok(rows.some((row) => row.url.includes("acme-paper.com") && row.sourceType === "official_page"));
    assert.ok(rows.some((row) => row.url.includes("reuters.com") && row.sourceType === "news"));
    assert.ok(rows.every((row) => !("content" in row) && !("score" in row)));

    const assessed = dedupeSources(rows.map((row) => assessSource(row, OFFICIAL)));
    assert.equal(assessed.length, 2);
    assert.ok(assessed.some((row) => row.accepted && row.sourceQuality === "primary"));
    assert.ok(assessed.some((row) => row.url.includes("reuters.com") && row.accepted));
    assert.ok(logs.some((line) => line.includes('"provider":"tavily"') && line.includes('"status":"ok"')));
    assert.ok(!logs.join("\n").includes("secret-test-key"));
    assert.ok(!logs.join("\n").includes("Bearer"));
  } finally {
    console.info = originalInfo;
  }
});

test("empty Tavily results return no sources", async () => {
  const rows = await provider(async () => jsonResponse(200, { results: [] })).search({ query: "Acme", limit: 5 });
  assert.deepEqual(rows, []);
});

test("401 and 403 map to TAVILY_AUTH_FAILED without retry", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      provider(async () => {
        calls += 1;
        return jsonResponse(401, { error: "nope" });
      }).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_AUTH_FAILED",
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    () =>
      provider(async () => {
        calls += 1;
        return jsonResponse(403, { error: "forbidden body should not leak" });
      }).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_AUTH_FAILED" && !String(error).includes("forbidden"),
  );
  assert.equal(calls, 1);
});

test("429 retries then maps to TAVILY_RATE_LIMITED", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      provider(async () => {
        calls += 1;
        return jsonResponse(429, { error: "slow down" }, { "retry-after": "1" });
      }).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_RATE_LIMITED",
  );
  assert.equal(calls, 3);
});

test("429 then success is recovered with limited retry", async () => {
  let calls = 0;
  const rows = await provider(async () => {
    calls += 1;
    if (calls === 1) return jsonResponse(429, { error: "slow" });
    return jsonResponse(200, { results: [{ url: "https://www.acme-paper.com/", title: "Acme" }] });
  }).search({ query: "Acme", limit: 3 });
  assert.equal(calls, 2);
  assert.equal(rows.length, 1);
});

test("5xx retries then maps to TAVILY_PROVIDER_ERROR", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      provider(async () => {
        calls += 1;
        return jsonResponse(503, { error: "upstream exploded with secrets" });
      }).search({ query: "Acme", limit: 3 }),
    (error: unknown) =>
      error instanceof TavilyProviderError && error.code === "TAVILY_PROVIDER_ERROR" && !String(error.message).includes("secrets"),
  );
  assert.equal(calls, 3);
});

test("timeout maps to TAVILY_TIMEOUT after limited retry", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      provider(async () => {
        calls += 1;
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_TIMEOUT",
  );
  assert.equal(calls, 3);
});

test("malformed Tavily payload maps to TAVILY_PROVIDER_ERROR", async () => {
  await assert.rejects(
    () => provider(async () => jsonResponse(200, "{")).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_PROVIDER_ERROR",
  );
  await assert.rejects(
    () => provider(async () => jsonResponse(200, { results: "nope" })).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_PROVIDER_ERROR",
  );
  await assert.rejects(
    () => provider(async () => jsonResponse(200, { answer: "not results" })).search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_PROVIDER_ERROR",
  );
});

test("missing API key fails honestly without calling Tavily", async () => {
  let calls = 0;
  const missing = new TavilyExternalResearchProvider({
    apiKey: null,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(200, { results: [] });
    },
  });
  await assert.rejects(
    () => missing.search({ query: "Acme", limit: 3 }),
    (error: unknown) => error instanceof TavilyProviderError && error.code === "TAVILY_AUTH_FAILED",
  );
  assert.equal(calls, 0);
});

test("member factory selects tavily and never silently uses fake", () => {
  const previous = {
    enabled: process.env.EXTERNAL_RESEARCH_ENABLED,
    provider: process.env.EXTERNAL_RESEARCH_PROVIDER,
    key: process.env.TAVILY_API_KEY,
  };
  try {
    process.env.EXTERNAL_RESEARCH_ENABLED = "true";
    process.env.EXTERNAL_RESEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "secret-test-key";
    const member = createMemberExternalResearchProvider(OFFICIAL);
    assert.equal(member?.name, "tavily");
    assert.equal(realExternalResearchConfigured(), true);

    process.env.EXTERNAL_RESEARCH_PROVIDER = "fake";
    assert.equal(createMemberExternalResearchProvider(OFFICIAL), null);

    process.env.EXTERNAL_RESEARCH_PROVIDER = "none";
    assert.equal(createMemberExternalResearchProvider(OFFICIAL), null);
    assert.equal(realExternalResearchConfigured(), false);

    process.env.EXTERNAL_RESEARCH_PROVIDER = "fake";
    const admin = createAdminExternalResearchProvider(OFFICIAL);
    assert.equal(admin?.name, "fake");
  } finally {
    if (previous.enabled === undefined) delete process.env.EXTERNAL_RESEARCH_ENABLED;
    else process.env.EXTERNAL_RESEARCH_ENABLED = previous.enabled;
    if (previous.provider === undefined) delete process.env.EXTERNAL_RESEARCH_PROVIDER;
    else process.env.EXTERNAL_RESEARCH_PROVIDER = previous.provider;
    if (previous.key === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = previous.key;
  }
});

test("fetch of a Tavily URL still uses Signal SSRF rules", async () => {
  await assert.rejects(
    () => provider(async () => jsonResponse(200, { results: [] })).fetchDocument("http://127.0.0.1/secret"),
    /BLOCKED/,
  );
  await assert.rejects(
    () => provider(async () => jsonResponse(200, { results: [] })).fetchDocument("ftp://files.example.com/doc"),
    /BLOCKED|INVALID/,
  );
});
