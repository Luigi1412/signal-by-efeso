/**
 * Minimal resilient research worker (Signal v1.0).
 * Reuses tickExternalCompanyResearch — does not create a new engine.
 *
 * Usage: npm run worker:research
 * Env: RESEARCH_WORKER_POLL_MS (default 5000), RESEARCH_WORKER_ID (optional)
 */
import { randomUUID } from "node:crypto";
import { tickExternalCompanyResearch } from "../src/server/external-research/orchestrator";
import {
  claimResearchRunForWorker,
  heartbeatResearchRunWorker,
  isTerminalStatus,
  listEligibleResearchRunsForWorker,
  releaseResearchRunWorkerLock,
} from "../src/server/external-research/persistence";

const workerId = process.env.RESEARCH_WORKER_ID?.trim() || `worker-${randomUUID().slice(0, 8)}`;
const pollMs = Number(process.env.RESEARCH_WORKER_POLL_MS ?? "5000") || 5000;
const enabled = (process.env.RESEARCH_WORKER_ENABLED ?? "true").trim().toLowerCase() !== "false";

let stopping = false;

function log(message: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[research-worker ${workerId}] ${message}${payload}`);
}

async function tickOnce(): Promise<boolean> {
  const eligible = await listEligibleResearchRunsForWorker(4);
  if (eligible.length === 0) return false;

  for (const candidate of eligible) {
    if (stopping) break;
    const claimed = await claimResearchRunForWorker(candidate.id, workerId);
    if (!claimed) continue;

    log("claimed", { runId: claimed.id, status: claimed.status, workspaceId: claimed.workspace_id });
    try {
      await heartbeatResearchRunWorker(claimed.id, workerId);
      const updated = await tickExternalCompanyResearch(claimed.workspace_id, claimed.id);
      log("tick", { runId: updated.id, status: updated.status });
      if (isTerminalStatus(updated.status) || updated.status === "needs_user_resolution") {
        await releaseResearchRunWorkerLock(claimed.id, workerId);
      } else {
        await heartbeatResearchRunWorker(claimed.id, workerId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      log("tick_error", { runId: claimed.id, message });
      await releaseResearchRunWorkerLock(claimed.id, workerId);
    }
    return true;
  }
  return false;
}

async function main() {
  if (!enabled) {
    log("disabled via RESEARCH_WORKER_ENABLED=false");
    process.exit(0);
  }
  log("started", { pollMs });

  process.on("SIGINT", () => {
    stopping = true;
    log("stopping");
  });
  process.on("SIGTERM", () => {
    stopping = true;
    log("stopping");
  });

  while (!stopping) {
    try {
      const worked = await tickOnce();
      await new Promise((resolve) => setTimeout(resolve, worked ? 250 : pollMs));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      log("loop_error", { message });
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
  log("stopped");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
