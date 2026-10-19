/**
 * Real Suzano end-to-end: Tavily + local Ollama through Actions.
 * Does not print secrets. Does not call paid OpenAI.
 *
 * Resume: npm run test:suzano-e2e -- --run-id=8424685e --resume
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isIntelligenceGenerationConfigured } from "../src/server/ai/config";
import { checkLanguageModelProviderHealth } from "../src/server/ai/language-model-health";
import { DEMO_MEMBER_EMAIL } from "../src/server/constants";
import { getExternalResearchProviderName, getTavilyApiKey } from "../src/server/external-research/config";
import {
  resumeExternalResearch,
  startExternalCompanyResearch,
  tickExternalCompanyResearch,
} from "../src/server/external-research/orchestrator";
import { isTerminalStatus } from "../src/server/external-research/persistence";
import type { ExternalResearchRunRow, ExternalResearchStatus } from "../src/server/external-research/types";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function admin() {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TERMINAL = new Set(["completed", "partial", "failed", "cancelled"]);
const STALL_MS = 10 * 60 * 1000;
const TEST_CEILING_MS = 90 * 60 * 1000;

function parseArgs(argv: string[]): { runIdPrefix: string | null; resume: boolean } {
  let runIdPrefix: string | null = null;
  let resume = false;
  for (const arg of argv.slice(2)) {
    if (arg === "--resume") resume = true;
    else if (arg.startsWith("--run-id=")) runIdPrefix = arg.slice("--run-id=".length).trim();
  }
  return { runIdPrefix, resume };
}

async function progressKey(db: ReturnType<typeof admin>, run: ExternalResearchRunRow): Promise<string> {
  const analysisId = run.analysis_id;
  const { data: models } = analysisId
    ? await db
        .from("model_runs")
        .select("id,status,created_at")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };
  const { data: cands } = analysisId
    ? await db.from("claim_candidates").select("id,status").eq("analysis_id", analysisId)
    : { data: [] };
  const { count: claims } = analysisId
    ? await db.from("claims").select("id", { count: "exact", head: true }).eq("analysis_id", analysisId)
    : { count: 0 };
  const { count: signals } = run.resolved_company_id
    ? await db
        .from("signals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", run.resolved_company_id)
        .eq("status", "active")
    : { count: 0 };
  const { count: intel } = run.resolved_company_id
    ? await db
        .from("account_intelligence")
        .select("id", { count: "exact", head: true })
        .eq("company_id", run.resolved_company_id)
        .eq("status", "active")
    : { count: 0 };
  return JSON.stringify({
    status: run.status,
    heartbeat: run.resolution_payload.heartbeat_at ?? null,
    models: (models ?? []).map((row) => `${row.id}:${row.status}`),
    cands: (cands ?? []).map((row) => `${row.id}:${row.status}`),
    claims: claims ?? 0,
    signals: signals ?? 0,
    intel: intel ?? 0,
  });
}

function secondsSince(startIso: string, atIso: string | null): number | null {
  if (!atIso) return null;
  return Math.round((new Date(atIso).getTime() - new Date(startIso).getTime()) / 1000);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  console.log("SUZANO E2E — starting", args.resume ? `resume ${args.runIdPrefix}` : "new run");
  if (!getTavilyApiKey() || getExternalResearchProviderName() !== "tavily") {
    console.error("Tavily is not configured. Cannot run real-company E2E.");
    process.exit(2);
  }
  if (!isIntelligenceGenerationConfigured()) {
    console.error("Local model is not configured. Cannot run real-company E2E.");
    process.exit(2);
  }
  const health = await checkLanguageModelProviderHealth({ includeSmoke: false });
  if (!health.reachable || !health.modelInstalled) {
    console.error(`Ollama unavailable: ${health.detail}`);
    process.exit(2);
  }

  const db = admin();
  const { data: workspace, error: workspaceError } = await db.from("workspaces").select("id").eq("slug", "efeso-brazil").maybeSingle();
  if (workspaceError || !workspace) throw new Error("Workspace efeso-brazil missing.");
  const { data: users, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;
  const member = users.users.find((user) => user.email?.toLowerCase() === DEMO_MEMBER_EMAIL);
  if (!member) throw new Error("demo.member@efeso.com missing.");

  const startedAt = Date.now();
  let run: ExternalResearchRunRow;
  if (args.resume) {
    if (!args.runIdPrefix) throw new Error("--resume requires --run-id=");
    const { data: matches } = await db
      .from("external_research_runs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const prefix = args.runIdPrefix.toLowerCase();
    const found = ((matches ?? []) as ExternalResearchRunRow[]).find(
      (row) => row.id.toLowerCase() === prefix || row.id.toLowerCase().startsWith(prefix),
    );
    if (!found) throw new Error(`Run ${args.runIdPrefix} not found.`);
    console.log(`existing_run=${found.id} status=${found.status}`);
    run =
      found.status === "completed"
        ? found
        : await resumeExternalResearch(workspace.id, found.id, member.id);
    console.log(`resumed_status=${run.status}`);
  } else {
    run = await startExternalCompanyResearch({
      workspaceId: workspace.id,
      userId: member.id,
      query: "Suzano S.A.",
    });
    console.log(`run_id=${run.id}`);
  }

  const phaseTimings: Array<{ status: ExternalResearchStatus; ms: number }> = [];
  let current = run;
  let phaseStarted = Date.now();
  let previousStatus = current.status;
  let lastProgressAt = Date.now();
  let lastKey = await progressKey(db, current);
  let harnessOutcome: "OK" | "TEST_TIMEOUT" | "PIPELINE_STILL_PROCESSING" | "PIPELINE_FAILED" = "OK";

  while (!TERMINAL.has(current.status) && current.status !== "needs_user_resolution") {
    if (Date.now() - startedAt > TEST_CEILING_MS) {
      harnessOutcome = "PIPELINE_STILL_PROCESSING";
      console.error("TEST_CEILING reached. This is the local harness ceiling, not a user HTTP timeout.");
      break;
    }
    if (Date.now() - lastProgressAt > STALL_MS) {
      harnessOutcome = "TEST_TIMEOUT";
      console.error("STALLED: no status/model-run/validation/count change for 10 minutes.");
      break;
    }
    current = await tickExternalCompanyResearch(workspace.id, run.id);
    const key = await progressKey(db, current);
    if (key !== lastKey) {
      lastKey = key;
      lastProgressAt = Date.now();
    }
    if (current.status !== previousStatus) {
      phaseTimings.push({ status: previousStatus, ms: Date.now() - phaseStarted });
      console.log(`phase ${previousStatus} → ${current.status} (${Math.round((Date.now() - phaseStarted) / 1000)}s)`);
      previousStatus = current.status;
      phaseStarted = Date.now();
    }
    if (isTerminalStatus(current.status) && current.status !== "needs_user_resolution") break;
  }
  if (previousStatus !== current.status || phaseTimings.length === 0) {
    phaseTimings.push({ status: previousStatus, ms: Date.now() - phaseStarted });
  }
  if (current.status === "failed") harnessOutcome = "PIPELINE_FAILED";
  else if (!TERMINAL.has(current.status) && harnessOutcome === "OK") harnessOutcome = "PIPELINE_STILL_PROCESSING";

  const totalMs = Date.now() - startedAt;
  const companyId = current.resolved_company_id;
  const analysisId = current.analysis_id;
  if (!companyId || !analysisId) {
    console.error(`Run ended without company/analysis. status=${current.status} code=${current.failure_code} harness=${harnessOutcome}`);
    process.exit(1);
  }

  const { data: sources } = await db
    .from("external_source_candidates")
    .select("id,status,url,title,publisher,snapshot_id,source_quality")
    .eq("research_run_id", run.id);
  const snapshotIds = [...new Set((sources ?? []).map((row) => row.snapshot_id).filter((id): id is string => Boolean(id)))];
  const { data: snapshots } =
    snapshotIds.length > 0
      ? await db.from("source_snapshots").select("id,title,normalized_text").in("id", snapshotIds)
      : { data: [] };
  const snapshotMarkers = (snapshots ?? []).map((row) => {
    const text = row.normalized_text ?? "";
    return {
      id: row.id,
      title: row.title,
      chars: text.length,
      hasEbitda: /ebitda/i.test(text),
      hasRevenue: /revenue|receita/i.test(text),
      hasCash: /cash|caixa/i.test(text),
      has13_3: /13[.,]3/.test(text),
      has6_1: /6[.,]1/.test(text),
      has4_1: /4[.,]1/.test(text),
    };
  });
  const fetched = (sources ?? []).filter((row) => row.status === "fetched" || Boolean(row.snapshot_id));
  const acceptedOrFetched = (sources ?? []).filter((row) => row.status === "accepted" || row.status === "fetched");

  const { data: candidates } = await db
    .from("claim_candidates")
    .select("id,status,proposed_statement,rejection_reason_code,rejection_reason_text,created_at,promoted_at")
    .eq("analysis_id", analysisId);
  const { data: claims } = await db
    .from("claims")
    .select("id,statement,created_at,origin_claim_candidate_id")
    .eq("company_id", companyId)
    .eq("analysis_id", analysisId)
    .eq("claim_status", "active")
    .order("created_at", { ascending: true });
  const { data: activeSignals } = await db
    .from("signals")
    .select("id,title,status,created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const { data: intelligence } = await db
    .from("account_intelligence")
    .select("id,headline,executive_summary,created_at,status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(3);
  const { data: fits } = await db
    .from("efeso_fits")
    .select("id,fit_level,fit_reason_summary,status,created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(5);
  const { data: opportunities } = await db
    .from("opportunities")
    .select("id,title,status,relevance_level")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(5);
  const { data: actions } = await db
    .from("recommended_actions")
    .select("id,title,action_type,status")
    .eq("company_id", companyId)
    .in("status", ["active", "suggested", "pending"])
    .limit(5);
  const claimIds = (claims ?? []).map((row) => row.id);
  const { data: evidence } =
    claimIds.length > 0
      ? await db.from("claim_evidence").select("id,claim_id").in("claim_id", claimIds)
      : { data: [] };
  const { data: modelRuns } = await db
    .from("model_runs")
    .select("id,task_type,status,latency_ms,created_at,completed_at,error_code,input_manifest")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  const { data: events } = await db
    .from("external_research_events")
    .select("event_type,payload,created_at")
    .eq("research_run_id", run.id)
    .order("created_at", { ascending: true });

  const extractionRuns = (modelRuns ?? []).filter((row) => row.task_type === "claim_extraction" && row.status === "completed");
  const semanticRuns = (modelRuns ?? []).filter((row) => row.task_type === "claim_semantic_validation");
  const batchRuns = semanticRuns.filter((row) => Boolean((row.input_manifest as { batch?: boolean } | null)?.batch));
  const fallbackRuns = semanticRuns.filter((row) => !Boolean((row.input_manifest as { batch?: boolean } | null)?.batch));
  const originCreated = current.created_at;
  const firstClaimAt = claims?.[0]?.created_at ?? null;
  const secondClaimAt = claims?.[1]?.created_at ?? null;
  const firstSignalAt = activeSignals?.[0]?.created_at ?? null;
  const firstIntelAt = intelligence?.[0]?.created_at ?? null;
  const firstUsefulAt = [firstSignalAt, firstIntelAt].filter(Boolean).sort()[0] ?? firstClaimAt;
  const batchReport = current.resolution_payload.semantic_batch as
    | { called?: boolean; zodOk?: boolean; fallbackReason?: string | null; batchMs?: number | null; fallbackCount?: number; fallbackMs?: number[] }
    | undefined;
  const insufficientSignal = Boolean(current.resolution_payload.insufficient_evidence_for_signal) ||
    (events ?? []).some((row) => row.event_type === "pipeline_note" && (row.payload as { code?: string }).code === "INSUFFICIENT_EVIDENCE_FOR_SIGNAL");
  const noOpportunity = Boolean(current.resolution_payload.no_supported_opportunity) ||
    (events ?? []).some((row) => (row.payload as { code?: string }).code === "NO_SUPPORTED_OPPORTUNITY");

  const fetchedCount = Math.max(fetched.length, acceptedOrFetched.filter((row) => row.status === "fetched").length);
  const claimsPromoted = claims?.length ?? 0;
  const signalsActive = activeSignals?.length ?? 0;
  const hasIntelligence = Boolean(intelligence && intelligence.length > 0);
  const hasFit = Boolean(fits && fits.length > 0 && fits.some((row) => Boolean(row.fit_reason_summary)));
  const hasOpportunity = Boolean(opportunities && opportunities.length > 0);
  const hasAction = Boolean(actions && actions.length > 0);
  const noActionJustified = (actions ?? []).some((row) => row.action_type === "no_action");
  const hasEvidence = Boolean(evidence && evidence.length > 0);

  const acceptance = {
    sources: fetchedCount >= 1 || acceptedOrFetched.length >= 1,
    claims: claimsPromoted >= 2,
    signals: signalsActive >= 1 || insufficientSignal,
    intelligence: hasIntelligence || insufficientSignal,
    fit: hasFit || insufficientSignal,
    opportunities: hasOpportunity || noOpportunity || insufficientSignal,
    actions: hasAction || noActionJustified || !hasOpportunity || insufficientSignal,
    evidence: hasEvidence,
    terminalOk: current.status === "completed" || current.status === "partial",
  };

  const timings = {
    extractionSeconds: extractionRuns.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0) / 1000,
    batchValidationSeconds: (batchReport?.batchMs ?? batchRuns.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0)) / 1000,
    fallbackValidationSeconds: (batchReport?.fallbackMs ?? fallbackRuns.map((row) => row.latency_ms ?? 0)).map((ms) =>
      typeof ms === "number" ? ms / 1000 : 0,
    ),
    firstClaimSeconds: secondsSince(originCreated, firstClaimAt),
    secondClaimSeconds: secondsSince(originCreated, secondClaimAt),
    firstSignalSeconds: secondsSince(originCreated, firstSignalAt),
    firstIntelligenceSeconds: secondsSince(originCreated, firstIntelAt),
    timeToFirstUsefulResultSeconds: secondsSince(originCreated, firstUsefulAt),
    resumeWallSeconds: Math.round(totalMs / 1000),
    totalFromRunStartSeconds: Math.round((Date.now() - new Date(originCreated).getTime()) / 1000),
  };

  console.log(
    JSON.stringify(
      {
        harnessOutcome,
        status: current.status,
        failureCode: current.failure_code,
        failureReason: current.failure_reason,
        resume: args.resume,
        runId: current.id,
        phaseTimings: phaseTimings.map((row) => ({ status: row.status, seconds: Math.round(row.ms / 1000) })),
        sourcesFound: sources?.length ?? 0,
        sourcesFetched: fetchedCount,
        snapshotMarkers,
        claimCandidates: (candidates ?? []).length,
        candidateStatuses: (candidates ?? []).map((row) => ({
          status: row.status,
          reason: row.rejection_reason_code,
          message: row.rejection_reason_text,
        })),
        claimsPromoted,
        claimStatements: (claims ?? []).map((row) => row.statement),
        signalsActive,
        accountIntelligence: intelligence?.[0]?.headline ?? null,
        fits: (fits ?? []).map((row) => ({ level: row.fit_level, reason: row.fit_reason_summary })),
        opportunities: (opportunities ?? []).map((row) => row.title),
        actions: (actions ?? []).map((row) => ({ type: row.action_type, title: row.title })),
        evidenceRows: evidence?.length ?? 0,
        semanticBatch: batchReport ?? null,
        insufficientSignal,
        noOpportunity,
        timings,
        acceptance,
      },
      null,
      2,
    ),
  );

  const passed =
    harnessOutcome === "OK" &&
    acceptance.terminalOk &&
    acceptance.sources &&
    acceptance.claims &&
    acceptance.signals &&
    acceptance.intelligence &&
    acceptance.fit &&
    acceptance.evidence &&
    (hasOpportunity || noOpportunity || insufficientSignal) &&
    (hasAction || noActionJustified || !hasOpportunity || insufficientSignal);

  if (!passed) {
    const reason =
      harnessOutcome === "TEST_TIMEOUT"
        ? "harness stalled (10 min without progress)"
        : harnessOutcome === "PIPELINE_STILL_PROCESSING"
          ? "pipeline still processing at local test ceiling"
          : harnessOutcome === "PIPELINE_FAILED"
            ? `pipeline failed (${current.failure_code ?? "unknown"})`
            : `acceptance gaps: ${Object.entries(acceptance)
                .filter(([, ok]) => !ok)
                .map(([key]) => key)
                .join(", ")}`;
    console.error(`SUZANO E2E: NOT PASSED — ${reason}`);
    process.exit(1);
  }
  console.log(`SUZANO E2E: PASSED in ${Math.round(totalMs / 1000)}s resume-wall / ${timings.totalFromRunStartSeconds}s from run start`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error("SUZANO E2E: FAILED", message);
  process.exit(1);
});
