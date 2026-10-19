import { DEFAULT_MAX_EXTRACTION_BYTES } from "./constants";
import { PdfJsParser } from "./pdfjs-parser";
import { PlainTextParser } from "./plain-text-parser";
import type { DocumentParser, ParseOutcome } from "./types";

const parsers: DocumentParser[] = [new PlainTextParser(), new PdfJsParser()];

export function resolveParser(mimeType: string): DocumentParser | null {
  return parsers.find((parser) => parser.supports(mimeType)) ?? null;
}

export async function parseControlledDocument(
  buffer: Uint8Array,
  metadata: { mimeType: string; fileName: string },
): Promise<ParseOutcome> {
  const envBytes = Number(process.env.CONTROLLED_EXTRACTION_MAX_BYTES);
  const maxBytes = Number.isFinite(envBytes) && envBytes > 0 ? envBytes : DEFAULT_MAX_EXTRACTION_BYTES;
  if (buffer.byteLength > maxBytes) {
    return {
      ok: false,
      code: "DOCUMENT_TOO_LARGE",
      message: `Document exceeds the ${maxBytes}-byte controlled extraction limit.`,
    };
  }
  const parser = resolveParser(metadata.mimeType);
  if (!parser) {
    return { ok: false, code: "UNSUPPORTED_TYPE", message: `No parser for ${metadata.mimeType}.` };
  }
  return parser.parse(buffer, metadata);
}

export { PlainTextParser } from "./plain-text-parser";
export { PdfJsParser } from "./pdfjs-parser";
export type { DocumentParser, ParseOutcome, ParsedContentBlock } from "./types";
