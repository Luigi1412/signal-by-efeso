import assert from "node:assert/strict";
import test from "node:test";
import { isAggregatorHost } from "./aggregators";
import { classifySource } from "./tavily-map";

test("CompaniesMarketCap is aggregator, not earnings_release", () => {
  const classified = classifySource(
    "https://companiesmarketcap.com/essilor-luxottica/earnings",
    "EssilorLuxottica (EL.PA) - Earnings",
    "essilorluxottica.com",
  );
  assert.equal(classified.sourceType, "other");
  assert.ok(classified.sourceTier >= 3);
  assert.equal(isAggregatorHost("companiesmarketcap.com"), true);
});

test("official earnings path stays earnings_release", () => {
  const classified = classifySource(
    "https://www.essilorluxottica.com/en/newsroom/press-releases/q4-full-year-2025-results",
    "Q4/Full Year 2025 Results",
    "essilorluxottica.com",
  );
  assert.equal(classified.sourceType, "earnings_release");
  assert.equal(classified.sourceTier, 1);
});

test("Tracxn acquisitions page is not official", () => {
  const classified = classifySource(
    "https://tracxn.com/d/acquisitions/acquisitions-by-essilorluxottica",
    "List of Acquisitions by EssilorLuxottica",
    "essilorluxottica.com",
  );
  assert.equal(classified.sourceType, "other");
  assert.equal(isAggregatorHost("tracxn.com"), true);
});
