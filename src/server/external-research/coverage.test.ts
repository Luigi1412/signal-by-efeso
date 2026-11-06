import assert from "node:assert/strict";
import test from "node:test";
import { assessResearchCoverage, coverageExpansionQueryHints } from "./coverage";
import { extractMovementLeads, movementLeadFollowUpQueries } from "./movement-leads";
import { officialSeedUrls, generateResearchQueries } from "./queries";
import { classifyDocumentClass } from "./document-classes";

test("Ambev-like secondary-only retention is research_coverage_insufficient when domain confirmed", () => {
  const assessment = assessResearchCoverage({
    officialDomain: "ambev.com.br",
    entityConfirmed: true,
    sources: [
      {
        url: "https://static.poder360.com.br/uploads/2026/10/Ambev-balanco-3o-trimestre.pdf",
        title: "Total Volume (organic) Net Revenue",
        sourceQuality: "secondary",
        status: "fetched",
        textLen: 75000,
      },
      {
        url: "https://neofeed.com.br/negocios/heineken-ambev",
        title: "Heineken sai na frente da Ambev",
        sourceQuality: "secondary",
        status: "fetched",
        textLen: 9000,
      },
      {
        url: "https://ri.ambev.com.br/",
        title: "Ambev — Investor Relations",
        sourceQuality: "primary",
        status: "failed",
        textLen: 0,
      },
      {
        url: "https://www.h2foz.com.br/govpr/ambev-nova-fabrica-parana",
        title: "Ambev investirá R$ 70 milhões em nova fábrica no Paraná",
        sourceQuality: "secondary",
        status: "rejected",
        textLen: 21,
        rejectionReason: "thin_content",
      },
    ],
    expansionWavesUsed: 0,
  });
  assert.equal(assessment.verdict, "research_coverage_insufficient");
  assert.equal(assessment.shouldExpand, true);
  assert.ok(assessment.expansionReasons.includes("confirmed_domain_without_dense_official"));
  assert.equal(assessment.denseOfficialCount, 0);
});

test("dense official financial corpus is adequate coverage", () => {
  const assessment = assessResearchCoverage({
    officialDomain: "example.com",
    entityConfirmed: true,
    sources: [
      {
        url: "https://www.example.com/api/report.pdf",
        title: "Interim Financial Report 2025",
        sourceType: "earnings_release",
        sourceQuality: "primary",
        status: "fetched",
        textLen: 120_000,
      },
    ],
  });
  assert.equal(assessment.verdict, "adequate");
  assert.equal(assessment.shouldExpand, false);
});

test("BR official seeds prefer ri. host and include investors paths", () => {
  const seeds = officialSeedUrls("ambev.com.br");
  assert.ok(seeds.some((url) => url.includes("ri.ambev.com.br")));
  assert.ok(seeds.some((url) => url.includes("/investors") || url.includes("/investidores")));
  assert.ok(seeds.findIndex((url) => url.includes("ri.ambev.com.br")) < seeds.findIndex((url) => url.includes("/investors")));
});

test("directed queries prioritize official/financial classes before press", () => {
  const queries = generateResearchQueries({
    companyName: "Example Co",
    officialDomain: "example.com.br",
    country: "BR",
    maxQueries: 14,
  });
  assert.ok(queries.some((q) => q.documentClass === "financial_results" && q.site === "example.com.br"));
  assert.ok(queries.some((q) => q.documentClass === "investor_relations"));
  assert.ok(queries.some((q) => q.site === "ri.example.com.br"));
  const firstPress = queries.findIndex((q) => q.documentClass === "news_secondary");
  const firstFinancial = queries.findIndex((q) => q.documentClass === "financial_results");
  assert.ok(firstFinancial >= 0 && firstPress > firstFinancial);
});

test("factory CAPEX headline becomes movement lead with follow-up queries", () => {
  const leads = extractMovementLeads(
    [
      {
        url: "https://www.h2foz.com.br/govpr/ambev-nova-fabrica-parana",
        title: "Ambev investirá R$ 70 milhões em nova fábrica no Paraná",
        sourceQuality: "secondary",
        status: "rejected",
      },
    ],
    "Ambev",
  );
  assert.equal(leads.length, 1);
  assert.equal(leads[0]?.theme, "capex_expansion");
  assert.equal(leads[0]?.locationHint, "Paraná");
  assert.ok(leads[0]?.valueHint?.includes("70"));
  const followUps = movementLeadFollowUpQueries(leads[0]!, "Ambev", "ambev.com.br");
  assert.ok(followUps.some((q) => q.site === "ambev.com.br"));
  assert.ok(followUps.some((q) => /f[aá]brica|CapEx|investimento/i.test(q.query)));
});

test("coverage expansion hints request official PDFs for financial gap", () => {
  const assessment = assessResearchCoverage({
    officialDomain: "example.com.br",
    entityConfirmed: true,
    sources: [
      {
        url: "https://news.example/x",
        title: "Example news",
        sourceQuality: "secondary",
        status: "fetched",
        textLen: 5000,
      },
    ],
  });
  const hints = coverageExpansionQueryHints({
    companyName: "Example",
    officialDomain: "example.com.br",
    country: "BR",
    assessment,
  });
  assert.ok(hints.some((h) => h.site === "example.com.br" && /filetype:pdf/i.test(h.query)));
  assert.ok(hints.some((h) => h.site === "ri.example.com.br"));
});

test("document class maps earnings and IR generically", () => {
  assert.equal(
    classifyDocumentClass({
      url: "https://ri.example.com.br/resultados",
      title: "Resultados 3T26",
      sourceType: "earnings_release",
    }),
    "financial_results",
  );
  assert.equal(
    classifyDocumentClass({
      url: "https://ir.example.com/",
      title: "Investor Relations",
      sourceType: "official_page",
    }),
    "investor_relations",
  );
});
