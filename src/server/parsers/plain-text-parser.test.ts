import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createHash } from "node:crypto";
import { PlainTextParser } from "./plain-text-parser";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../tests/fixtures/synthetic-good.txt"),
);

test("plain-text parser is deterministic, ordered, and skips empty blocks", async () => {
  const parser = new PlainTextParser();
  const first = await parser.parse(fixture, { mimeType: "text/plain", fileName: "synthetic-good.txt" });
  const second = await parser.parse(fixture, { mimeType: "text/plain", fileName: "synthetic-good.txt" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.deepEqual(
    first.blocks.map((block) => block.textContent),
    second.blocks.map((block) => block.textContent),
  );
  first.blocks.forEach((block, index) => {
    assert.equal(block.blockIndex, index);
    assert.ok(block.textContent.trim().length > 0);
    const hash = createHash("sha256").update(block.textContent, "utf8").digest("hex");
    assert.equal(hash.length, 64);
  });
  assert.ok(first.blocks.some((block) => block.textContent.includes("Brazilian manufacturing")));
});
