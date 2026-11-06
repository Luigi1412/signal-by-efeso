import type { ExternalResearchRunRow, ExternalResearchStatus, ResearchFailureCode } from "./types";

/** Non-terminal statuses a worker may still own. */
export const WORKER_ACTIVE_STATUSES: ExternalResearchStatus[] = [
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

/** Grace after lease expiry before a run is considered abandoned (not merely between renewals). */
export const STALE_LEASE_GRACE_MS = Math.max(
  60_000,
  Number(process.env.RESEARCH_STALE_LEASE_GRACE_MS) || 120_000,
);

export const EXECUTION_ABANDONED_CODE = "EXECUTION_ABANDONED" as const satisfies ResearchFailureCode;

export const EXECUTION_ABANDONED_MESSAGE =
  "A execução foi interrompida: o worker perdeu o lease/heartbeat e nenhum processo válido continuou a pesquisa. Fontes e candidatos foram preservados.";

export function isActiveResearchStatus(status: string | null | undefined): boolean {
  return Boolean(status && (WORKER_ACTIVE_STATUSES as readonly string[]).includes(status));
}

/**
 * A run is abandoned when it is still non-terminal but no worker holds a live lease
 * for longer than the grace window (lease missing or expired past grace).
 */
export function isAbandonedResearchRun(
  run: Pick<ExternalResearchRunRow, "status" | "worker_lock_until" | "worker_heartbeat_at" | "updated_at">,
  nowMs = Date.now(),
  graceMs = STALE_LEASE_GRACE_MS,
): boolean {
  if (!isActiveResearchStatus(run.status)) return false;
  const leaseUntil = run.worker_lock_until ? Date.parse(run.worker_lock_until) : Number.NaN;
  if (Number.isFinite(leaseUntil) && leaseUntil > nowMs) return false;
  const leaseExpiredAt = Number.isFinite(leaseUntil)
    ? leaseUntil
    : Date.parse(run.worker_heartbeat_at ?? run.updated_at);
  if (!Number.isFinite(leaseExpiredAt)) return true;
  return nowMs - leaseExpiredAt >= graceMs;
}

export function abandonedRunTerminalPatch(
  run: ExternalResearchRunRow,
  now = new Date(),
): Partial<ExternalResearchRunRow> & { status: ExternalResearchStatus } {
  const payload =
    run.resolution_payload && typeof run.resolution_payload === "object"
      ? { ...(run.resolution_payload as Record<string, unknown>) }
      : {};
  return {
    status: "failed",
    failure_code: EXECUTION_ABANDONED_CODE,
    failure_reason: EXECUTION_ABANDONED_MESSAGE,
    completed_at: now.toISOString(),
    worker_id: null,
    worker_lock_until: null,
    resolution_payload: {
      ...payload,
      research_outcome: "analysis_failed",
      execution_status: "failed",
      abandonment: {
        code: EXECUTION_ABANDONED_CODE,
        detectedAt: now.toISOString(),
        previousStatus: run.status,
        previousWorkerId: run.worker_id ?? null,
        previousLockUntil: run.worker_lock_until ?? null,
        previousHeartbeatAt: run.worker_heartbeat_at ?? null,
      },
      // Pending candidates stay as pending_validation for audit. They are unresolved —
      // never silently promoted. A healthy resume continues validation instead.
      pending_claim_audit: {
        ...(typeof payload.pending_claim_audit === "object" && payload.pending_claim_audit
          ? (payload.pending_claim_audit as Record<string, unknown>)
          : {}),
        preservedForAudit: true,
        unresolved: true,
        mayResumeValidation: true,
        neverSilentPromote: true,
      },
    },
  };
}
