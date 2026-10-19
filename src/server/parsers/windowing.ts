import { EXTRACTION_WINDOW_MAX_CHARS, EXTRACTION_WINDOW_OVERLAP_BLOCKS } from "./constants";
import type { ParsedContentBlock } from "./types";

export interface ExtractionWindow {
  windowIndex: number;
  blocks: ParsedContentBlock[];
}

const SKIP_FROM_WINDOWS = new Set(["header", "footer"]);

/**
 * Headers/footers stay persisted for provenance but are excluded from extraction windows.
 * Windows overlap so claims that straddle a boundary can still be cited.
 */
export function buildExtractionWindows(
  blocks: ParsedContentBlock[],
  options?: { maxChars?: number; overlapBlocks?: number },
): ExtractionWindow[] {
  const maxChars = options?.maxChars ?? EXTRACTION_WINDOW_MAX_CHARS;
  const overlap = options?.overlapBlocks ?? EXTRACTION_WINDOW_OVERLAP_BLOCKS;
  const eligible = blocks.filter((block) => !SKIP_FROM_WINDOWS.has(block.blockType));
  if (eligible.length === 0) return [];

  const windows: ExtractionWindow[] = [];
  let start = 0;

  while (start < eligible.length) {
    const slice: ParsedContentBlock[] = [];
    let chars = 0;
    let index = start;
    while (index < eligible.length) {
      const next = eligible[index];
      const nextLen = next.textContent.length;
      if (slice.length > 0 && chars + nextLen > maxChars) break;
      slice.push(next);
      chars += nextLen;
      index += 1;
      if (chars >= maxChars) break;
    }

    windows.push({ windowIndex: windows.length, blocks: slice });
    if (index >= eligible.length) break;
    start = Math.max(start + 1, index - overlap);
  }

  return windows;
}
