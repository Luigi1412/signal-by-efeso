export const CONTENT_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "table",
  "list",
  "caption",
  "header",
  "footer",
  "other",
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export interface ParsedContentBlock {
  blockIndex: number;
  blockType: ContentBlockType;
  textContent: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  locator: Record<string, unknown>;
  parseConfidence: number | null;
  metadata: Record<string, unknown>;
}

export type ParseFailureCode =
  | "UNSUPPORTED_NEEDS_OCR"
  | "DOCUMENT_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "UNSUPPORTED_TYPE"
  | "PARSE_ERROR";

export type ParseOutcome =
  | {
      ok: true;
      parserName: string;
      parserVersion: string;
      mimeType: string;
      pageCount: number | null;
      blocks: ParsedContentBlock[];
    }
  | {
      ok: false;
      code: ParseFailureCode;
      message: string;
    };

export interface DocumentParser {
  readonly parserName: string;
  readonly parserVersion: string;
  supports(mimeType: string): boolean;
  parse(buffer: Uint8Array, metadata: { mimeType: string; fileName: string }): Promise<ParseOutcome>;
}
