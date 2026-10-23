import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
/**
 * Minimal resilient research worker (Signal v1.0).
 * Reuses tickExternalCompanyResearch — does not create a new engine.
 *
 * Usage: npm run worker:research
 * Env: RESEARCH_WORKER_POLL_MS (default 5000), RESEARCH_WORKER_ID (optional)
 */
import { createPipelineAdminClient } from "../src/lib/supabase/pipeline-admin";
import { randomUUID } from "node:crypto";
import { tickExternalCompanyResearch } from "../src/server/external-research/orchestrator";
import {
  listEligibleResearchRunsForWorker,
} from "../src/server/external-research/persistence";

for (const path of [".env.local", ".env"]) if (existsSync(path)) loadEnvFile(path);

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
    const heartbeat = setInterval(() => {
      void createPipelineAdminClient().from("research_worker_heartbeats").upsert({worker_id:workerId,seen_at:new Date().toISOString()}).then(({error})=>{if(error)log("heartbeat_error");});
    },5000);
    try {
      const updated = await tickExternalCompanyResearch(candidate.workspace_id, candidate.id);
      log("tick", { runId: updated.id, status: updated.status });
    } catch (error) {
      log("tick_error", { runId: candidate.id, message: error instanceof Error ? error.message : "unknown" });
    } finally {clearInterval(heartbeat);}
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
      const {error} = await createPipelineAdminClient().from("research_worker_heartbeats").upsert({worker_id:workerId,seen_at:new Date().toISOString()});
      if(error) throw error;
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
