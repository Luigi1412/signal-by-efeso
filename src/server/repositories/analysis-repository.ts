import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisRecord } from "@/types/database";

export async function getRecentAnalyses(workspaceId: string, limit = 20): Promise<AnalysisRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAnalysisById(workspaceId: string, analysisId: string): Promise<AnalysisRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", analysisId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAnalysisByIdForPipeline(workspaceId: string, analysisId: string): Promise<AnalysisRecord | null> {
  const { createPipelineAdminClient } = await import("@/lib/supabase/pipeline-admin");
  const { data, error } = await createPipelineAdminClient()
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", analysisId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as AnalysisRecord | null;
}

export async function getLatestAnalysisForCompany(
  workspaceId: string,
  companyId: string,
): Promise<AnalysisRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDraftAnalysis(input: {
  workspaceId: string;
  companyId: string;
  createdByUserId: string;
  title: string;
  researchFocus: string;
  primaryCountryCode: string;
  additionalInstructions?: string;
}): Promise<AnalysisRecord> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      workspace_id: input.workspaceId,
      company_id: input.companyId,
      created_by_user_id: input.createdByUserId,
      title: input.title,
      status: "draft",
      analysis_type: "general_opportunity_scan",
      research_focus: input.researchFocus,
      primary_country_code: input.primaryCountryCode,
      additional_instructions: input.additionalInstructions || null,
      ui_locale: "pt-BR",
      report_locale: "pt-BR",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnalysisStatus(
  workspaceId: string,
  analysisId: string,
  status: AnalysisRecord["status"],
): Promise<AnalysisRecord> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .update({ status })
    .eq("workspace_id", workspaceId)
    .eq("id", analysisId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
