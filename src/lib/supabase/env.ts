import "server-only";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Mock fallback is development/demo only.
 * Production must never silently substitute synthetic data for a healthy backend.
 */
export function allowMockFallback(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isDemoMode() === false) return false;
  return process.env.SIGNAL_ALLOW_MOCK_FALLBACK !== "false";
}

/**
 * Explicit product demo switch. Production must set DEMO_MODE=false.
 * Falls back to DEMO_AUTH_MODE for backwards compatibility in local setups.
 */
export function isDemoMode(): boolean {
  const explicit = process.env.DEMO_MODE?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEMO_AUTH_MODE === "true";
}

/** Product demo badge/footer — only when DEMO_MODE is explicitly true (never via auth fallback). */
export function isExplicitDemoContent(): boolean {
  return process.env.DEMO_MODE?.trim().toLowerCase() === "true";
}

export function isDemoAuthMode(): boolean {
  return isDemoMode() && process.env.DEMO_AUTH_MODE === "true";
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return key;
}

export function getDemoAuthPassword(): string {
  const password = process.env.DEMO_AUTH_PASSWORD;
  if (!password) throw new Error("DEMO_AUTH_PASSWORD is not set.");
  return password;
}
