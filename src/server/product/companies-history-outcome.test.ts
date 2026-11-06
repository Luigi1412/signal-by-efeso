import assert from "node:assert/strict";
import test from "node:test";
import { memberOutcomeListLabel } from "./research-outcome";
import { evaluateResearchQualityGate } from "./research-quality-gate";

test("in-progress statuses never expose insufficient_evidence as list label", () => {
  const statuses = [
    "queued",
    "resolving_entity",
    "discovering_sources",
    "reviewing_sources",
    "ingesting_sources",
    "extracting_claims",
    "generating_signals",
    "generating_intelligence",
    "generating_opportunities",
    "generating_actions",
  ];
  for (const status of statuses) {
    assert.equal(memberOutcomeListLabel("insufficient_evidence", status), "Pesquisa em andamento");
  }
});

test("EXECUTION_ABANDONED terminal failure maps to analysis_failed, not insufficient_evidence", () => {
  const gate = evaluateResearchQualityGate({
    signalCount: 0,
    activeClaimCount: 0,
    primarySourceCount: 0,
    secondaryOnlyClaimCount: 0,
    recentMaterialClaimCount: 0,
    entityConfirmed: true,
    runStatus: "failed",
    failureCode: "EXECUTION_ABANDONED",
    insufficientEvidenceForSignal: true,
  });
  assert.equal(gate.researchOutcome, "analysis_failed");
  assert.equal(memberOutcomeListLabel(gate.researchOutcome, "failed"), "Pesquisa incompleta");
});
