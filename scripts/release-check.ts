import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

if (process.env.OPENAI_API_KEY?.trim()) console.log("SKIP  OPENAI_API_KEY present — OPENAI OPTIONAL PROVIDER: NOT FUNDED unless test:ai-live passes");
else console.log("SKIP  OPENAI optional / not funded");

const researchProvider = (process.env.EXTERNAL_RESEARCH_PROVIDER ?? "none").trim().toLowerCase();
if (researchProvider === "tavily") {
  if (process.env.TAVILY_API_KEY?.trim()) ok("EXTERNAL_RESEARCH_PROVIDER=tavily");
  else console.log("SKIP  EXTERNAL_RESEARCH_PROVIDER=tavily but TAVILY_API_KEY is missing — REAL EXTERNAL RESEARCH: PENDING CONFIGURATION");
} else if (researchProvider === "http") ok("EXTERNAL_RESEARCH_PROVIDER=http");
else console.log("SKIP  EXTERNAL_RESEARCH_PROVIDER is not a real provider — REAL EXTERNAL RESEARCH: PENDING CONFIGURATION");

const home = readFileSync(resolve(root, "src/app/(app)/page.tsx"), "utf8");
if (home.includes('from "@/data"') || home.includes("homeMetrics")) {
  fail("home page still imports mock data");
} else {
  ok("home page is persist-first (no silent mock metrics)");
}

run("TypeScript", "npx", ["tsc", "--noEmit"]);
run("ESLint", "npx", ["eslint", "src", "--max-warnings=0"]);
run("critical unit tests", "npx", [
  "tsx",
  "--test",
  "src/server/access/*.test.ts",
  "src/server/relationship/*.test.ts",
  "src/server/recommended-actions/*.test.ts",
  "src/server/external-research/*.test.ts",
]);

if (existsSync(resolve(root, "supabase/tests/demo_consistency.sql"))) {
  run("demo consistency", "npx", ["supabase", "test", "db", "--local", "supabase/tests/demo_consistency.sql"]);
  run("product integrity", "npx", ["supabase", "test", "db", "--local", "supabase/tests/product_integrity.sql"]);
}

if (failed) {
  console.error("\nrelease:check failed");
  process.exit(1);
}

console.log("\nrelease:check passed (lightweight equivalent of build: tsc + lint + critical tests)");
process.exit(0);
