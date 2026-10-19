import assert from "node:assert/strict";
import test from "node:test";
import { detectControlledUpload } from "./upload";
import { buildTextPdf } from "../../../tests/helpers/pdf-bytes";

test("detects txt and pdf from magic/extension and rejects other types", () => {
  const txt = detectControlledUpload({
    fileName: "note.txt",
    bytes: Buffer.from("hello\n", "utf8"),
    declaredMime: "application/octet-stream",
  });
  assert.equal(txt.ok, true);
  if (txt.ok) assert.equal(txt.mimeType, "text/plain");

  const pdf = detectControlledUpload({
    fileName: "note.pdf",
    bytes: buildTextPdf("hello"),
    declaredMime: "application/pdf",
  });
  assert.equal(pdf.ok, true);

  const docx = detectControlledUpload({
    fileName: "note.docx",
    bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
  });
  assert.equal(docx.ok, false);

  const exe = detectControlledUpload({
    fileName: "note.exe",
    bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
  });
  assert.equal(exe.ok, false);
});
