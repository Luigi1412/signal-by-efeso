import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import { supabaseFetch } from "./fetch";

/**
 * Untyped service-role client for Sprint 3 pipeline persistence only.
 * Callers must already have verified the authenticated workspace membership
 * and that Analysis / ResearchRun / SourceSnapshot belong to that workspace.
 */
export function createPipelineAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    global: { fetch: supabaseFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
