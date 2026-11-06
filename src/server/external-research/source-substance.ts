/**
 * Document-shape helpers shared by ranking, retention, and thin-source filters.
 * Keeps filing *notices* and compensation pages from consuming extraction slots
 * ahead of interim/annual reports and financial results.
 */

const FILING_NOTICE =
  /(?:universal\s+registration\s+document|registration\s+document|annual\s+report|20-f|10-k|urd)\s+filed\b|announces?\s+the\s+availability|disponibilidade\s+d[oe]|document\s+(?:has\s+been\s+)?filed\s+with/i;

const COMPENSATION_PAGE =
  /executive\s+corporate\s+officers['’]?\s+compensation|remuneration\s+of\s+(?:executive|corporate)\s+officers|compensa[cç][aã]o\s+dos\s+administradores/i;

const DENSE_REPORT =
  /interim\s+financial\s+report|half[- ]year\s+(?:financial\s+)?report|universal\s+registration\s+document(?!\s+filed)|annual\s+(?:financial\s+)?report(?!\s+filed)|consolidated\s+financial\s+statements|financial\s+results|earnings\s+release|resultados\s+financeiros|relat[oó]rio\s+(?:financeiro|anual|intercal)/i;

export function isFilingAvailabilityNotice(url: string, title?: string | null): boolean {
  const hay = `${url} ${title ?? ""}`;
  if (DENSE_REPORT.test(hay) && !FILING_NOTICE.test(hay)) return false;
  return FILING_NOTICE.test(hay);
}

export function isCompensationDisclosure(url: string, title?: string | null): boolean {
  return COMPENSATION_PAGE.test(`${url} ${title ?? ""}`);
}

export function isDenseFinancialReport(url: string, title?: string | null): boolean {
  const hay = `${url} ${title ?? ""}`;
  if (isFilingAvailabilityNotice(url, title)) return false;
  return DENSE_REPORT.test(hay) || /\.pdf(?:$|\?)/i.test(url);
}

/** Prefer harvesting official PDFs from HTML shells that are notices or thin IR pages. */
export function shouldHarvestOfficialPdfs(textLength: number, url: string, title?: string | null): boolean {
  if (isFilingAvailabilityNotice(url, title)) return true;
  if (isDenseFinancialReport(url, title) && textLength < 20_000) return true;
  // IR/RI host shells almost always need PDF follow-up even when chrome exceeds the thin threshold.
  if (/(?:^|\.)(?:ir|ri)\./i.test(url) || /investors?|investidores|resultados|earnings/i.test(`${url} ${title ?? ""}`)) {
    return textLength < 40_000;
  }
  return textLength < 6000;
}
