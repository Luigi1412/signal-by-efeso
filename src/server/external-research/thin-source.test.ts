import assert from "node:assert/strict";
import test from "node:test";
import { isLowYieldNormalizedText, isThinNormalizedText } from "./thin-source";

test("news chrome and short pages are thin", () => {
  assert.equal(isThinNormalizedText("Stay up to date Latest News PT EN Suzano About Us People and Culture"), true);
  assert.equal(isThinNormalizedText("short"), true);
});

test("a long financial excerpt is not thin", () => {
  const body = `Resultados 2T26 EBITDA ajustado de R$ 5,4 bilhões, receita líquida de R$ 12,1 bilhões. `.repeat(40);
  assert.equal(isThinNormalizedText(body), false);
  assert.equal(isLowYieldNormalizedText(body), false);
});

test("long IR chrome without financial facts is low-yield", () => {
  const body = `Skip to main content Home The Company Corporate Governance Bylaws, Codes, Policies 2024 2025 `.repeat(80);
  assert.equal(isLowYieldNormalizedText(body), true);
});
