import assert from "node:assert/strict";
import test from "node:test";
import { inferHeadquartersFromDomain, resolveCompanyEntity } from "./entity";

test("brand alias resolves to controlling group without adopting research geography as HQ", () => {
  const result = resolveCompanyEntity({
    query: "luxottica",
    country: "BR",
    selectedDomain: "essilorluxottica.com",
  });
  assert.equal(result.kind, "resolved");
  if (result.kind !== "resolved") return;
  assert.match(result.candidate.canonicalName, /EssilorLuxottica/i);
  assert.equal(result.candidate.officialDomain, "essilorluxottica.com");
  assert.equal(result.candidate.headquartersCountry, "FR");
  assert.notEqual(result.candidate.headquartersCountry, "BR");
});

test("research geography never silently selects a subsidiary", () => {
  const result = resolveCompanyEntity({query:"toyota",country:"BR"});
  assert.equal(result.kind,"ambiguous");
  if(result.kind!=="ambiguous") return;
  assert.deepEqual(new Set(result.candidates.map(c=>c.headquartersCountry)),new Set(["BR","JP"]));
});

test("Toyota without country stays ambiguous between group and local", () => {
  const result = resolveCompanyEntity({ query: "toyota" });
  assert.equal(result.kind, "ambiguous");
});

test("inferHeadquartersFromDomain never uses research scope", () => {
  assert.equal(inferHeadquartersFromDomain("klabin.com.br"), "BR");
  assert.equal(inferHeadquartersFromDomain("essilorluxottica.com"), "");
  assert.equal(inferHeadquartersFromDomain("weg.net"), "");
});
