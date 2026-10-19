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
    return { maxWindows: 1, maxCharsPerWindow: 4000, maxTotalChars: 4000 };
  }
  return { maxWindows: 4, maxCharsPerWindow: 3500, maxTotalChars: 14000 };
}

/**
 * Prefer financially relevant blocks without truncating a kept block's text,
 * so exact-quote validation still sees the original sentence.
 */
export function selectFastPassBlocks(
  blocks: ParsedContentBlock[],
  options: FastPassWindowOptions,
): ParsedContentBlock[] {
  const eligible = blocks.filter((block) => !SKIP.has(block.blockType));
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
  if (/\d/.test(text)) score += 2;
  if (block.blockType === "table" || block.blockType === "list") score += 1;
  if (text.length > 80 && text.length < 2000) score += 1;
  return score;
}
