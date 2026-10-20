import assert from "node:assert/strict";
import test from "node:test";
import { rankSourcesForInitialPass, sourcePriorityBand, splitInitialAndDeferred } from "./priority";
import { assessSource } from "./quality";
import type { DiscoveredSource } from "./types";

function source(overrides: Partial<DiscoveredSource> & Pick<DiscoveredSource, "url" | "sourceType">): ReturnType<typeof assessSource> {
  return assessSource(
    {
      title: overrides.title ?? "Source",
      publisher: overrides.publisher ?? "Publisher",
      sourceTier: overrides.sourceTier ?? 1,
      publishedAt: overrides.publishedAt ?? "2026-04-01",
      canonicalUrl: overrides.canonicalUrl,
      ...overrides,
    },
    "suzano.com.br",
  );
}

test("official IR and earnings rank above Reuters and blogs", () => {
  const ir = source({
    url: "https://ir.suzano.com.br/",
    title: "Investor Relations",
    publisher: "Suzano",
    sourceType: "official_page",
  });
  const earnings = source({
    url: "https://www.suzano.com.br/investors/resultados-1t26",
    title: "Resultados 1T26",
    publisher: "Suzano",
    sourceType: "earnings_release",
  });
  const reuters = source({
    url: "https://www.reuters.com/markets/suzano-results",
    title: "Suzano results",
    publisher: "Reuters",
    sourceType: "news",
    sourceTier: 2,
  });
  const blog = assessSource(
    {
      url: "https://random-blog.example/suzano",
      title: "Hot take",
      publisher: "Blog",
      sourceType: "other",
      sourceTier: 4,
      publishedAt: "2026-04-13",
    },
    "suzano.com.br",
  );

  assert.equal(sourcePriorityBand(earnings, "suzano.com.br"), "official_report");
  assert.equal(sourcePriorityBand(ir, "suzano.com.br"), "official_ir");
  assert.equal(sourcePriorityBand(reuters, "suzano.com.br"), "reputable_financial_news");
  assert.equal(sourcePriorityBand(blog, "suzano.com.br"), "weak");

  const ranked = rankSourcesForInitialPass([reuters, blog, ir, earnings], "suzano.com.br");
  assert.equal(ranked[0]?.url, earnings.url);
  assert.equal(ranked[1]?.url, ir.url);
  assert.equal(ranked[2]?.url, reuters.url);
});

test("operational delivery disclosure ranks above older generic earnings title", () => {
  const domain = "example-aero.com";
  const companyName = "Example Aero";
  const deliveries = assessSource(
    {
      url: "https://www.example-aero.com/media-center/en?detail=23997",
      title: "Example Aero reports 91 aircraft delivered in the fourth quarter",
      publisher: "example-aero.com",
      sourceType: "official_page",
      sourceTier: 1,
      publishedAt: "2026-01-15",
    },
    domain,
  );
  const olderEarnings = assessSource(
    {
      url: "https://www.example-aero.com/media-center/en?detail=13834",
      title: "Earnings Results 4th Quarter 2023 and Fiscal Year 2023",
      publisher: "example-aero.com",
      sourceType: "earnings_release",
      sourceTier: 1,
      publishedAt: "2024-03-01",
    },
    domain,
  );
  assert.equal(sourcePriorityBand(deliveries, domain), "official_report");
  assert.equal(sourcePriorityBand(olderEarnings, domain), "official_report");
  const ranked = rankSourcesForInitialPass([olderEarnings, deliveries], domain, companyName);
  assert.equal(ranked[0]?.url, deliveries.url);
});

test("off-topic aerospace articles do not outrank company-named retail sources", () => {
  const domain = "americanas.com.br";
  const companyName = "Americanas";
  const retail = assessSource(
    {
      url: "https://ri.americanas.io/en/investor-information/cvm-filings",
      title: "Americanas CVM filings",
      publisher: "Americanas",
      sourceType: "filing",
      sourceTier: 2,
      publishedAt: "2026-03-01",
    },
    domain,
  );
  const aerospace = assessSource(
    {
      url: "https://www.cnbc.com/2026/01/11/boeing-plane-deliveries-production-pace.html",
      title: "Boeing plane deliveries are the highest in years. Now it's ramping up",
      publisher: "CNBC",
      sourceType: "news",
      sourceTier: 2,
      publishedAt: "2026-01-11",
    },
    domain,
  );
  const ranked = rankSourcesForInitialPass([aerospace, retail], domain, companyName);
  assert.equal(ranked[0]?.url, retail.url);
});

test("earnings article ranks above IR listing shells", () => {
  const article = source({
    url: "https://www.suzano.com.br/en/news-post/second-quarter-results-suzano",
    title: "Suzano Second Quarter 2025 Financial Results",
    publisher: "Suzano",
    sourceType: "earnings_release",
  });
  const listing = source({
    url: "https://ir.suzano.com.br/English/financials/Results-Center/default.aspx",
    title: "Suzano - Financial Information - Results Center",
    publisher: "Suzano",
    sourceType: "official_page",
  });
  assert.equal(sourcePriorityBand(article, "suzano.com.br"), "official_report");
  assert.notEqual(sourcePriorityBand(listing, "suzano.com.br"), "official_report");
  const ranked = rankSourcesForInitialPass([listing, article], "suzano.com.br");
  assert.equal(ranked[0]?.url, article.url);
});

test("initial pass keeps extras as deferred candidates", () => {
  const accepted = [
    source({ url: "https://www.suzano.com.br/investors", sourceType: "official_page", title: "IR" }),
    source({
      url: "https://www.suzano.com.br/press-releases/a",
      sourceType: "press_release",
      title: "Release A",
    }),
    source({
      url: "https://www.suzano.com.br/press-releases/b",
      sourceType: "press_release",
      title: "Release B",
    }),
    source({
      url: "https://www.reuters.com/markets/suzano",
      sourceType: "news",
      sourceTier: 2,
      title: "Reuters",
    }),
  ].filter((row) => row.accepted);

  const { initial, deferred } = splitInitialAndDeferred(accepted, "suzano.com.br", 3);
  assert.equal(initial.length, 3);
  assert.equal(deferred.length, accepted.length - 3);
  assert.ok(initial.every((row) => row.accepted));
  assert.ok(!initial.some((row) => /reuters/i.test(row.url)) || deferred.length >= 0);
});
