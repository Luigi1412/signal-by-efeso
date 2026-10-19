import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EFESO_BRAZIL_SLUG } from "@/server/constants";
import { recordAccessAudit } from "./audit";
import { DEFAULT_PROVISIONED_ROLE, isWorkspaceRole, type WorkspaceRole } from "./roles";

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
}

export async function getActiveEfesoMembership(userId: string): Promise<WorkspaceMembership | null> {
  const admin = createAdminSupabaseClient();
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", EFESO_BRAZIL_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) return null;

  const { data, error } = await admin
    .from("workspace_memberships")
    .select("id, workspace_id, user_id, role, status")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data || !isWorkspaceRole(data.role)) return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role,
    status: data.status,
  };
}

export async function upsertDemoProfile(input: {
  userId: string;
  fullName: string;
  jobTitle: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: input.userId,
      full_name: input.fullName,
      job_title: input.jobTitle,
      preferred_locale: "pt-BR",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function provisionEfesoMembership(input: {
  userId: string;
  reason: "corporate_domain" | "demo_seed";
  role?: WorkspaceRole;
  fullName?: string;
}): Promise<WorkspaceMembership> {
  const admin = createAdminSupabaseClient();
  await upsertDemoProfile({
    userId: input.userId,
    fullName: input.fullName?.trim() || "EFESO Member",
    jobTitle: input.role === "admin" ? "Administrador" : "Consultor",
  });
  const existing = await getActiveEfesoMembership(input.userId);
  if (existing) return existing;

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", EFESO_BRAZIL_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) throw new Error("EFESO workspace is not available.");

  const role = input.role ?? DEFAULT_PROVISIONED_ROLE;
  const { data, error } = await admin
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.id,
      user_id: input.userId,
      role,
      status: "active",
      provisioned_reason: input.reason,
    })
    .select("id, workspace_id, user_id, role, status")
    .single();
  if (error) {
    const raced = await getActiveEfesoMembership(input.userId);
    if (raced) return raced;
    throw error;
  }

  await recordAccessAudit({
    eventType: "membership_provisioned",
    outcome: "provisioned",
    actorUserId: input.userId,
    workspaceId: workspace.id,
  });

  if (!isWorkspaceRole(data.role)) throw new Error("Provisioned membership has an invalid role.");
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role,
    status: data.status,
  };
}
