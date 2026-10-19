const FINANCIAL_SIGNAL =
  /ebitda|receita l[ií]quida|net revenue|net profit|lucro l[ií]quido|capex|guidance|operating cash|adjusted ebitda|r\$\s*\d|usd\s*\d|billion|bilh[oõ]es|million tons|toneladas|anuncia|announces|acquisition|fus[aã]o|capacidade/i;

export function isThinNormalizedText(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 2500) return true;
  const head = compact.slice(0, 1400);
  const digits = (compact.match(/\d/g) ?? []).length;
  if (/stay up to date|latest news|pt en suzano about us|cookie policy/i.test(head) && digits < 20) {
    return true;
  }
  return digits < 10;
}

export function isLowYieldNormalizedText(text: string): boolean {
  if (isThinNormalizedText(text)) return true;
  const compact = text.replace(/\s+/g, " ");
  if (FINANCIAL_SIGNAL.test(compact)) return false;
  return true;
}
