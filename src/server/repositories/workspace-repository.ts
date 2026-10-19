import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EFESO_BRAZIL_SLUG } from "@/server/constants";
import type { WorkspaceRow } from "@/types/database";

export async function getCurrentWorkspace(): Promise<WorkspaceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", EFESO_BRAZIL_SLUG)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWorkspaceById(id: string): Promise<WorkspaceRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWorkspaceByIdForPipeline(id: string): Promise<WorkspaceRow | null> {
  const { createPipelineAdminClient } = await import("@/lib/supabase/pipeline-admin");
  const { data, error } = await createPipelineAdminClient().from("workspaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as WorkspaceRow | null;
}
