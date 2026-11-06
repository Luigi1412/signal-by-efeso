import assert from "node:assert/strict";
import test from "node:test";
import { coalesceSparseBlocks, getFastPassWindowOptions, selectFastPassBlocks } from "./fast-window";
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

test("ollama coverage is bounded to one short window", () => {
  const options = getFastPassWindowOptions("ollama");
  assert.equal(options.maxWindows, 1);
  assert.ok(options.maxTotalChars <= 2200);
});

test("coalesceSparseBlocks joins smashed PDF table fragments", () => {
  const blocks = [
    block(0, "paragraph", "TOTAL"),
    block(1, "paragraph", "REVENUE"),
    block(2, "paragraph", "14,024"),
    block(3, "paragraph", "13,290"),
    block(4, "paragraph", "7.3%"),
    block(5, "paragraph", "Long narrative about strategy that already exceeds the short-piece threshold and should stay alone."),
  ];
  const coalesced = coalesceSparseBlocks(blocks);
  assert.ok(coalesced.some((item) => /TOTAL REVENUE 14,024/.test(item.textContent)));
  const selected = selectFastPassBlocks(blocks, { maxWindows: 1, maxCharsPerWindow: 800, maxTotalChars: 800 });
  assert.ok(selected.some((item) => /REVENUE/i.test(item.textContent) && /\d/.test(item.textContent)));
});
