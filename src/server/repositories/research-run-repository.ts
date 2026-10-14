import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PIPELINE_VERSION, RESEARCH_POLICY_VERSION } from "@/server/constants";
import type { ResearchRunRecord } from "@/types/database";

export async function getResearchRun(workspaceId: string, runId: string): Promise<ResearchRunRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestRunForAnalysis(
  workspaceId: string,
  analysisId: string,
): Promise<ResearchRunRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createResearchRun(input: {
  workspaceId: string;
  analysisId: string;
  requestedByUserId: string;
  runType?: ResearchRunRecord["run_type"];
  status?: ResearchRunRecord["status"];
  currentStage?: string | null;
  progressPercent?: number;
  startedAt?: string | null;
}): Promise<ResearchRunRecord> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_runs")
    .insert({
      workspace_id: input.workspaceId,
      analysis_id: input.analysisId,
      requested_by_user_id: input.requestedByUserId,
      run_type: input.runType ?? "initial",
      status: input.status ?? "researching",
      current_stage: input.currentStage ?? "entity_resolution",
      progress_percent: input.progressPercent ?? 0,
      pipeline_version: PIPELINE_VERSION,
      research_policy_version: RESEARCH_POLICY_VERSION,
      started_at: input.startedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateResearchRunProgress(input: {
  workspaceId: string;
  runId: string;
  status: string;
  currentStage: string;
  progressPercent: number;
}): Promise<ResearchRunRecord> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_runs")
    .update({
      status: input.status,
      current_stage: input.currentStage,
      progress_percent: input.progressPercent,
    })
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.runId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function completeResearchRun(input: {
  workspaceId: string;
  runId: string;
}): Promise<ResearchRunRecord> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("research_runs")
    .update({
      status: "completed",
      current_stage: "completed",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("workspace_id", input.workspaceId)
    .eq("id", input.runId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
