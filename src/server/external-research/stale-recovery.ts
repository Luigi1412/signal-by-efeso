import "server-only";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import type { ExternalResearchRunRow } from "./types";
import {
  abandonedRunTerminalPatch,
  EXECUTION_ABANDONED_CODE,
  isAbandonedResearchRun,
  STALE_LEASE_GRACE_MS,
  WORKER_ACTIVE_STATUSES,
} from "./stale-recovery-policy";

export {
  abandonedRunTerminalPatch,
  EXECUTION_ABANDONED_CODE,
  EXECUTION_ABANDONED_MESSAGE,
  isAbandonedResearchRun,
  isActiveResearchStatus,
  STALE_LEASE_GRACE_MS,
  WORKER_ACTIVE_STATUSES,
} from "./stale-recovery-policy";

/**
 * Finalize abandoned non-terminal runs. Uses service-role updates without impersonating
 * the previous worker owner (fencing: old owner cannot write after lease expiry).
 */
export async function recoverAbandonedResearchRuns(input?: {
  limit?: number;
  nowMs?: number;
  graceMs?: number;
}): Promise<{ recovered: ExternalResearchRunRow[]; examined: number }> {
  const db = createPipelineAdminClient();
  const nowMs = input?.nowMs ?? Date.now();
  const graceMs = input?.graceMs ?? STALE_LEASE_GRACE_MS;
  const limit = input?.limit ?? 16;
  const cutoff = new Date(nowMs - graceMs).toISOString();

  const { data, error } = await db
    .from("external_research_runs")
    .select("*")
    .in("status", [...WORKER_ACTIVE_STATUSES])
    .or(`worker_lock_until.is.null,worker_lock_until.lt.${cutoff}`)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const candidates = ((data ?? []) as ExternalResearchRunRow[]).filter((run) =>
    isAbandonedResearchRun(run, nowMs, graceMs),
  );
  const recovered: ExternalResearchRunRow[] = [];

  for (const run of candidates) {
    const patch = abandonedRunTerminalPatch(run, new Date(nowMs));
    // Only transition while still non-terminal and lease still expired — never under a live owner.
    let query = db
      .from("external_research_runs")
      .update(patch)
      .eq("id", run.id)
      .eq("workspace_id", run.workspace_id)
      .eq("status", run.status)
      .neq("status", "cancelled");
    if (run.worker_lock_until) {
      query = query.or(
        `worker_lock_until.is.null,worker_lock_until.lt.${new Date(nowMs).toISOString()}`,
      );
    }
    const { data: updated, error: updateError } = await query.select("*").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) continue;

    const finalized = updated as ExternalResearchRunRow;
    recovered.push(finalized);
    // Free the global execution slot if it still points at the abandoned run.
    await db
      .from("research_execution_slot")
      .update({ run_id: null, owner: null, lease_until: null })
      .eq("id", true)
      .eq("run_id", run.id);
    await db.from("external_research_events").insert({
      workspace_id: run.workspace_id,
      research_run_id: run.id,
      event_type: "run_abandoned",
      payload: {
        code: EXECUTION_ABANDONED_CODE,
        previousStatus: run.status,
        previousWorkerId: run.worker_id,
        previousLockUntil: run.worker_lock_until,
      },
      actor_user_id: null,
    });
  }

  return { recovered, examined: candidates.length };
}
