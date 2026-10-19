import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveCompanyResearchOutcome,
  memberResearchStatusLabel,
  researchOutcomeMemberCopy,
} from "./research-outcome";

test("facts_only when claims exist without signals", () => {
  const outcome = deriveCompanyResearchOutcome({
    signalCount: 0,
    activeClaimCount: 3,
    runStatus: "completed",
    insufficientEvidenceForSignal: true,
  });
  assert.equal(outcome, "facts_only");
  assert.match(researchOutcomeMemberCopy(outcome).body, /não há um movimento empresarial/i);
});

test("signal_found when active signals exist", () => {
  assert.equal(
    deriveCompanyResearchOutcome({ signalCount: 1, activeClaimCount: 2, runStatus: "completed" }),
    "signal_found",
  );
});

test("no_reliable_sources maps failure code", () => {
  assert.equal(
    deriveCompanyResearchOutcome({
      signalCount: 0,
      activeClaimCount: 0,
      runStatus: "failed",
      failureCode: "NO_RELIABLE_SOURCES",
    }),
    "no_reliable_sources",
  );
});

test("member status labels avoid technical jargon", () => {
  assert.equal(memberResearchStatusLabel("completed", "facts_only"), "Concluída sem sinal");
  assert.equal(memberResearchStatusLabel("generating_intelligence"), "Enriquecimento em andamento");
  assert.doesNotMatch(memberResearchStatusLabel("failed"), /CLAIMS_NOT_FOUND|pipeline/i);
});
