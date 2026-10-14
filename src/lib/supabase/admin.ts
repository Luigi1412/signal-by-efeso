import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import { supabaseFetch } from "./fetch";

/**
 * Service-role client. Server-only. Bypasses RLS.
 * Use exclusively for demo bootstrap / provisioning — never in client components.
 */
export function createAdminSupabaseClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    global: { fetch: supabaseFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
