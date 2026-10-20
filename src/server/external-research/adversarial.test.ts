import assert from "node:assert/strict";
import test from "node:test";
import { detectPotentialClaimConflicts } from "./conflicts";
import { dedupeSources } from "./dedup";
import { discoverCompanySources, selectAcceptedSources } from "./discover";
import { FakeExternalResearchProvider } from "./fake-provider";
import { sanitizePublicResearchQuery } from "./privacy";
import { generateResearchQueries } from "./queries";
import { assessSource } from "./quality";

test("impostor IR domain is not treated as official", () => {
  const assessed = assessSource(
    {
      url: "https://company-investor-relations.fake.com/suzano",
      title: "Suzano IR impostor",
      publisher: "Fake IR",
      sourceType: "official_page",
      sourceTier: 1,
      publishedAt: "2026-04-12",
    },
    "suzano.com.br",
  );
  assert.equal(assessed.accepted, false);
  assert.equal(assessed.sourceQuality, "weak");
});

test("duplicate mirrored press release is deduplicated", () => {
  const official = assessSource(
    {
      url: "https://www.suzano.com.br/press-releases/expansion",
      title: "Suzano announces capacity expansion",
      publisher: "Suzano S.A.",
      sourceType: "press_release",
      sourceTier: 1,
      publishedAt: "2026-04-12",
    },
    "suzano.com.br",
  );
  const mirror = assessSource(
    {
      url: "https://www.suzano.com.br/press-releases/expansion?utm_source=mirror",
      title: "Suzano announces capacity expansion",
      publisher: "Mirror Wire",
      sourceType: "press_release",
      sourceTier: 3,
      publishedAt: "2026-04-12",
      canonicalUrl: "https://www.suzano.com.br/press-releases/expansion",
    },
    "suzano.com.br",
  );
  const deduped = dedupeSources([official, mirror]);
  assert.equal(deduped.length, 1);
});

test("old news outside the horizon is not auto-accepted", () => {
  const assessed = assessSource(
    {
      url: "https://www.reuters.com/suzano-old",
      title: "Old article",
      publisher: "Reuters",
      sourceType: "news",
      sourceTier: 3,
      publishedAt: "2018-01-01",
    },
    "suzano.com.br",
    new Date("2026-10-16"),
  );
  assert.equal(assessed.accepted, false);
  assert.equal(assessed.rejectionReason, "outside_horizon");
});

test("random blog contradicting official release stays weak", () => {
  const assessed = assessSource(
    {
      url: "https://random-blog.example/suzano-is-failing",
      title: "Blog contradicts official release",
      publisher: "Random Blog",
      sourceType: "other",
      sourceTier: 4,
      publishedAt: "2026-04-13",
    },
    "suzano.com.br",
  );
  assert.equal(assessed.sourceQuality, "weak");
  assert.equal(assessed.accepted, false);
});

test("query generation stays bounded", () => {
  const queries = generateResearchQueries({ companyName: "Suzano S.A.", officialDomain: "suzano.com.br", country: "BR" });
  assert.ok(queries.length <= 12);
  assert.ok(queries.some((row) => row.site === "suzano.com.br"));
  assert.ok(queries.some((row) => /investimento|expansão|aquisição|earnings|resultados/i.test(row.query)));
  assert.ok(queries.every((row) => row.query.includes('"Suzano S.A."') || Boolean(row.site)));
});

test("ecommerce and off-topic sources are rejected", () => {
  const product = assessSource(
    {
      url: "https://loja.suvinil.com.br/produto/tinta-acrilica",
      title: "Tinta Acrílica Suvinil",
      publisher: "Suvinil",
      sourceType: "official_page",
      sourceTier: 1,
      publishedAt: "2026-04-01",
    },
    "suvinil.com.br",
    new Date("2026-10-16"),
    "Suvinil",
  );
  assert.equal(product.accepted, false);
  assert.equal(product.rejectionReason, "ecommerce_noise");

  const youtube = assessSource(
    {
      url: "https://www.youtube.com/watch?v=abc",
      title: "Suvinil comercial",
      publisher: "YouTube",
      sourceType: "other",
      sourceTier: 3,
      publishedAt: "2026-04-01",
    },
    "suvinil.com.br",
    new Date("2026-10-16"),
    "Suvinil",
  );
  assert.equal(youtube.accepted, false);
  assert.equal(youtube.rejectionReason, "social_media");

  const offTopic = assessSource(
    {
      url: "https://www.rad.cvm.gov.br/ENET/frmExibirArquivoIPEExterno.aspx?NumeroProtocoloEntrega=123",
      title: "Azul S.A. fato relevante",
      publisher: "CVM",
      sourceType: "filing",
      sourceTier: 2,
      publishedAt: "2026-04-01",
    },
    "suvinil.com.br",
    new Date("2026-10-16"),
    "Suvinil",
  );
  assert.equal(offTopic.accepted, false);
  assert.equal(offTopic.rejectionReason, "off_topic_company");

  const namedNews = assessSource(
    {
      url: "https://finance.yahoo.com/news/sherwin-williams-suvinil-deal",
      title: "Sherwin-Williams completes Suvinil acquisition",
      publisher: "Yahoo Finance",
      sourceType: "news",
      sourceTier: 2,
      publishedAt: "2026-04-01",
    },
    "suvinil.com.br",
    new Date("2026-10-16"),
    "Suvinil",
  );
  assert.equal(namedNews.accepted, true);
});

test("fake discovery accepts official sources and rejects impostors", async () => {
  const { assessed } = await discoverCompanySources({
    companyName: "Suzano",
    officialDomain: "suzano.com.br",
    provider: new FakeExternalResearchProvider(),
  });
  const accepted = selectAcceptedSources(assessed);
  assert.ok(accepted.some((row) => row.url.includes("suzano.com.br")));
  assert.ok(!accepted.some((row) => row.url.includes("company-investor-relations.fake.com")));
  assert.ok(!accepted.some((row) => row.url.includes("random-blog")));
});

test("incompatible metrics on the same period are marked as potential conflicts", () => {
  const conflicts = detectPotentialClaimConflicts([
    { id: "a", metricName: "capex", numericValue: 10, periodStart: "2026-01-01", periodEnd: "2026-12-31", asOfDate: null },
    { id: "b", metricName: "capex", numericValue: 40, periodStart: "2026-01-01", periodEnd: "2026-12-31", asOfDate: null },
  ]);
  assert.equal(conflicts.length, 1);
});

test("research input never forwards emails or relationship notes", () => {
  const cleaned = sanitizePublicResearchQuery("Suzano owner@efeso.com relacionamento interno");
  assert.equal(cleaned.toLowerCase().includes("efeso.com"), false);
  assert.match(cleaned, /Suzano/i);
});
