import assert from "node:assert/strict";
import test from "node:test";
import {
  abandonedRunTerminalPatch,
  EXECUTION_ABANDONED_CODE,
  isAbandonedResearchRun,
  isActiveResearchStatus,
  STALE_LEASE_GRACE_MS,
} from "./stale-recovery-policy";
import type { ExternalResearchRunRow } from "./types";
import { memberOutcomeListLabel, memberResearchStatusLabel } from "@/server/product/research-outcome";

function runFixture(
  overrides: Partial<ExternalResearchRunRow> = {},
): ExternalResearchRunRow {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    workspace_id: "ws",
    requested_query: "Ambev",
    normalized_query: "ambev",
    requested_country: "BR",
    requested_industry: null,
    time_horizon_months: 24,
    resolved_company_id: "company",
    analysis_id: "analysis",
    research_run_id: "legacy",
    status: "extracting_claims",
    started_at: "2026-11-03T16:00:00.000Z",
    completed_at: null,
    failure_reason: null,
    failure_code: null,
    source_count: 10,
    accepted_source_count: 4,
    rejected_source_count: 2,
    unavailable_source_count: 0,
    resolution_payload: {
      coverage_assessment: { verdict: "adequate" },
      extraction_coverage: { documentsEligible: 17, claimsExtracted: 0 },
    },
    created_by: null,
    created_at: "2026-11-03T16:00:00.000Z",
    updated_at: "2026-11-03T16:30:00.000Z",
    worker_id: "old-owner",
    worker_lock_until: "2026-11-03T16:30:30.000Z",
    worker_heartbeat_at: "2026-11-03T16:30:00.000Z",
    ...overrides,
  } as ExternalResearchRunRow;
}

test("worker dies during extracting_claims → lease expires → run is abandoned after grace", () => {
  const now = Date.parse("2026-11-03T17:00:00.000Z");
  const run = runFixture({
    status: "extracting_claims",
    worker_lock_until: "2026-11-03T16:30:30.000Z",
  });
  assert.equal(isActiveResearchStatus(run.status), true);
  assert.equal(isAbandonedResearchRun(run, now, STALE_LEASE_GRACE_MS), true);
  // Still inside grace after lease expiry → not abandoned yet
  assert.equal(
    isAbandonedResearchRun(run, Date.parse("2026-11-03T16:31:00.000Z"), STALE_LEASE_GRACE_MS),
    false,
  );
});

test("live lease is never treated as abandoned", () => {
  const now = Date.parse("2026-11-03T16:30:00.000Z");
  const run = runFixture({
    worker_lock_until: "2026-11-03T16:30:30.000Z",
  });
  assert.equal(isAbandonedResearchRun(run, now), false);
});

test("terminal runs are not abandoned", () => {
  const run = runFixture({ status: "completed", worker_lock_until: null });
  assert.equal(isAbandonedResearchRun(run, Date.now()), false);
});

test("abandoned terminal patch is operational failure, not insufficient_evidence", () => {
  const run = runFixture();
  const patch = abandonedRunTerminalPatch(run, new Date("2026-11-04T12:00:00.000Z"));
  assert.equal(patch.status, "failed");
  assert.equal(patch.failure_code, EXECUTION_ABANDONED_CODE);
  assert.equal(patch.worker_id, null);
  assert.equal(patch.worker_lock_until, null);
  assert.ok(patch.completed_at);
  const payload = patch.resolution_payload as Record<string, unknown>;
  assert.equal(payload.research_outcome, "analysis_failed");
  assert.equal(payload.execution_status, "failed");
  assert.deepEqual(
    (payload.coverage_assessment as { verdict: string } | undefined)?.verdict,
    "adequate",
  );
  assert.ok((payload.extraction_coverage as { documentsEligible?: number })?.documentsEligible === 17);
  assert.notEqual(payload.research_outcome, "insufficient_evidence");
});

test("expired ownership cannot keep writing: abandoned patch clears worker fencing fields", () => {
  const patch = abandonedRunTerminalPatch(runFixture({ worker_id: "dead-owner" }));
  assert.equal(patch.worker_id, null);
  assert.equal(patch.worker_lock_until, null);
});

test("abandoned recovery preserves diagnostic payload; pending claims stay auditable outside the patch", () => {
  const run = runFixture({
    resolution_payload: {
      coverage_assessment: { verdict: "adequate", retainedCount: 17 },
      extraction_coverage: { documentsEligible: 17, claimsExtracted: 14 },
      pending_claim_audit: { pending_validation: 9, rejected: 5 },
    },
  });
  const patch = abandonedRunTerminalPatch(run, new Date("2026-11-04T12:00:00.000Z"));
  const payload = patch.resolution_payload as Record<string, unknown>;
  assert.deepEqual(payload.coverage_assessment, {
    verdict: "adequate",
    retainedCount: 17,
  });
  assert.deepEqual(payload.extraction_coverage, {
    documentsEligible: 17,
    claimsExtracted: 14,
  });
  const audit = payload.pending_claim_audit as Record<string, unknown>;
  assert.equal(audit.pending_validation, 9);
  assert.equal(audit.rejected, 5);
  assert.equal(audit.preservedForAudit, true);
  assert.equal(audit.unresolved, true);
  assert.equal(audit.neverSilentPromote, true);
  // Recovery must not rewrite claim rows — only operational terminal fields.
  assert.equal("status" in patch && patch.status === "failed", true);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, "claim_candidates"), false);
});

test("in-progress run never renders epistemological final outcome in list labels", () => {
  for (const status of [
    "queued",
    "resolving_entity",
    "discovering_sources",
    "reviewing_sources",
    "ingesting_sources",
    "extracting_claims",
    "generating_signals",
  ]) {
    assert.equal(memberOutcomeListLabel("insufficient_evidence", status), "Pesquisa em andamento");
    assert.equal(memberResearchStatusLabel(status, "insufficient_evidence"), "Pesquisa em andamento");
  }
  assert.equal(memberOutcomeListLabel("analysis_failed", "failed"), "Pesquisa incompleta");
});
