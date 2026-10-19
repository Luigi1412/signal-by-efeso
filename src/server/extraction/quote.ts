import { decodeHtmlEntities } from "@/server/parsers/html-entities";

export interface QuoteLocation {
  found: boolean;
  ambiguous: boolean;
  charStart: number | null;
  charEnd: number | null;
}

/**
 * Exact, non-fuzzy occurrence of `exactQuote` inside `blockText`.
 * Offsets are computed server-side. charEnd is exclusive.
 *
 * HTML numeric entities and a single trailing period are normalized so a
 * verbatim citation still matches the stored source text.
 */
export function locateExactQuote(blockText: string, exactQuote: string): QuoteLocation {
  if (!exactQuote || !blockText) {
    return { found: false, ambiguous: false, charStart: null, charEnd: null };
  }

  const quoteVariants = uniqueNonEmpty([
    exactQuote,
    decodeHtmlEntities(exactQuote),
    stripTrailingPeriod(exactQuote),
    stripTrailingPeriod(decodeHtmlEntities(exactQuote)),
  ]);
  for (const variant of quoteVariants) {
    const inOriginal = locateIn(blockText, variant);
    if (inOriginal.found) return inOriginal;
  }

  const decodedBlock = decodeHtmlEntities(blockText);
  if (decodedBlock !== blockText) {
    for (const variant of quoteVariants) {
      const inDecoded = locateIn(decodedBlock, variant);
      if (inDecoded.found) {
        const remapped = locateIn(blockText, variant);
        if (remapped.found) return remapped;
        return { found: true, ambiguous: inDecoded.ambiguous, charStart: null, charEnd: null };
      }
    }
  }

  return { found: false, ambiguous: false, charStart: null, charEnd: null };
}

function locateIn(blockText: string, exactQuote: string): QuoteLocation {
  if (!exactQuote || !blockText.includes(exactQuote)) {
    return { found: false, ambiguous: false, charStart: null, charEnd: null };
  }
  const first = blockText.indexOf(exactQuote);
  const second = blockText.indexOf(exactQuote, first + 1);
  if (second >= 0) {
    return { found: true, ambiguous: true, charStart: null, charEnd: null };
  }
  return {
    found: true,
    ambiguous: false,
    charStart: first,
    charEnd: first + exactQuote.length,
  };
}

function stripTrailingPeriod(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
