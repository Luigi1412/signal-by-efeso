import assert from "node:assert/strict";
import test from "node:test";
import { officialLinksFromHtml } from "./official-links";
import { extractPublicationDate } from "./html";
import { publisherAuthorityClass } from "./aggregators";
import { classifySource } from "./tavily-map";
import { snapshotFreshnessCutoff } from "./config";

test("official navigation establishes a linked IR host without trusting unrelated anchors",()=>{
  const result=officialLinksFromHtml('<a href="https://ir.example-ir.com/">Investor Relations</a><a href="https://imposter.example/annual-report.pdf">Annual report</a><a href="/reports/annual-report.pdf">Annual report</a>',"https://company.example/","company.example","Company");
  assert.ok(result.domains.includes("ir.example-ir.com"));
  assert.equal(result.sources.some(s=>s.url.includes("imposter")),false);
  assert.equal(result.sources.find(s=>s.url.endsWith("annual-report.pdf"))?.sourceType,"annual_report");
});
test("publisher dates are explicit, valid dates rather than URL years or capture time",()=>{
  assert.equal(extractPublicationDate('<meta property="article:published_time" content="2026-04-21T10:00:00Z">'),"2026-04-21");
  assert.equal(extractPublicationDate('{"datePublished":"2026-02-30"}'),null);
  assert.equal(extractPublicationDate('<a href="/2026/report">Annual report</a>'),null);
});
test("publisher authority uses hostname boundaries and PDF title semantics",()=>{
  assert.equal(publisherAuthorityClass("https://valor.globo.com/article"),"reputable_news");
  assert.equal(publisherAuthorityClass("https://reuters.com.attacker.example/article"),"unknown");
  assert.equal(publisherAuthorityClass("https://sec.gov.attacker.example/10-k"),"unknown");
  assert.equal(classifySource("https://company.example/sustainability.pdf","Sustainability report","company.example").sourceType,"sustainability_report");
});
test("snapshots have a bounded TTL and zero explicitly disables cache reuse",()=>{
  const previous=process.env.RESEARCH_SNAPSHOT_TTL_HOURS;
  const now=Date.parse("2026-10-21T12:00:00Z");
  try {
    delete process.env.RESEARCH_SNAPSHOT_TTL_HOURS;
    assert.equal(snapshotFreshnessCutoff(now),"2026-10-21T00:00:00.000Z");
    process.env.RESEARCH_SNAPSHOT_TTL_HOURS="0";
    assert.equal(snapshotFreshnessCutoff(now),"2026-10-21T12:00:00.000Z");
    process.env.RESEARCH_SNAPSHOT_TTL_HOURS="-1";
    assert.equal(snapshotFreshnessCutoff(now),"2026-10-21T12:00:00.000Z");
    process.env.RESEARCH_SNAPSHOT_TTL_HOURS="invalid";
    assert.equal(snapshotFreshnessCutoff(now),"2026-10-21T00:00:00.000Z");
  } finally {if(previous===undefined)delete process.env.RESEARCH_SNAPSHOT_TTL_HOURS;else process.env.RESEARCH_SNAPSHOT_TTL_HOURS=previous;}
});
