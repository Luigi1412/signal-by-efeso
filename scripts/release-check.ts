import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SIGNAL_PRODUCT_VERSION } from "../src/lib/product-version";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(message: string) {
  failed = true;
  console.error(`FAIL  ${message}`);
}

function ok(message: string) {
  console.log(`OK    ${message}`);
}

function run(label: string, command: string, args: string[]) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    fail(`${label} (exit ${result.status ?? "unknown"})`);
    return false;
  }
  ok(label);
  return true;
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version?: string };
if (pkg.version === "1.0.0" && SIGNAL_PRODUCT_VERSION === "1.0.0") ok("version 1.0.0");
else fail(`version expected 1.0.0 (package=${pkg.version}, const=${SIGNAL_PRODUCT_VERSION})`);

const demoMode = (process.env.DEMO_MODE ?? "").trim().toLowerCase();
const nodeEnv = process.env.NODE_ENV ?? "development";
if (nodeEnv === "production") {
  if (demoMode === "false") ok("production DEMO_MODE=false");
  else fail("production requires DEMO_MODE=false");
} else {
  ok(`non-production DEMO_MODE=${demoMode || "(unset)"}`);
}

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ALLOWED_EMAIL_DOMAINS",
];

for (const key of requiredEnv) {
  if (process.env[key]?.trim()) ok(`env ${key} present`);
  else fail(`env ${key} missing`);
}

const lmProvider = (process.env.LANGUAGE_MODEL_PROVIDER ?? "ollama").trim().toLowerCase();
if (lmProvider === "ollama") ok("LANGUAGE_MODEL_PROVIDER=ollama");
else if (lmProvider === "openai") ok("LANGUAGE_MODEL_PROVIDER=openai");
else console.log("SKIP  LANGUAGE_MODEL_PROVIDER is not ollama/openai");

if (process.env.OPENAI_API_KEY?.trim()) {
  console.log("SKIP  OPENAI_API_KEY present — optional / not funded");
} else {
  console.log("SKIP  OPENAI optional / not funded");
}

const researchProvider = (process.env.EXTERNAL_RESEARCH_PROVIDER ?? "none").trim().toLowerCase();
if (researchProvider === "tavily") {
  if (process.env.TAVILY_API_KEY?.trim()) ok("EXTERNAL_RESEARCH_PROVIDER=tavily");
  else console.log("SKIP  TAVILY_API_KEY missing — REAL EXTERNAL RESEARCH: PENDING CONFIGURATION");
} else if (researchProvider === "http") ok("EXTERNAL_RESEARCH_PROVIDER=http");
else console.log("SKIP  EXTERNAL_RESEARCH_PROVIDER is not a real provider");

const workerEnabled = (process.env.RESEARCH_WORKER_ENABLED ?? "true").trim().toLowerCase() !== "false";
if (workerEnabled) ok("research worker enabled (npm run worker:research)");
else console.log("SKIP  RESEARCH_WORKER_ENABLED=false");

const packPath = resolve(root, "data/efeso-knowledge/efeso-knowledge-pack.v1.json");
if (existsSync(packPath)) {
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as { objects?: unknown[] };
  const count = Array.isArray(pack.objects) ? pack.objects.length : 0;
  if (count > 0) ok(`knowledge pack present (${count} objects)`);
  else fail("knowledge pack has zero objects");
} else {
  fail("knowledge pack missing");
}

const migration042 = resolve(root, "supabase/migrations/042_research_worker_lock.sql");
if (existsSync(migration042)) ok("migrations include worker lock");
else fail("042_research_worker_lock.sql missing");

const privateTracked = spawnSync("git", ["ls-files", "private/efeso-knowledge-sources"], { cwd: root, encoding: "utf8" });
if ((privateTracked.stdout ?? "").trim().length === 0) ok("private EFESO sources not tracked");
else fail("private EFESO sources are tracked in git");

const envLocalTracked = spawnSync("git", ["ls-files", ".env.local"], { cwd: root, encoding: "utf8" });
if ((envLocalTracked.stdout ?? "").trim().length === 0) ok(".env.local not tracked");
else fail(".env.local is tracked");

const home = readFileSync(resolve(root, "src/app/(app)/page.tsx"), "utf8");
if (home.includes('from "@/data"') || home.includes("homeMetrics")) {
  fail("home page still imports mock data");
} else {
  ok("home page is persist-first (no silent mock metrics)");
}

const sidebar = readFileSync(resolve(root, "src/components/layout/app-sidebar.tsx"), "utf8");
if (sidebar.includes("routes.radar") || sidebar.includes("ui.nav.radar")) {
  fail("Radar still in primary member navigation");
} else {
  ok("primary navigation excludes Radar");
}

const workerScript = resolve(root, "scripts/research-worker.ts");
if (existsSync(workerScript)) ok("research worker script present");
else fail("research worker script missing");

run("TypeScript", "npx", ["tsc", "--noEmit"]);
run("ESLint", "npx", ["eslint", "src", "scripts", "--max-warnings=0"]);
run("critical unit tests", "npx", [
  "tsx",
  "--test",
  "src/server/access/*.test.ts",
  "src/server/relationship/*.test.ts",
  "src/server/recommended-actions/*.test.ts",
  "src/server/external-research/*.test.ts",
  "src/server/product/*.test.ts",
  "src/server/knowledge/governance.test.ts",
]);

if (existsSync(resolve(root, "supabase/tests/demo_consistency.sql"))) {
  run("demo consistency", "npx", ["supabase", "test", "db", "--local", "supabase/tests/demo_consistency.sql"]);
  run("product integrity", "npx", ["supabase", "test", "db", "--local", "supabase/tests/product_integrity.sql"]);
}

run("Next.js build", "npm", ["run", "build"]);

if (failed) {
  console.error("\nrelease:check failed");
  process.exit(1);
}

console.log("\nrelease:check passed");
process.exit(0);
