import assert from "node:assert/strict";
import test from "node:test";
import { buildExtractionWindows } from "./windowing";
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

test("windowing skips headers/footers but keeps them out of windows only", () => {
  const blocks = [
    block(0, "header", "Confidential header"),
    block(1, "paragraph", "Body one ".repeat(20)),
    block(2, "paragraph", "Body two ".repeat(20)),
    block(3, "footer", "Page 1"),
  ];
  const windows = buildExtractionWindows(blocks, { maxChars: 80, overlapBlocks: 1 });
  assert.ok(windows.length >= 1);
  for (const window of windows) {
    assert.ok(window.blocks.every((item) => item.blockType !== "header" && item.blockType !== "footer"));
  }
});
