import type { ResearchOutcome } from "./research-outcome";

export type ExecutionStatus = "running" | "completed" | "completed_with_warnings" | "failed";

export interface ResearchQualityGateInput {
  signalCount: number;
  activeClaimCount: number;
  primarySourceCount: number;
  secondaryOnlyClaimCount: number;
  recentMaterialClaimCount: number;
  entityConfirmed: boolean;
  runStatus?: string | null;
  failureCode?: string | null;
  unavailableSourceCount?: number;
  insufficientEvidenceForSignal?: boolean;
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

  if (input.signalCount > 0) {
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
    input.activeClaimCount === 0 ||
    (input.activeClaimCount <= 2 && input.primarySourceCount === 0) ||
    (input.activeClaimCount === 1 && input.secondaryOnlyClaimCount >= 1 && input.primarySourceCount === 0) ||
    (input.recentMaterialClaimCount === 0 && input.activeClaimCount > 0 && input.primarySourceCount === 0);

  if (weakBase || input.insufficientEvidenceForSignal && input.primarySourceCount === 0 && input.activeClaimCount <= 2) {
    if (input.activeClaimCount === 0) reasons.push("no_claims");
    if (input.primarySourceCount === 0) reasons.push("no_primary_sources");
    if (input.recentMaterialClaimCount === 0) reasons.push("no_recent_material_claims");
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
