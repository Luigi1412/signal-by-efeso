import "server-only";
import { researchRuntime } from "@/server/external-research/runtime";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import { supabaseFetch } from "./fetch";

/**
 * Untyped service-role client for Sprint 3 pipeline persistence only.
 * Callers must already have verified the authenticated workspace membership
 * and that Analysis / ResearchRun / SourceSnapshot belong to that workspace.
 */
export function createPipelineAdminClient() {
  const runtime = researchRuntime.getStore();
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    global: { fetch: runtime ? (input, init) => supabaseFetch(input, { ...init, signal: AbortSignal.any([runtime.signal, ...(init?.signal ? [init.signal] : [])]) }) : supabaseFetch, headers: runtime ? {"x-signal-run":runtime.runId,"x-signal-owner":runtime.owner} : {} },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
