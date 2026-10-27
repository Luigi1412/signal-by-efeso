import { spawn } from "node:child_process";
if (process.env.NODE_ENV === "production") {
  console.error("PREVIEW LOCAL is unavailable when NODE_ENV=production.");
  process.exit(1);
}
const port = Number(process.env.SIGNAL_PREVIEW_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid SIGNAL_PREVIEW_PORT");
const env = {
  ...process.env, NODE_ENV: "development", SIGNAL_LOCAL_PREVIEW: "1", DEMO_MODE: "false", DEMO_AUTH_MODE: "false",
  SIGNAL_ALLOW_MOCK_FALLBACK: "false", EXTERNAL_RESEARCH_ENABLED: "false", RESEARCH_WORKER_ENABLED: "false", CONTROLLED_EXTRACTION_ENABLED: "false",
  NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "", DATABASE_URL: "", TAVILY_API_KEY: "", OPENAI_API_KEY: "",
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`, NEXT_TELEMETRY_DISABLED: "1",
};
console.log(`PREVIEW LOCAL — fixtures only; no authentication, database, worker or model connection.\nOpen http://127.0.0.1:${port}/preview/companies`);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("error", () => { console.error("Unable to start the local preview."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
