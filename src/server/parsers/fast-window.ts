import type { ParsedContentBlock } from "./types";

export interface FastPassWindowOptions {
  maxWindows: number;
  maxCharsPerWindow: number;
  maxTotalChars: number;
}

const SKIP = new Set(["header", "footer"]);

const RELEVANT =
  /(?:\d|%|R\$|USD|EUR|invest|capex|capacit|result|receita|revenue|earnings|ebitda|acquisition|merger|plant|f[aá]brica|restructur|headcount|guidance|dividen|produção|producao|pulp|celulose|ton)/i;

export function getFastPassWindowOptions(provider: string): FastPassWindowOptions {
  if (provider === "ollama") {
    // Local 8B generation is ~5 tok/s; keep windows tight so prompt eval stays cheap.
    return { maxWindows: 1, maxCharsPerWindow: 2200, maxTotalChars: 2200 };
  }
  return { maxWindows: 4, maxCharsPerWindow: 3500, maxTotalChars: 14000 };
}

/**
 * Merge adjacent short PDF/HTML fragments so smashed table cells form usable sentences
 * for the extractor without inventing text (join with spaces only).
 */
export function coalesceSparseBlocks(
  blocks: ParsedContentBlock[],
  options?: { maxPieceChars?: number; maxMergedChars?: number },
): ParsedContentBlock[] {
  const maxPiece = options?.maxPieceChars ?? 80;
  const maxMerged = options?.maxMergedChars ?? 1200;
  const eligible = blocks.filter((block) => !SKIP.has(block.blockType));
  if (eligible.length === 0) return [];
  const out: ParsedContentBlock[] = [];
  let buffer: ParsedContentBlock | null = null;

  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = null;
  };

  for (const block of eligible) {
    const text = block.textContent.trim();
    if (!text) continue;
    const short = text.length <= maxPiece;
    if (short && buffer !== null && buffer.textContent.length + text.length + 1 <= maxMerged) {
      const current: ParsedContentBlock = buffer;
      buffer = {
        ...current,
        textContent: `${current.textContent} ${text}`.replace(/\s+/g, " ").trim(),
        blockType: current.blockType === "table" || block.blockType === "table" ? "table" : "paragraph",
      };
      continue;
    }
    if (short && !buffer) {
      buffer = { ...block, textContent: text };
      continue;
    }
    flush();
    if (short) {
      buffer = { ...block, textContent: text };
    } else {
      out.push({ ...block, textContent: text });
    }
  }
  flush();
  return out;
}

/**
 * Prefer financially relevant blocks without truncating a kept block's text,
 * so exact-quote validation still sees the original sentence.
 */
export function selectFastPassBlocks(
  blocks: ParsedContentBlock[],
  options: FastPassWindowOptions,
): ParsedContentBlock[] {
  const coalesced = coalesceSparseBlocks(blocks);
  const eligible = coalesced.length > 0 ? coalesced : blocks.filter((block) => !SKIP.has(block.blockType));
  if (eligible.length === 0) return [];

  const scored = eligible.map((block, order) => ({
    block,
    order,
    score: scoreBlock(block),
  }));
  scored.sort((left, right) => right.score - left.score || left.order - right.order);

  const picked = new Set<number>();
  let chars = 0;
  for (const item of scored) {
    const length = item.block.textContent.length;
    if (picked.size > 0 && chars + length > options.maxTotalChars) continue;
    picked.add(item.block.blockIndex);
    chars += length;
    if (chars >= options.maxTotalChars) break;
  }

  if (picked.size === 0) {
    const first = eligible[0];
    return first ? [first] : [];
  }

  return eligible.filter((block) => picked.has(block.blockIndex));
}

function scoreBlock(block: ParsedContentBlock): number {
  const text = block.textContent;
  let score = 0;
  if (RELEVANT.test(text)) score += 4;
  if (/\d/.test(text)) score += 1;
  if (/capacity|ramp.?up|production|produtiv|restructur|capex|supplier|supply.?chain|shutdown|acquisition|opera[cç]|capacidade|reestrutur|investimento/i.test(text)) score += 6;
  if (block.blockType === "table" || block.blockType === "list") score += 1;
  if (text.length > 80 && text.length < 2000) score += 1;
  // Prefer blocks that already join a metric label with digits (post-coalesce tables).
  if (/revenue|receita|ebitda|capex/i.test(text) && /\d/.test(text)) score += 5;
  return score;
}
