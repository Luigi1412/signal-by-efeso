import { DEFAULT_MAX_EXTRACTION_PAGES, PDF_PARSER_NAME, PDF_PARSER_VERSION } from "./constants";
import type { ContentBlockType, DocumentParser, ParseOutcome, ParsedContentBlock } from "./types";

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_CHARS_PER_PAGE = 8;
const MIN_DOC_CHARS = 24;

function classifyBlock(text: string, y: number, pageHeight: number): ContentBlockType {
  const trimmed = text.trim();
  if (!trimmed) return "other";
  if (y > pageHeight - 50 && trimmed.length <= 120) return "header";
  if (y < 50 && trimmed.length <= 120) return "footer";
  if (/^#{1,6}\s+\S/.test(trimmed) || (trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed))) {
    return "heading";
  }
  if (/^\s*(?:[-*•]|\d+[.)])\s+\S/.test(trimmed)) return "list";
  return "paragraph";
}

export class PdfJsParser implements DocumentParser {
  readonly parserName = PDF_PARSER_NAME;
  readonly parserVersion = PDF_PARSER_VERSION;

  supports(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }

  async parse(buffer: Uint8Array, metadata: { mimeType: string; fileName: string }): Promise<ParseOutcome> {
    if (!this.supports(metadata.mimeType)) {
      return { ok: false, code: "UNSUPPORTED_TYPE", message: "PDF parser accepts application/pdf only." };
    }

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = Buffer.isBuffer(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : buffer instanceof Uint8Array
          ? buffer
          : new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({
        data,
        disableFontFace: true,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      const envPages = Number(process.env.CONTROLLED_EXTRACTION_MAX_PAGES);
      const maxPages =
        Number.isFinite(envPages) && envPages > 0 ? envPages : DEFAULT_MAX_EXTRACTION_PAGES;
      if (doc.numPages > maxPages) {
        return {
          ok: false,
          code: "TOO_MANY_PAGES",
          message: `PDF exceeds the ${maxPages}-page controlled extraction limit.`,
        };
      }

      const blocks: ParsedContentBlock[] = [];
      let totalChars = 0;
      let pagesWithText = 0;
      let sectionTitle: string | null = null;

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const items: TextItem[] = [];

        for (const item of textContent.items) {
          if (!("str" in item)) continue;
          const str = String(item.str ?? "");
          if (!str.trim()) continue;
          const transform = "transform" in item ? (item.transform as number[]) : [1, 0, 0, 1, 0, 0];
          items.push({
            str,
            x: transform[4] ?? 0,
            y: transform[5] ?? 0,
            width: "width" in item ? Number(item.width) || 0 : 0,
            height: "height" in item ? Number(item.height) || 0 : 0,
          });
        }

        const pageText = items.map((item) => item.str).join("").replace(/\s+/g, "");
        if (pageText.length >= MIN_CHARS_PER_PAGE) pagesWithText += 1;
        totalChars += pageText.length;

        const lines = groupItemsIntoLines(items);
        const pageBlocks = groupLinesIntoBlocks(lines, viewport.height);

        for (const block of pageBlocks) {
          const textContentBlock = block.text.trim();
          if (!textContentBlock) continue;
          const blockType = classifyBlock(textContentBlock, block.y, viewport.height);
          if (blockType === "heading") sectionTitle = textContentBlock.replace(/^#{1,6}\s+/, "");
          blocks.push({
            blockIndex: blocks.length,
            blockType,
            textContent: textContentBlock,
            pageNumber,
            sectionTitle,
            locator: {
              page: pageNumber,
              y: block.y,
              x: block.x,
              itemCount: block.itemCount,
            },
            parseConfidence: 80,
            metadata: { pageHeight: viewport.height },
          });
        }
      }

      if (totalChars < MIN_DOC_CHARS || pagesWithText === 0) {
        return {
          ok: false,
          code: "UNSUPPORTED_NEEDS_OCR",
          message: "This PDF has no meaningful text layer. OCR is not implemented.",
        };
      }

      return {
        ok: true,
        parserName: this.parserName,
        parserVersion: this.parserVersion,
        mimeType: metadata.mimeType,
        pageCount: doc.numPages,
        blocks,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF parse failed.";
      return { ok: false, code: "PARSE_ERROR", message };
    }
  }
}

function groupItemsIntoLines(items: TextItem[]): { text: string; x: number; y: number; itemCount: number }[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { text: string; x: number; y: number; itemCount: number }[] = [];
  const yTolerance = 3;

  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= yTolerance) {
      last.text = `${last.text}${item.str}`;
      last.itemCount += 1;
      last.x = Math.min(last.x, item.x);
    } else {
      lines.push({ text: item.str, x: item.x, y: item.y, itemCount: 1 });
    }
  }
  return lines;
}

function groupLinesIntoBlocks(
  lines: { text: string; x: number; y: number; itemCount: number }[],
  pageHeight: number,
): { text: string; x: number; y: number; itemCount: number }[] {
  const blocks: { text: string; x: number; y: number; itemCount: number }[] = [];
  const gap = Math.max(14, pageHeight * 0.018);

  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    if (last && last.y - line.y <= gap && last.y - line.y >= 0) {
      last.text = `${last.text}\n${line.text}`;
      last.itemCount += line.itemCount;
    } else {
      blocks.push({ ...line });
    }
  }
  return blocks;
}
