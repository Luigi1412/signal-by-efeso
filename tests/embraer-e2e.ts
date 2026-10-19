/**
 * Gate N — real Embraer positive-company research via Tavily + Ollama.
 * Does not seed signals/claims. Does not relax validators.
 * Does not print secrets.
 *
 * npm run test:embraer-e2e
 * Resume: npm run test:embraer-e2e -- --run-id=<uuid-prefix> --resume
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
import { deriveCompanyResearchOutcome } from "../src/server/product/research-outcome";
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
  return JSON.stringify({
    status: run.status,
    heartbeat: run.resolution_payload.heartbeat_at ?? null,
    models: (models ?? []).map((row) => `${row.id}:${row.status}`),
    cands: (cands ?? []).map((row) => `${row.id}:${row.status}`),
    claims: claims ?? 0,
    signals: signals ?? 0,
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  console.log("EMBRAER E2E (Gate N) — starting", args.resume ? `resume ${args.runIdPrefix}` : "new run");
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
    run = await resumeExternalResearch(workspace.id, found.id, member.id);
    console.log(`resumed_status=${run.status}`);
    // If still completed with no pending work, report and exit the tick loop below.
  } else {
    run = await startExternalCompanyResearch({
      workspaceId: workspace.id,
      userId: member.id,
      query: "Embraer S.A.",
      country: "BR",
      industry: "Aerospace & Defense",
      selectedDomain: "embraer.com",
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
      console.error("TEST_CEILING reached.");
      break;
    }
    if (Date.now() - lastProgressAt > STALL_MS) {
      harnessOutcome = "TEST_TIMEOUT";
      console.error("STALLED: no progress for 10 minutes.");
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
    console.error(
      JSON.stringify(
        {
          harnessOutcome,
          status: current.status,
          failureCode: current.failure_code,
          failureReason: current.failure_reason,
          runId: current.id,
          phaseTimings: phaseTimings.map((row) => ({ status: row.status, seconds: Math.round(row.ms / 1000) })),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const { data: company } = await db
    .from("companies")
    .select("id,slug,display_name,primary_domain,industry,primary_country_code")
    .eq("id", companyId)
    .maybeSingle();

  const { data: sources } = await db
    .from("external_source_candidates")
    .select("id,status,url,title,publisher,snapshot_id,source_quality,source_type,source_tier")
    .eq("research_run_id", run.id);
  const fetched = (sources ?? []).filter((row) => row.status === "fetched" || Boolean(row.snapshot_id));
  const acceptedOrFetched = (sources ?? []).filter((row) => row.status === "accepted" || row.status === "fetched");
  const primaryRetained = acceptedOrFetched.filter(
    (row) => row.source_quality === "primary" || row.source_quality === "authoritative_secondary",
  );

  const { data: claims } = await db
    .from("claims")
    .select("id,statement,claim_type,verification_status,created_at")
    .eq("company_id", companyId)
    .eq("analysis_id", analysisId)
    .eq("claim_status", "active")
    .order("created_at", { ascending: true });
  const claimIds = (claims ?? []).map((row) => row.id);
  const { data: evidence } =
    claimIds.length > 0 ? await db.from("claim_evidence").select("id,claim_id,evidence_fragment_id").in("claim_id", claimIds) : { data: [] };
  const { data: activeSignals } = await db
    .from("signals")
    .select("id,title,summary,status,signal_type,importance,metadata,created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const { data: signalLinks } =
    (activeSignals?.length ?? 0) > 0
      ? await db
          .from("signal_claims")
          .select("signal_id,claim_id")
          .in(
            "signal_id",
            (activeSignals ?? []).map((row) => row.id),
          )
      : { data: [] };
  const { data: intelligence } = await db
    .from("account_intelligence")
    .select("id,headline,executive_summary,status,created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(3);
  const { data: fits } = await db
    .from("efeso_fits")
    .select("id,fit_level,fit_reason_summary,status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(5);
  const { data: opportunities } = await db
    .from("opportunities")
    .select("id,title,summary,status,relevance_level,metadata")
    .eq("company_id", companyId)
    .eq("status", "active")
    .limit(5);
  const { data: actions } = await db
    .from("recommended_actions")
    .select("id,title,action_type,status,rationale")
    .eq("company_id", companyId)
    .in("status", ["active", "suggested", "pending"])
    .limit(5);
  const { data: events } = await db
    .from("external_research_events")
    .select("event_type,payload,created_at")
    .eq("research_run_id", run.id)
    .order("created_at", { ascending: true });

  const insufficientSignal =
    Boolean(current.resolution_payload.insufficient_evidence_for_signal) ||
    (events ?? []).some(
      (row) => row.event_type === "pipeline_note" && (row.payload as { code?: string }).code === "INSUFFICIENT_EVIDENCE_FOR_SIGNAL",
    );

  const outcome = deriveCompanyResearchOutcome({
    signalCount: activeSignals?.length ?? 0,
    activeClaimCount: claims?.length ?? 0,
    failureCode: current.failure_code,
    runStatus: current.status,
    insufficientEvidenceForSignal: insufficientSignal,
  });

  const isDemoCompany = false; // research-created companies have no demo_seed origin
  const gateN = {
    companyNotDemo: !isDemoCompany && company?.slug !== "vale" && company?.slug !== "natura" && company?.slug !== "raizen",
    realSources: (sources?.length ?? 0) > 0,
    primaryOrAuthoritativeRetained: primaryRetained.length >= 1,
    provenance: (evidence?.length ?? 0) > 0,
    verifiedFacts: (claims?.length ?? 0) >= 1,
    notTechnicalError: current.status === "completed" || current.status === "partial",
    signalFound: (activeSignals?.length ?? 0) >= 1 && outcome === "signal_found",
    signalEvidenceLinked: (signalLinks?.length ?? 0) > 0,
  };

  const report = {
    harnessOutcome,
    gateN,
    outcome,
    status: current.status,
    failureCode: current.failure_code,
    failureReason: current.failure_reason,
    runId: current.id,
    company,
    analysisId,
    wallSeconds: Math.round(totalMs / 1000),
    phaseTimings: phaseTimings.map((row) => ({ status: row.status, seconds: Math.round(row.ms / 1000) })),
    sourcesFound: sources?.length ?? 0,
    sourcesRetained: acceptedOrFetched.length,
    sourcesFetched: fetched.length,
    primaryRetained: primaryRetained.map((row) => ({
      url: row.url,
      title: row.title,
      publisher: row.publisher,
      quality: row.source_quality,
      type: row.source_type,
    })),
    claims: (claims ?? []).map((row) => ({
      id: row.id,
      statement: row.statement,
      type: row.claim_type,
      verification: row.verification_status,
    })),
    evidenceRows: evidence?.length ?? 0,
    signals: (activeSignals ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.signal_type,
      importance: row.importance,
      summary: row.summary,
      claimLinks: (signalLinks ?? []).filter((link) => link.signal_id === row.id).map((link) => link.claim_id),
    })),
    intelligence: intelligence?.[0]?.headline ?? null,
    fits: (fits ?? []).map((row) => ({ level: row.fit_level, reason: row.fit_reason_summary })),
    opportunities: (opportunities ?? []).map((row) => ({
      title: row.title,
      relevance: row.relevance_level,
      summary: row.summary,
    })),
    actions: (actions ?? []).map((row) => ({ type: row.action_type, title: row.title })),
    insufficientSignal,
  };

  console.log(JSON.stringify(report, null, 2));

  const positive =
    harnessOutcome === "OK" &&
    gateN.companyNotDemo &&
    gateN.realSources &&
    gateN.primaryOrAuthoritativeRetained &&
    gateN.provenance &&
    gateN.verifiedFacts &&
    gateN.notTechnicalError &&
    gateN.signalFound &&
    gateN.signalEvidenceLinked;

  if (!positive) {
    const failedGates = Object.entries(gateN)
      .filter(([, ok]) => !ok)
      .map(([key]) => key);
    console.error(`EMBRAER E2E: GATE N NOT PASSED — ${failedGates.join(", ") || harnessOutcome}`);
    process.exit(1);
  }
  console.log(`EMBRAER E2E: GATE N PASSED in ${Math.round(totalMs / 1000)}s`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error("EMBRAER E2E: FAILED", message);
  process.exit(1);
});
