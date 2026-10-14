import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthState =
  | { kind: "user"; id: string }
  | { kind: "anonymous" }
  | { kind: "unavailable" };

async function isSupabaseReachable(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { kind: "unavailable" };
  if (!(await isSupabaseReachable())) return { kind: "unavailable" };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { kind: "anonymous" };
    return { kind: "user", id: data.user.id };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getAuthUserId(): Promise<string | null> {
  const state = await getAuthState();
  return state.kind === "user" ? state.id : null;
}

export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return userId;
}
