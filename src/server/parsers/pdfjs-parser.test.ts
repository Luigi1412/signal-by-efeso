import assert from "node:assert/strict";
import test from "node:test";
import { PdfJsParser } from "./pdfjs-parser";
import { buildEmptyPagePdf, buildTextPdf } from "../../../tests/helpers/pdf-bytes";

test("pdfjs parser extracts text, page numbers, locators, and stable order", async () => {
  const parser = new PdfJsParser();
  const bytes = buildTextPdf(
    "SYNTHETIC FIXTURE — NOT REAL NATURA INTELLIGENCE. The company announced an investment of R$500 million in its Brazilian manufacturing operation.",
  );
  const parsed = await parser.parse(bytes, { mimeType: "application/pdf", fileName: "synthetic-good.pdf" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.pageCount, 1);
  assert.ok(parsed.blocks.length > 0);
  parsed.blocks.forEach((block, index) => {
    assert.equal(block.blockIndex, index);
    assert.equal(block.pageNumber, 1);
    assert.ok(block.locator);
    assert.ok("page" in block.locator);
  });
  const joined = parsed.blocks.map((block) => block.textContent).join(" ");
  assert.match(joined, /500 million/);
  assert.match(joined, /Brazilian manufacturing/);
});

test("image-only PDF returns UNSUPPORTED_NEEDS_OCR and does not invent text", async () => {
  const parser = new PdfJsParser();
  const parsed = await parser.parse(buildEmptyPagePdf(), {
    mimeType: "application/pdf",
    fileName: "scanned.pdf",
  });
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.code, "UNSUPPORTED_NEEDS_OCR");
});
