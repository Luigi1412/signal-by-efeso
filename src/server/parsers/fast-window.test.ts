import assert from "node:assert/strict";
import test from "node:test";
import { getFastPassWindowOptions, selectFastPassBlocks } from "./fast-window";
import type { ParsedContentBlock } from "./types";

function block(index: number, type: ParsedContentBlock["blockType"], text: string): ParsedContentBlock {
  return {
    blockIndex: index,
    blockType: type,
    textContent: text,
    pageNumber: 1,
    sectionTitle: null,
    locator: {},
    parseConfidence: 100,
    metadata: {},
  };
}

test("fast pass prefers numeric/financial blocks and keeps full quotes", () => {
  const quote = "A Suzano anunciou capex de R$ 1,2 bilhão para expandir a capacidade de celulose em 2026.";
  const blocks = [
    block(0, "header", "Suzano IR header"),
    block(1, "paragraph", "Welcome to our website. Learn more about our history and values."),
    block(2, "paragraph", quote),
    block(3, "paragraph", "Cookie policy and legal notices for this website."),
    block(4, "footer", "Page 1"),
  ];
  const selected = selectFastPassBlocks(blocks, { maxWindows: 1, maxCharsPerWindow: 800, maxTotalChars: 800 });
  assert.ok(selected.some((item) => item.textContent === quote));
  assert.ok(selected.every((item) => item.blockType !== "header" && item.blockType !== "footer"));
  const kept = selected.find((item) => item.textContent === quote);
  assert.equal(kept?.textContent, quote);
});

test("ollama fast pass uses a single short window", () => {
  const options = getFastPassWindowOptions("ollama");
  assert.equal(options.maxWindows, 1);
  assert.ok(options.maxTotalChars <= 4000);
});
