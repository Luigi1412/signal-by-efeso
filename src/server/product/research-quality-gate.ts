import type { ResearchOutcome } from "./research-outcome";

export type ExecutionStatus = "running" | "completed" | "completed_with_warnings" | "failed";

export interface ResearchQualityGateInput {
  signalCount: number;
  qualifiedSignalCount?: number;
  preciseClaimCount?: number;
  provenanceClaimCount?: number;
  activeClaimCount: number;
  primarySourceCount: number;
  secondaryOnlyClaimCount: number;
  recentMaterialClaimCount: number;
  entityConfirmed: boolean;
  runStatus?: string | null;
  failureCode?: string | null;
  unavailableSourceCount?: number;
  insufficientEvidenceForSignal?: boolean;
  /** Pipeline coverage vs true public thinness — set by assessResearchCoverage. */
  coverageVerdict?: "adequate" | "research_coverage_insufficient" | "public_evidence_insufficient" | null;
  /** Claim-extraction coverage from bounded extracting_claims. */
  extractionCoverage?: {
    documentsAttempted?: number;
    documentsExtracted?: number;
    documentsTimedOut?: number;
    documentsFailed?: number;
    claimsExtracted?: number;
    circuitOpened?: boolean;
  } | null;
}

export interface ResearchQualityGateResult {
  executionStatus: ExecutionStatus;
  researchOutcome: ResearchOutcome;
  publishFullReport: boolean;
  reasons: string[];
}

/**
 * Separates pipeline execution health from research usefulness.
 * Does not relax validators — only decides how to present an honest outcome.
 */
export function evaluateResearchQualityGate(input: ResearchQualityGateInput): ResearchQualityGateResult {
  const reasons: string[] = [];
  const failed = input.runStatus === "failed";
  const warnings =
    (input.unavailableSourceCount ?? 0) > 0 ||
    input.runStatus === "partial" ||
    Boolean(input.failureCode && input.runStatus !== "failed");

  if (failed) {
    const outcome =
      input.failureCode === "NO_RELIABLE_SOURCES" || input.failureCode === "SOURCE_FETCH_FAILED"
        ? ("no_reliable_sources" as const)
        : ("analysis_failed" as const);
    return {
      executionStatus: "failed",
      researchOutcome: outcome,
      publishFullReport: false,
      reasons: [input.failureCode ?? "failed"],
    };
  }

  if (!input.entityConfirmed) return { executionStatus: warnings ? "completed_with_warnings" : "completed", researchOutcome: "insufficient_evidence", publishFullReport: false, reasons: ["entity_unconfirmed"] };

  if ((input.qualifiedSignalCount ?? 0) > 0 && (input.preciseClaimCount ?? 0) >= 2 &&
      (input.provenanceClaimCount ?? 0) >= 2 && input.recentMaterialClaimCount > 0) {
    return {
      executionStatus: warnings ? "completed_with_warnings" : "completed",
      researchOutcome: "signal_found",
      publishFullReport: true,
      reasons: [],
    };
  }

  if (!input.entityConfirmed) {
    reasons.push("entity_unconfirmed");
  }

  const weakBase =
    (input.preciseClaimCount ?? 0) === 0 || (input.provenanceClaimCount ?? 0) === 0 ||
    input.activeClaimCount === 0 ||
    (input.activeClaimCount <= 2 && input.primarySourceCount === 0) ||
    (input.activeClaimCount === 1 && input.secondaryOnlyClaimCount >= 1 && input.primarySourceCount === 0) ||
    (input.recentMaterialClaimCount === 0 && input.activeClaimCount > 0 && input.primarySourceCount === 0);

  if (weakBase || input.insufficientEvidenceForSignal && input.primarySourceCount === 0 && input.activeClaimCount <= 2) {
    if (input.activeClaimCount === 0) reasons.push("no_claims");
    // Cited-by-qualified-claim primaries — distinct from retained source_quality=primary docs.
    if (input.primarySourceCount === 0) reasons.push("no_cited_primary_source");
    if (input.recentMaterialClaimCount === 0) reasons.push("no_recent_material_claims");
    const extraction = input.extractionCoverage;
    if (extraction) {
      if ((extraction.documentsTimedOut ?? 0) > 0) reasons.push("extraction_timeouts");
      if (extraction.circuitOpened) reasons.push("extraction_circuit_open");
      if ((extraction.documentsAttempted ?? 0) > 0 && (extraction.documentsExtracted ?? 0) === 0) {
        reasons.push("extraction_coverage_insufficient");
      }
    }
    if (input.coverageVerdict === "research_coverage_insufficient") {
      reasons.push("research_coverage_insufficient");
      return {
        executionStatus: warnings ? "completed_with_warnings" : "completed",
        researchOutcome: "research_coverage_insufficient",
        publishFullReport: false,
        reasons,
      };
    }
    return {
      executionStatus: warnings ? "completed_with_warnings" : "completed",
      researchOutcome: "insufficient_evidence",
      publishFullReport: false,
      reasons,
    };
  }

  if (input.activeClaimCount > 0) {
    return {
      executionStatus: warnings ? "completed_with_warnings" : "completed",
      researchOutcome: "facts_only",
      publishFullReport: true,
      reasons: input.insufficientEvidenceForSignal ? ["signals_not_supported"] : [],
    };
  }

  return {
    executionStatus: warnings ? "completed_with_warnings" : "completed",
    researchOutcome: "insufficient_evidence",
    publishFullReport: false,
    reasons: ["empty_evidence"],
  };
}

export function mapExecutionStatusToRunStatus(execution: ExecutionStatus): "completed" | "partial" | "failed" {
  if (execution === "failed") return "failed";
  // Persist completed_with_warnings as completed; warnings live in resolution_payload.
  if (execution === "completed_with_warnings") return "completed";
  if (execution === "completed") return "completed";
  return "partial";
}
