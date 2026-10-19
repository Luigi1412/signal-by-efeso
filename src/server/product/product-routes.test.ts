import assert from "node:assert/strict";
import test from "node:test";
import { routes } from "@/lib/routes";

test("member product routes point to simplified surface", () => {
  assert.equal(routes.companies, "/companies");
  assert.equal(routes.researchNew, "/research/new");
  assert.equal(routes.newAnalysis, "/research/new");
  assert.equal(routes.account, "/account");
  assert.equal(routes.company("klabin"), "/companies/klabin");
});

test("legacy research entrypoints stay addressable", () => {
  assert.match(routes.research("00000000-0000-0000-0000-000000000001"), /^\/research\//);
});
