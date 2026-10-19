import assert from "node:assert/strict";
import test from "node:test";
import { locateExactQuote } from "./quote";

test("locateExactQuote finds a unique verbatim quote", () => {
  const location = locateExactQuote("Revenue reached R$ 13.3 billion this quarter.", "R$ 13.3 billion");
  assert.equal(location.found, true);
  assert.equal(location.ambiguous, false);
  assert.equal(location.charStart, 16);
});

test("locateExactQuote matches HTML numeric entities in stored source text", () => {
  const block = "As a result, Suzano&#x27;s adjusted EBITDA reached R$6.1 billion and cash totaled R$4.1 billion.";
  const location = locateExactQuote(block, "Suzano's adjusted EBITDA reached R$6.1 billion");
  assert.equal(location.found, true);
  assert.equal(location.ambiguous, false);
});

test("locateExactQuote allows a single trailing period the model added", () => {
  const block = "Net profit totaled R$5.0 billion positively impacted by FX.";
  const location = locateExactQuote(block, "Net profit totaled R$5.0 billion.");
  assert.equal(location.found, true);
  assert.equal(location.ambiguous, false);
});

test("locateExactQuote still rejects paraphrases", () => {
  const block = "As a result, Suzano&#x27;s adjusted EBITDA reached R$6.1 billion.";
  const location = locateExactQuote(block, "Adjusted EBITDA reached R$6.1 billion.");
  assert.equal(location.found, false);
});
