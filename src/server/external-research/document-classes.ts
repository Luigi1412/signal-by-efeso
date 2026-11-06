/**
 * Generic documentary classes for directed discovery and coverage assessment.
 * Never company-specific — classifiers use URL/title/sourceType only.
 */

export const DOCUMENT_CLASSES = [
  "official_site",
  "investor_relations",
  "financial_results",
  "annual_report",
  "regulatory_filing",
  "official_release",
  "presentation",
  "operations_capex",
  "news_secondary",
  "other",
] as const;

export type DocumentClass = (typeof DOCUMENT_CLASSES)[number];

/** Classes that establish a minimally competent public base for a large/public company. */
export const CORE_COVERAGE_CLASSES: DocumentClass[] = [
  "investor_relations",
  "financial_results",
  "annual_report",
  "regulatory_filing",
  "official_release",
];

export function classifyDocumentClass(input: {
  url: string;
  title?: string | null;
  sourceType?: string | null;
  sourceQuality?: string | null;
}): DocumentClass {
  const url = input.url.toLowerCase();
  const title = (input.title ?? "").toLowerCase();
  const hay = `${url} ${title}`;
  const type = input.sourceType ?? "";

  if (
    type === "earnings_release" ||
    /earnings|resultado|resultados|financial.?results?|destaques.?financeir|dividend|jcp|interim|quarterly|trimestr|balan[cç]o|2q|1q|3q|4q|full.?year/.test(hay)
  ) {
    return "financial_results";
  }
  if (
    type === "annual_report" ||
    /annual.?report|relat[oó]rio.?anual|universal.?registration|20-f|10-k|registration.?document/.test(hay)
  ) {
    return "annual_report";
  }
  if (
    type === "filing" ||
    type === "regulator" ||
    /sec\.gov|cvm\.gov|b3\.com\.br|edgar|fatos relevantes|8-k|6-k|amf-france/.test(hay)
  ) {
    return "regulatory_filing";
  }
  if (
    /(?:^|\.)(?:ir|ri)\.|investor|investidores|relations-with-investors|relacoes-com-investidores|rela[cç][oõ]es com investidores/.test(
      hay,
    )
  ) {
    return "investor_relations";
  }
  if (
    type === "press_release" ||
    /newsroom|press.?release|imprensa|comunicado ao mercado|official.?release/.test(hay)
  ) {
    return "official_release";
  }
  if (/presentation|apresenta[cç][aã]o|slide.?deck|investor.?day/.test(hay)) {
    return "presentation";
  }
  if (
    /capex|f[aá]brica|factory|plant|expans[aã]o|capacidade|capacity|production|produ[cç]|supply.?chain|log[ií]stic|reestrutur|restructur|aquisi|acquisition|integra|automa[cç]|productivity|opera[cç][oõ]es/.test(
      hay,
    )
  ) {
    return "operations_capex";
  }
  if (input.sourceQuality === "primary" && /\/$/.test(url.replace(/\?.*/, ""))) {
    return "official_site";
  }
  if (type === "news" || input.sourceQuality === "secondary") {
    return "news_secondary";
  }
  return "other";
}

export function summarizeClassCoverage(
  items: Array<{ url: string; title?: string | null; sourceType?: string | null; sourceQuality?: string | null; dense?: boolean }>,
): Record<DocumentClass, { count: number; dense: number }> {
  const summary = Object.fromEntries(
    DOCUMENT_CLASSES.map((cls) => [cls, { count: 0, dense: 0 }]),
  ) as Record<DocumentClass, { count: number; dense: number }>;
  for (const item of items) {
    const cls = classifyDocumentClass(item);
    summary[cls].count += 1;
    if (item.dense) summary[cls].dense += 1;
  }
  return summary;
}
