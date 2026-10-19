import "server-only";

/**
 * Fail-closed production configuration gate.
 * Does not print secret values.
 */

const REQUIRED_PRODUCTION = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ALLOWED_EMAIL_DOMAINS",
  "TAVILY_API_KEY",
  "LANGUAGE_MODEL_PROVIDER",
  "OLLAMA_BASE_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function assertProductionEnv(): { ok: true } | { ok: false; missing: string[] } {
  if (process.env.NODE_ENV !== "production") return { ok: true };

  const missing: string[] = [];
  for (const key of REQUIRED_PRODUCTION) {
    if (!process.env[key]?.trim()) missing.push(key);
  }

  if ((process.env.DEMO_MODE ?? "false").trim().toLowerCase() !== "false") {
    missing.push("DEMO_MODE must be false");
  }
  if ((process.env.DEMO_AUTH_MODE ?? "false").trim().toLowerCase() === "true") {
    missing.push("DEMO_AUTH_MODE must not be true in production");
  }
  if ((process.env.LANGUAGE_MODEL_PROVIDER ?? "").trim().toLowerCase() !== "ollama") {
    // OpenAI optional; production default is ollama
    if ((process.env.LANGUAGE_MODEL_PROVIDER ?? "").trim().toLowerCase() !== "openai") {
      missing.push("LANGUAGE_MODEL_PROVIDER");
    }
  }
  if ((process.env.RESEARCH_WORKER_ENABLED ?? "true").trim().toLowerCase() === "false") {
    missing.push("RESEARCH_WORKER_ENABLED should be true in production (or run worker separately with explicit ops acceptance)");
  }

  // DATABASE_URL is optional when Supabase URL is present
  if (!process.env.DATABASE_URL?.trim() && !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push("DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

export function listProductionEnvStatus(): Array<{ key: string; present: boolean }> {
  return REQUIRED_PRODUCTION.map((key) => ({ key, present: Boolean(process.env[key]?.trim()) }));
}
