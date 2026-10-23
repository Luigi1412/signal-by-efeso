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

export async function upsertProfile(input: {
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

/** @deprecated Prefer upsertProfile — kept for demo bootstrap compatibility. */
export async function upsertDemoProfile(input: {
  userId: string;
  fullName: string;
  jobTitle: string;
}): Promise<void> {
  return upsertProfile(input);
}

/**
 * Activate or create membership for a pre-authorized email (first access).
 * Does not grant access without an allowlist entry — caller must verify authorization.
 */
export async function activateAuthorizedMembership(input: {
  userId: string;
  role: WorkspaceRole;
  fullName?: string;
}): Promise<WorkspaceMembership> {
  const admin = createAdminSupabaseClient() as unknown as {
    rpc: (fn: string, args: Record<string, string>) => Promise<{ data: Array<{ id: string; workspace_id: string; user_id: string; role: string; status: string }> | null; error: unknown }>;
  };
  const { data, error } = await admin.rpc("activate_allowlisted_member", {
    p_user_id: input.userId, p_full_name: input.fullName?.trim() || "EFESO Member",
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row || !isWorkspaceRole(row.role)) throw new Error("MEMBERSHIP_ACTIVATION_FAILED");
  await recordAccessAudit({ eventType: "first_access_activated", outcome: "provisioned", actorUserId: input.userId, workspaceId: row.workspace_id });
  return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, role: row.role, status: row.status };
}

/**
 * @deprecated Domain-only provisioning is no longer used for members.
 * Kept for demo_seed path compatibility via activateAuthorizedMembership / demo bootstrap.
 */
export async function provisionEfesoMembership(input: {
  userId: string;
  reason: "corporate_domain" | "demo_seed" | "email_allowlist";
  role?: WorkspaceRole;
  fullName?: string;
}): Promise<WorkspaceMembership> {
  return activateAuthorizedMembership({
    userId: input.userId,
    role: input.role ?? DEFAULT_PROVISIONED_ROLE,
    fullName: input.fullName,
  });
}
