import assert from "node:assert/strict";
import test from "node:test";
import { resolveCompanyEntity } from "./entity";

test("Vale resolves to the known Brazilian miner when context is safe", () => {
  const result = resolveCompanyEntity({ query: "Vale", country: "BR" });
  assert.equal(result.kind, "resolved");
  if (result.kind === "resolved") {
    assert.equal(result.candidate.officialDomain, "vale.com");
    assert.equal(result.candidate.headquartersCountry, "BR");
  }
});

test("Atlas is ambiguous across countries", () => {
  const result = resolveCompanyEntity({ query: "Atlas" });
  assert.equal(result.kind, "ambiguous");
  if (result.kind === "ambiguous") {
    assert.ok(result.candidates.length >= 2);
    assert.ok(result.candidates.some((row) => row.headquartersCountry === "SE"));
    assert.ok(result.candidates.some((row) => row.headquartersCountry === "US"));
  }
});

test("existing alias reuses the workspace company", () => {
  const result = resolveCompanyEntity({
    query: "Suzano",
    existing: [
      {
        id: "co-1",
        slug: "suzano",
        displayName: "Suzano Papel e Celulose",
        domain: "suzano.com.br",
        country: "BR",
        industry: "Celulose",
        aliases: ["suzano"],
      },
    ],
  });
  assert.equal(result.kind, "resolved");
  if (result.kind === "resolved") {
    assert.equal(result.candidate.existingCompanyId, "co-1");
  }
});

test("same name in two countries asks for resolution", () => {
  const result = resolveCompanyEntity({ query: "Mercury" });
  assert.equal(result.kind, "ambiguous");
});

test("typo suggests a candidate and does not auto-resolve", () => {
  const result = resolveCompanyEntity({ query: "Suznao" });
  assert.notEqual(result.kind, "resolved");
  if (result.kind === "unresolved") {
    assert.ok(result.suggestions.some((row) => row.officialDomain === "suzano.com.br"));
  }
});

test("Embraer resolves to the Brazilian aerospace company for entity resolution", () => {
  const result = resolveCompanyEntity({ query: "Embraer S.A.", country: "BR" });
  assert.equal(result.kind, "resolved");
  if (result.kind === "resolved") {
    assert.equal(result.candidate.officialDomain, "embraer.com");
    assert.equal(result.candidate.headquartersCountry, "BR");
    assert.match(result.candidate.industry, /aerospace/i);
  }
});

test("Toyota is ambiguous across Japan and Brazil", () => {
  const result = resolveCompanyEntity({ query: "Toyota" });
  assert.equal(result.kind, "ambiguous");
  if (result.kind === "ambiguous") {
    assert.ok(result.candidates.some((row) => row.officialDomain === "toyota-global.com"));
    assert.ok(result.candidates.some((row) => row.officialDomain === "toyota.com.br"));
  }
});

test("unknown company like Klabin does not silently resolve to a demo seed", () => {
  const result = resolveCompanyEntity({ query: "Klabin" });
  assert.notEqual(result.kind, "resolved");
  if (result.kind === "unresolved") {
    assert.ok(!result.suggestions.some((row) => /natura|vale/i.test(row.canonicalName)));
  }
  if (result.kind === "ambiguous") {
    assert.ok(!result.candidates.some((row) => /natura|vale/i.test(row.canonicalName)));
  }
});

test("unknown company WEG does not resolve to Natura or Vale", () => {
  const result = resolveCompanyEntity({ query: "WEG" });
  assert.notEqual(result.kind, "resolved");
  const pool =
    result.kind === "ambiguous" ? result.candidates : result.kind === "unresolved" ? result.suggestions : [];
  assert.ok(!pool.some((row) => /natura|vale|embraer/i.test(`${row.canonicalName} ${row.officialDomain}`)));
});
