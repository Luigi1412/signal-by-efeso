import { randomUUID } from "node:crypto";
import { createPipelineAdminClient } from "@/lib/supabase/pipeline-admin";
import { getResearchRun, insertResearchEvent } from "./persistence";
import { researchRuntime } from "./runtime";
import type { ExternalResearchRunRow } from "./types";

async function leaseRpc(name: string, runId: string, owner: string): Promise<unknown> {
  const db = createPipelineAdminClient() as unknown as {
    rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await db.rpc(name, { p_run_id: runId, p_owner: owner });
  if (error) throw error;
  return data;
}

/** Every entry point, including CLI regression runners, acquires the same DB lease. */
export async function executeOwnedPhase(
  workspaceId: string, runId: string, phase: () => Promise<ExternalResearchRunRow>,
): Promise<ExternalResearchRunRow> {
  const existing = await getResearchRun(workspaceId, runId);
  if (!existing) throw new Error("RUN_NOT_FOUND");
  const owner = randomUUID();
  const claimed = await leaseRpc("claim_research_execution", runId, owner);
  if (!Array.isArray(claimed) || claimed.length === 0) return existing;
  const controller = new AbortController();
  const counters: Record<string, number> = {};
  const started = performance.now();
  const cpu = process.cpuUsage();
  let peakRss = process.memoryUsage().rss;
  let renewing: Promise<void> | undefined;
  const assertOwned = async () => {
    controller.signal.throwIfAborted();
    const row = await getResearchRun(workspaceId, runId);
    if (!row || row.worker_id !== owner || row.status === "cancelled" ||
      !row.worker_lock_until || Date.parse(row.worker_lock_until) <= Date.now()) {
      controller.abort(new Error("RESEARCH_OWNERSHIP_LOST"));
      controller.signal.throwIfAborted();
    }
  };
  const renew = async () => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    try {
      if (await leaseRpc("renew_research_execution", runId, owner) !== true) {
        controller.abort(new Error("RESEARCH_OWNERSHIP_LOST"));
      }
    } catch { controller.abort(new Error("RESEARCH_LEASE_UNAVAILABLE")); }
  };
  const heartbeat = setInterval(() => {
    if (!renewing) renewing = renew().finally(() => { renewing = undefined; });
  }, 3000);
  const timeout = setTimeout(() => controller.abort(new Error("RESEARCH_PHASE_TIMEOUT")),
    Math.max(10_000, Number(process.env.RESEARCH_PHASE_TIMEOUT_MS) || 15 * 60_000));
  try {
    return await researchRuntime.run({ runId, owner, signal: controller.signal, assertOwned, counters, memo: new Map() }, phase);
  } catch (error) {
    // Cancellation/lease loss must never resurrect a cancelled run.
    const latest = await getResearchRun(workspaceId, runId);
    if (latest?.status === "cancelled" || latest?.worker_id !== owner) return latest ?? existing;
    if (controller.signal.aborted && latest?.worker_id === owner) {
      const db = createPipelineAdminClient();
      const {error:failure} = await db.from("external_research_runs").update({status:"failed",failure_code:"PIPELINE_VALIDATION_FAILED",failure_reason:"A etapa excedeu o prazo ou perdeu a autorização de execução. A pesquisa pode ser retomada.",completed_at:new Date().toISOString()}).eq("id",runId).eq("worker_id",owner).neq("status","cancelled");
      if(failure) throw failure;
    }
    throw error;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    await renewing;
    const usedCpu = process.cpuUsage(cpu);
    try {
      await insertResearchEvent({ workspaceId, researchRunId: runId, eventType: "phase_timing", payload: {
        phase: existing.status, ms: Math.round(performance.now() - started), ...counters,
        cpuUserMs: usedCpu.user / 1000, cpuSystemMs: usedCpu.system / 1000,
        processRssBytes: process.memoryUsage().rss, peakProcessRssBytes: Math.max(peakRss, process.memoryUsage().rss),
      } });
    } finally { await leaseRpc("release_research_execution", runId, owner); }
  }
}
