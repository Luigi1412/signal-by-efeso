import {
  CORE_COVERAGE_CLASSES,
  classifyDocumentClass,
  summarizeClassCoverage,
  type DocumentClass,
} from "./document-classes";

export type CoverageVerdict =
  | "adequate"
  | "research_coverage_insufficient"
  | "public_evidence_insufficient";

export interface CoverageSourceInput {
  url: string;
  title?: string | null;
  sourceType?: string | null;
  sourceQuality?: string | null;
  status?: string | null;
  /** Captured normalized text length or equivalent density signal. */
  textLen?: number;
  rejectionReason?: string | null;
}

export interface CoverageAssessment {
  verdict: CoverageVerdict;
  officialDomainConfirmed: boolean;
  retainedCount: number;
  denseOfficialCount: number;
  denseFinancialCount: number;
  classes: Record<DocumentClass, { count: number; dense: number }>;
  missingCoreClasses: DocumentClass[];
  gaps: string[];
  /** True when identity+footprint imply public docs should exist but pipeline missed them. */
  shouldExpand: boolean;
  expansionReasons: string[];
}

const DENSE_CHARS = 2500;

/**
 * Assess whether the retained corpus is a competent research base.
 * Distinguishes "we failed to cover" from "public record truly thin".
 */
export function assessResearchCoverage(input: {
  officialDomain: string | null | undefined;
  entityConfirmed: boolean;
  sources: CoverageSourceInput[];
  /** Prior expansion waves already spent (stopping rule). */
  expansionWavesUsed?: number;
  maxExpansionWaves?: number;
}): CoverageAssessment {
  const retained = input.sources.filter(
    (row) =>
      row.status === "fetched" ||
      row.status === "accepted" ||
      (Boolean(row.textLen) && row.status !== "rejected" && row.status !== "failed"),
  );
  const denseOfficial = retained.filter(
    (row) =>
      row.sourceQuality === "primary" &&
      (row.textLen ?? 0) >= DENSE_CHARS &&
      !isListingShell(row),
  );
  const denseFinancial = denseOfficial.filter((row) => {
    const cls = classifyDocumentClass(row);
    return cls === "financial_results" || cls === "annual_report" || cls === "regulatory_filing";
  });

  const classItems = retained.map((row) => ({
    ...row,
    dense: (row.textLen ?? 0) >= DENSE_CHARS && row.sourceQuality === "primary",
  }));
  const classes = summarizeClassCoverage(classItems);
  const missingCoreClasses = CORE_COVERAGE_CLASSES.filter((cls) => classes[cls].dense === 0);

  const officialDomainConfirmed = Boolean(input.officialDomain && input.entityConfirmed);
  const waves = input.expansionWavesUsed ?? 0;
  const maxWaves = input.maxExpansionWaves ?? 2;

  const gaps: string[] = [];
  if (denseOfficial.length === 0) gaps.push("no_dense_official_source");
  if (denseFinancial.length === 0) gaps.push("no_dense_financial_or_filing");
  if (retained.length > 0 && retained.every((row) => row.sourceQuality !== "primary")) {
    gaps.push("secondary_only_retention");
  }
  if (missingCoreClasses.length === CORE_COVERAGE_CLASSES.length) {
    gaps.push("no_core_document_class_dense");
  }

  const expansionReasons: string[] = [];
  if (officialDomainConfirmed && denseOfficial.length === 0) {
    expansionReasons.push("confirmed_domain_without_dense_official");
  }
  if (officialDomainConfirmed && denseFinancial.length === 0) {
    expansionReasons.push("missing_official_financial_corpus");
  }
  if (officialDomainConfirmed && classes.operations_capex.count > 0 && classes.operations_capex.dense === 0) {
    expansionReasons.push("operations_capex_leads_without_dense_confirmation");
  }

  const shouldExpand = expansionReasons.length > 0 && waves < maxWaves;

  let verdict: CoverageVerdict;
  if (denseOfficial.length >= 1 && (denseFinancial.length >= 1 || retained.length >= 4)) {
    verdict = "adequate";
  } else if (officialDomainConfirmed && (denseOfficial.length === 0 || denseFinancial.length === 0)) {
    // Large/public footprint expected once domain is confirmed — treat as coverage failure
    // until expansion budget is exhausted; after that still label as coverage insufficient
    // rather than claiming the public record is empty.
    verdict = "research_coverage_insufficient";
  } else {
    verdict = "public_evidence_insufficient";
  }

  return {
    verdict,
    officialDomainConfirmed,
    retainedCount: retained.length,
    denseOfficialCount: denseOfficial.length,
    denseFinancialCount: denseFinancial.length,
    classes,
    missingCoreClasses,
    gaps,
    shouldExpand,
    expansionReasons,
  };
}

function isListingShell(row: CoverageSourceInput): boolean {
  const hay = `${row.url} ${row.title ?? ""}`.toLowerCase();
  return /\/(?:investors|investor-relations|newsroom|press-releases)\/?(?:\?.*)?$/.test(row.url) ||
    /central-de-resultados|results-center/.test(hay);
}

/** Targeted follow-up query seeds derived from coverage gaps (generic). */
export function coverageExpansionQueryHints(input: {
  companyName: string;
  officialDomain: string | null;
  country?: string | null;
  assessment: CoverageAssessment;
}): Array<{ query: string; site: string | null; classHint: DocumentClass }> {
  const name = `"${input.companyName.trim()}"`;
  const domain = input.officialDomain?.replace(/^www\./, "") ?? null;
  const isBr =
    (input.country ?? "").toUpperCase().startsWith("BR") || /\.br$/i.test(domain ?? "");
  const hints: Array<{ query: string; site: string | null; classHint: DocumentClass }> = [];

  if (input.assessment.denseFinancialCount === 0 && domain) {
    hints.push({
      query: `${name} filetype:pdf (earnings OR results OR resultados OR interim OR "full year" OR trimestr OR balanço)`,
      site: domain,
      classHint: "financial_results",
    });
    hints.push({
      query: `${name} filetype:pdf ("annual report" OR "relatório anual" OR "20-F" OR "registration document")`,
      site: domain,
      classHint: "annual_report",
    });
  }
  if (input.assessment.denseOfficialCount === 0 && domain) {
    hints.push({
      query: `${name} ("investor relations" OR "relações com investidores" OR resultados OR earnings)`,
      site: domain,
      classHint: "investor_relations",
    });
    // BR issuers often use ri.* not ir.*
    if (isBr || /\.br$/i.test(domain)) {
      hints.push({
        query: `${name} (resultados OR earnings OR "release de resultados") filetype:pdf`,
        site: `ri.${domain}`,
        classHint: "financial_results",
      });
    } else {
      hints.push({
        query: `${name} (earnings OR results OR "annual report") filetype:pdf`,
        site: `ir.${domain}`,
        classHint: "financial_results",
      });
    }
  }
  if (input.assessment.expansionReasons.includes("operations_capex_leads_without_dense_confirmation")) {
    hints.push({
      query: isBr
        ? `${name} (fábrica OR expansão OR CapEx OR investimento OR capacidade) (comunicado OR release OR RI)`
        : `${name} (factory OR expansion OR CapEx OR capacity OR investment) (release OR IR OR filing)`,
      site: null,
      classHint: "operations_capex",
    });
  }
  if (isBr && input.assessment.missingCoreClasses.includes("regulatory_filing")) {
    hints.push({
      query: `${name} ("fatos relevantes" OR "comunicado ao mercado" OR CVM)`,
      site: null,
      classHint: "regulatory_filing",
    });
  }
  return hints.slice(0, 6);
}
