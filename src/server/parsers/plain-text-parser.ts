import { TXT_PARSER_NAME, TXT_PARSER_VERSION } from "./constants";
import type { ContentBlockType, DocumentParser, ParseOutcome, ParsedContentBlock } from "./types";

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  if (trimmed.length <= 80 && /:$/.test(trimmed)) return true;
  if (trimmed.length <= 72 && trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÃÕ]/.test(trimmed)) return true;
  return false;
}

function isListItem(line: string): boolean {
  return /^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line);
}

export class PlainTextParser implements DocumentParser {
  readonly parserName = TXT_PARSER_NAME;
  readonly parserVersion = TXT_PARSER_VERSION;

  supports(mimeType: string): boolean {
    return mimeType === "text/plain";
  }

  async parse(buffer: Uint8Array, metadata: { mimeType: string; fileName: string }): Promise<ParseOutcome> {
    if (!this.supports(metadata.mimeType)) {
      return { ok: false, code: "UNSUPPORTED_TYPE", message: "Plain-text parser accepts text/plain only." };
    }

    const text = Buffer.from(buffer).toString("utf8").replace(/\r\n/g, "\n");
    const chunks = text.split(/\n{2,}/);
    const blocks: ParsedContentBlock[] = [];
    let sectionTitle: string | null = null;

    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n").map((line) => line.trimEnd());
      const first = lines[0]?.trim() ?? "";
      let blockType: ContentBlockType = "paragraph";
      if (lines.length === 1 && isHeading(first)) {
        blockType = "heading";
        sectionTitle = first.replace(/^#{1,6}\s+/, "");
      } else if (lines.every((line) => isListItem(line) || line.trim() === "")) {
        blockType = "list";
      }

      const textContent = lines.join("\n").trim();
      if (!textContent) continue;

      blocks.push({
        blockIndex: blocks.length,
        blockType,
        textContent,
        pageNumber: null,
        sectionTitle,
        locator: { kind: "plaintext", block: blocks.length },
        parseConfidence: 100,
        metadata: { lineCount: lines.length },
      });
    }

    return {
      ok: true,
      parserName: this.parserName,
      parserVersion: this.parserVersion,
      mimeType: metadata.mimeType,
      pageCount: null,
      blocks,
    };
  }
}
