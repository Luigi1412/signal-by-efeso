import assert from "node:assert/strict";
import test from "node:test";
import { isNumericClaimPrecise } from "./claim-precision";
import { assessEvidence } from "./evidence-quality";
import { evaluateResearchQualityGate } from "./research-quality-gate";
import { buildResearchLimitations } from "./research-limitations";
import { dedupeEquivalentDocuments } from "@/server/external-research/dedup";
import { rankSourcesForInitialPass, urlSubstanceScore } from "@/server/external-research/priority";
import { assessSource } from "@/server/external-research/quality";
import { isLowYieldNormalizedText } from "@/server/external-research/thin-source";

const DOMAIN = "essilorluxottica.com";
const COMPANY = "EssilorLuxottica";

/**
 * Deterministic regression for run ca31fdc5 (EssilorLuxottica BR) captured artifacts —
 * no Tavily/Ollama. Asserts classification, precision, and report consistency fixes.
 */
test("Essilor captured claim becomes precise with currency_code; report keeps retained primaries", () => {
  assert.equal(
    isNumericClaimPrecise({
      numericValue: 7_486_000_000,
      metricName: "revenue",
      unit: null,
      currencyCode: "EUR",
    }),
    true,
  );

  const evidence = assessEvidence({
    claims: [
      {
        id: "ce7a8d36-1c63-4fc5-a5a4-460a790af326",
        statement: "EssilorLuxottica's revenue grew by 9.0% in Q3 2026.",
        category: "financial",
        metric: "revenue",
        numericValue: 7_486_000_000,
        unit: null,
        currency: "EUR",
        date: "2026-09-30",
        precise: true,
        sources: [
          {
            id: "globe",
            url: "https://www.globenewswire.com/news-release/2026/10/23/3387124/0/fr/x",
            primary: false,
            authoritative: false,
            publishedAt: "2026-10-23",
          },
        ],
        excerpts: ["revenue grew by 9.0%"],
      },
    ],
    signals: [],
    horizonMonths: 24,
    asOf: new Date("2026-10-28"),
  });

  assert.equal(evidence.activeClaimCount, 1);
  assert.equal(evidence.primarySourceCount, 0);
  assert.equal(evidence.recentMaterialClaimCount, 0);

  const gate = evaluateResearchQualityGate({
    ...evidence,
    signalCount: 0,
    entityConfirmed: true,
    runStatus: "completed",
    insufficientEvidenceForSignal: true,
  });
  assert.equal(gate.researchOutcome, "insufficient_evidence");
  assert.ok(gate.reasons.includes("no_cited_primary_source"));

  const retainedPrimary = 4;
  const limitations = buildResearchLimitations({
    outcome: gate.researchOutcome,
    outcomeBody: "Evidência insuficiente",
    sourceCount: 6,
    primarySourceCount: retainedPrimary,
    citedPrimarySourceCount: evidence.primarySourceCount,
    noSupportedOpportunity: true,
    opportunityCount: 0,
    validatedFactCount: evidence.activeClaimCount,
  });
  assert.equal(limitations.some((item) => item.id === "no-primary"), false);
  assert.equal(limitations.some((item) => item.id === "no-cited-primary"), true);
});

test("Essilor retained set ranks Interim above compensation and filing notice; dedupes compensation", () => {
  const rows = [
    assessSource(
      {
        url: "https://www.essilorluxottica.com/cap/content/284372?_iframe=true",
        title: "2025 Universal Registration Document filed",
        publisher: "EssilorLuxottica",
        sourceType: "official_page",
        sourceTier: 1,
        publishedAt: "2026-03-06",
      },
      DOMAIN,
    ),
    assessSource(
      {
        url: "https://www.essilorluxottica.com/api/getCapContent?id=281506&download=false",
        title: "Executive Corporate Officers' compensation",
        publisher: "EssilorLuxottica",
        sourceType: "official_page",
        sourceTier: 1,
        publishedAt: "2025-12-22",
      },
      DOMAIN,
    ),
    assessSource(
      {
        url: "https://www.essilorluxottica.com/api/getCapContent?id=259816&download=false",
        title: "Interim Financial Report 2025",
        publisher: "EssilorLuxottica",
        sourceType: "earnings_release",
        sourceTier: 1,
        publishedAt: "2025-07-01",
      },
      DOMAIN,
    ),
    assessSource(
      {
        url: "https://www.essilorluxottica.com/api/getCapContent?id=246974&download=false",
        title: "Executive Corporate Officers' compensation",
        publisher: "EssilorLuxottica",
        sourceType: "official_page",
        sourceTier: 1,
        publishedAt: "2025-03-05",
      },
      DOMAIN,
    ),
  ];

  const interimScore = urlSubstanceScore(rows[2]!.url, rows[2]!.title, DOMAIN, COMPANY);
  const noticeScore = urlSubstanceScore(rows[0]!.url, rows[0]!.title, DOMAIN, COMPANY);
  const compScore = urlSubstanceScore(rows[1]!.url, rows[1]!.title, DOMAIN, COMPANY);
  assert.ok(interimScore > noticeScore);
  assert.ok(interimScore > compScore);

  const ranked = dedupeEquivalentDocuments(rankSourcesForInitialPass(rows, DOMAIN, COMPANY));
  assert.equal(ranked[0]?.title, "Interim Financial Report 2025");
  assert.equal(ranked.filter((row) => /compensation/i.test(row.title ?? "")).length, 1);

  const noticeText =
    "Paris, France (6 March 2026)–EssilorLuxottica announces the availability of its 2025 Universal Registration Document. ".repeat(
      30,
    );
  assert.equal(
    isLowYieldNormalizedText(noticeText, {
      url: rows[0]!.url,
      title: rows[0]!.title,
    }),
    true,
  );
});
