import assert from "node:assert/strict";
import test from "node:test";
import { dedupeEquivalentDocuments } from "./dedup";
import { rankSourcesForInitialPass, sourcePriorityBand, urlSubstanceScore } from "./priority";
import { assessSource } from "./quality";
import {
  isCompensationDisclosure,
  isDenseFinancialReport,
  isFilingAvailabilityNotice,
  shouldHarvestOfficialPdfs,
} from "./source-substance";
import { isLowYieldNormalizedText } from "./thin-source";
import type { AssessedSource } from "./types";

const DOMAIN = "essilorluxottica.com";
const COMPANY = "EssilorLuxottica";

function assessed(
  url: string,
  title: string,
  sourceType: "official_page" | "earnings_release" | "news" = "official_page",
): AssessedSource {
  return assessSource(
    {
      url,
      title,
      publisher: "EssilorLuxottica",
      sourceType,
      sourceTier: 1,
      publishedAt: "2025-06-01",
      canonicalUrl: url,
    },
    DOMAIN,
  );
}

test("filing availability notice is not treated as a dense report", () => {
  const url = "https://www.essilorluxottica.com/cap/content/284372?_iframe=true";
  const title = "2025 Universal Registration Document filed";
  assert.equal(isFilingAvailabilityNotice(url, title), true);
  assert.equal(isDenseFinancialReport(url, title), false);
  assert.equal(shouldHarvestOfficialPdfs(2646, url, title), true);
});

test("interim financial report outranks compensation and filing notice", () => {
  const interim = assessed(
    "https://www.essilorluxottica.com/api/getCapContent?id=259816&download=false",
    "Interim Financial Report 2025",
    "earnings_release",
  );
  const notice = assessed(
    "https://www.essilorluxottica.com/cap/content/284372?_iframe=true",
    "2025 Universal Registration Document filed",
  );
  const compensation = assessed(
    "https://www.essilorluxottica.com/api/getCapContent?id=281506&download=false",
    "Executive Corporate Officers' compensation",
  );
  assert.equal(sourcePriorityBand(interim, DOMAIN), "official_report");
  assert.equal(sourcePriorityBand(notice, DOMAIN), "official_newsroom");
  assert.ok(
    urlSubstanceScore(interim.canonicalUrl || interim.url, interim.title, DOMAIN, COMPANY) >
      urlSubstanceScore(compensation.canonicalUrl || compensation.url, compensation.title, DOMAIN, COMPANY),
  );
  assert.ok(
    urlSubstanceScore(interim.canonicalUrl || interim.url, interim.title, DOMAIN, COMPANY) >
      urlSubstanceScore(notice.canonicalUrl || notice.url, notice.title, DOMAIN, COMPANY),
  );
  const ranked = rankSourcesForInitialPass([compensation, notice, interim], DOMAIN, COMPANY);
  assert.equal(ranked[0]?.url, interim.url);
});

test("equivalent compensation titles on the same host collapse after ranking", () => {
  const newer = assessed(
    "https://www.essilorluxottica.com/api/getCapContent?id=281506&download=false",
    "Executive Corporate Officers' compensation",
  );
  const older = assessed(
    "https://www.essilorluxottica.com/api/getCapContent?id=246974&download=false",
    "Executive Corporate Officers' compensation",
  );
  assert.equal(isCompensationDisclosure(newer.url, newer.title), true);
  const ranked = rankSourcesForInitialPass([older, newer], DOMAIN, COMPANY);
  const deduped = dedupeEquivalentDocuments(ranked);
  assert.equal(deduped.length, 1);
});

test("filing notice text with bare announces is low-yield", () => {
  const text = `Paris, France (6 March 2026)–EssilorLuxottica announces the availability of its 2025 Universal Registration Document. The Universal Registration Document includes the Annual Financial Statements. `.repeat(8);
  assert.equal(
    isLowYieldNormalizedText(text, {
      url: "https://www.essilorluxottica.com/cap/content/284372",
      title: "2025 Universal Registration Document filed",
    }),
    true,
  );
});
