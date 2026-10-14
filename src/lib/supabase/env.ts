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
  return process.env.SIGNAL_ALLOW_MOCK_FALLBACK !== "false";
}

export function isDemoAuthMode(): boolean {
  return process.env.DEMO_AUTH_MODE === "true";
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
