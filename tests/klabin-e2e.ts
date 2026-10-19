/**
 * Generic-company research smoke: Klabin is NOT in the catalog seed.
 * Mirrors the member UI path: unresolved → confirm with website → research.
 *
 * npm run test:klabin-e2e
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isIntelligenceGenerationConfigured } from "../src/server/ai/config";
import { checkLanguageModelProviderHealth } from "../src/server/ai/language-model-health";
import { DEMO_MEMBER_EMAIL } from "../src/server/constants";
import { getExternalResearchProviderName, getTavilyApiKey } from "../src/server/external-research/config";
import { resolveCompanyEntity } from "../src/server/external-research/entity";
import {
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

async function main(): Promise<void> {
  console.log("KLABIN E2E — generic company (not catalog-seeded)");
  const preview = resolveCompanyEntity({ query: "Klabin", country: "BR" });
  if (preview.kind === "resolved") {
    console.error("FAIL: Klabin unexpectedly auto-resolved; generic path broken.");
    process.exit(1);
  }
  console.log(`preview_kind=${preview.kind}`);

  if (!getTavilyApiKey() || getExternalResearchProviderName() !== "tavily") {
    console.error("Tavily is not configured.");
    process.exit(2);
  }
  if (!isIntelligenceGenerationConfigured()) {
    console.error("Local model is not configured.");
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

  // Ensure we do not reuse a pre-seeded Klabin — create via research only.
  const { data: prior } = await db
    .from("companies")
    .select("id,slug,primary_domain")
    .eq("workspace_id", workspace.id)
    .ilike("display_name", "%klabin%")
    .is("archived_at", null);
  console.log(`prior_klabin_rows=${(prior ?? []).length}`);

  const startedAt = Date.now();
  let run = await startExternalCompanyResearch({
    workspaceId: workspace.id,
    userId: member.id,
    query: "Klabin",
    country: "BR",
    selectedDomain: "klabin.com.br",
    confirmUnresolved: true,
  });
  console.log(`run_id=${run.id}`);

  const phaseTimings: Array<{ status: ExternalResearchStatus; ms: number }> = [];
  let current: ExternalResearchRunRow = run;
  let phaseStarted = Date.now();
  let previousStatus = current.status;
  let lastProgressAt = Date.now();
  let lastStatus = current.status;

  while (!TERMINAL.has(current.status) && current.status !== "needs_user_resolution") {
    if (Date.now() - startedAt > TEST_CEILING_MS) {
      console.error("TEST_CEILING reached.");
      break;
    }
    if (Date.now() - lastProgressAt > STALL_MS) {
      console.error("STALLED.");
      break;
    }
    current = await tickExternalCompanyResearch(workspace.id, run.id);
    if (current.status !== lastStatus) {
      lastStatus = current.status;
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

  const companyId = current.resolved_company_id;
  if (!companyId) {
    console.error(
      JSON.stringify(
        {
          status: current.status,
          failureCode: current.failure_code,
          failureReason: current.failure_reason,
          runId: current.id,
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

  if (!company) throw new Error("Company row missing.");
  if (/natura|vale|embraer|suzano/i.test(`${company.display_name} ${company.slug} ${company.primary_domain}`)) {
    console.error("FAIL: unknown company silently mapped to a known seed.");
    process.exit(1);
  }
  if (company.primary_domain && company.primary_domain !== "klabin.com.br") {
    console.error(`WARN: unexpected domain ${company.primary_domain}`);
  }

  const { count: signalCount } = await db
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");
  const { count: claimCount } = current.analysis_id
    ? await db.from("claims").select("id", { count: "exact", head: true }).eq("analysis_id", current.analysis_id)
    : { count: 0 };

  const outcome = deriveCompanyResearchOutcome({
    signalCount: signalCount ?? 0,
    activeClaimCount: claimCount ?? 0,
    failureCode: current.failure_code,
    runStatus: current.status,
  });

  console.log(
    JSON.stringify(
      {
        ok: TERMINAL.has(current.status) && current.status !== "failed",
        companyId: company.id,
        companySlug: company.slug,
        companyName: company.display_name,
        domain: company.primary_domain,
        runId: current.id,
        status: current.status,
        outcome,
        signalCount: signalCount ?? 0,
        claimCount: claimCount ?? 0,
        phaseTimings: phaseTimings.map((row) => ({ status: row.status, seconds: Math.round(row.ms / 1000) })),
        totalSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      null,
      2,
    ),
  );

  if (current.status === "failed") process.exit(1);
  if (!TERMINAL.has(current.status)) process.exit(2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
