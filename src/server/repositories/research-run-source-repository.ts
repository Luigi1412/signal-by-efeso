import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ResearchRunSourceRow } from "@/types/database";

export async function findLink(input: {
  workspaceId: string;
  researchRunId: string;
  sourceId: string;
}): Promise<ResearchRunSourceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_run_sources")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("research_run_id", input.researchRunId)
    .eq("source_id", input.sourceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function linkSourceToResearchRun(input: {
  workspaceId: string;
  researchRunId: string;
  sourceId: string;
  researchWave: ResearchRunSourceRow["research_wave"];
  disposition?: ResearchRunSourceRow["disposition"];
  discoveryMethod?: ResearchRunSourceRow["discovery_method"];
  rankingScore?: number | null;
  discardReason?: string | null;
}): Promise<ResearchRunSourceRow> {
  const existing = await findLink(input);
  if (existing) return existing;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_run_sources")
    .insert({
      workspace_id: input.workspaceId,
      research_run_id: input.researchRunId,
      source_id: input.sourceId,
      research_wave: input.researchWave,
      disposition: input.disposition ?? "discovered",
      discovery_method: input.discoveryMethod ?? "manual",
      ranking_score: input.rankingScore ?? null,
      discard_reason: input.discardReason ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getResearchRunSourcesForSource(
  workspaceId: string,
  sourceId: string,
): Promise<ResearchRunSourceRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_run_sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("source_id", sourceId)
    .order("discovered_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
