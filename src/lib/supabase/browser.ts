import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabaseFetch } from "./fetch";

/** Browser client — public anon key only. Never receives the service role. */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are not set.");
  }
  return createBrowserClient<Database>(url, anonKey, {
    global: { fetch: supabaseFetch },
  });
}
