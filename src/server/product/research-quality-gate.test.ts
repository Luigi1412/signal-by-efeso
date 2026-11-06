import assert from "node:assert/strict";
import test from "node:test";
import { evaluateResearchQualityGate, mapExecutionStatusToRunStatus } from "./research-quality-gate";
import { deriveCompanyResearchOutcome } from "./research-outcome";

test("single secondary claim without primary → insufficient_evidence", () => {
  const gate = evaluateResearchQualityGate({
    signalCount: 0,
    activeClaimCount: 1,
    primarySourceCount: 0,
    secondaryOnlyClaimCount: 1,
    recentMaterialClaimCount: 0,
    entityConfirmed: true,
    runStatus: "completed",
    insufficientEvidenceForSignal: true,
  });
  assert.equal(gate.researchOutcome, "insufficient_evidence");
  assert.equal(gate.publishFullReport, false);
  assert.equal(gate.executionStatus, "completed");
  assert.ok(gate.reasons.includes("no_cited_primary_source"));
});

test("confirmed domain without dense official corpus → research_coverage_insufficient", () => {
  const gate = evaluateResearchQualityGate({
    signalCount: 0,
    activeClaimCount: 0,
    primarySourceCount: 0,
    secondaryOnlyClaimCount: 0,
    recentMaterialClaimCount: 0,
    entityConfirmed: true,
    runStatus: "completed",
    insufficientEvidenceForSignal: true,
    coverageVerdict: "research_coverage_insufficient",
  });
  assert.equal(gate.researchOutcome, "research_coverage_insufficient");
  assert.ok(gate.reasons.includes("research_coverage_insufficient"));
});

test("warnings map to completed run status, not partial outcome", () => {
  const gate = evaluateResearchQualityGate({
    signalCount: 0,
    activeClaimCount: 4, preciseClaimCount:4,provenanceClaimCount:4,
    primarySourceCount: 2,
    secondaryOnlyClaimCount: 0,
    recentMaterialClaimCount: 3,
    entityConfirmed: true,
    runStatus: "completed",
    unavailableSourceCount: 2,
    insufficientEvidenceForSignal: true,
  });
  assert.equal(gate.researchOutcome, "facts_only");
  assert.equal(gate.executionStatus, "completed_with_warnings");
  assert.equal(mapExecutionStatusToRunStatus(gate.executionStatus), "completed");
});

test("deriveCompanyResearchOutcome keeps facts_only when primary evidence exists", () => {
  assert.equal(
    deriveCompanyResearchOutcome({
      signalCount: 0,
      activeClaimCount: 3, preciseClaimCount:3,provenanceClaimCount:3,entityConfirmed:true,
      runStatus: "completed",
      insufficientEvidenceForSignal: true,
      primarySourceCount: 2,
      recentMaterialClaimCount: 3,
    }),
    "facts_only",
  );
});

test("partial status alone does not invent analysis_partial when evidence is weak", () => {
  assert.equal(
    deriveCompanyResearchOutcome({
      signalCount: 0,
      activeClaimCount: 1,
      runStatus: "partial",
      insufficientEvidenceForSignal: true,
      primarySourceCount: 0,
      secondaryOnlyClaimCount: 1,
      recentMaterialClaimCount: 0,
    }),
    "insufficient_evidence",
  );
});
