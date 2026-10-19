import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EFESO_BRAZIL_SLUG } from "@/server/constants";
import { isWorkspaceRole, type WorkspaceRole } from "./roles";

export type AuthorizedEmailStatus = "invited" | "active" | "disabled";

export interface AuthorizedEmailRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: AuthorizedEmailStatus;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAuthorizedEmail(email: string): Promise<AuthorizedEmailRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
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
    .from("workspace_authorized_emails")
    .select("id, workspace_id, email, role, status")
    .eq("workspace_id", workspace.id)
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isWorkspaceRole(data.role)) return null;
  if (data.status !== "invited" && data.status !== "active" && data.status !== "disabled") return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    email: data.email,
    role: data.role,
    status: data.status,
  };
}

export async function upsertAuthorizedEmail(input: {
  email: string;
  role: WorkspaceRole;
  status?: AuthorizedEmailStatus;
}): Promise<AuthorizedEmailRecord> {
  const admin = createAdminSupabaseClient();
  const normalized = normalizeEmail(input.email);
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", EFESO_BRAZIL_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) throw new Error("EFESO workspace is not available.");

  const status = input.status ?? "invited";
  const { data, error } = await admin
    .from("workspace_authorized_emails")
    .upsert(
      {
        workspace_id: workspace.id,
        email: normalized,
        role: input.role,
        status,
      },
      { onConflict: "workspace_id,email" },
    )
    .select("id, workspace_id, email, role, status")
    .single();
  if (error) throw error;
  if (!isWorkspaceRole(data.role)) throw new Error("Invalid authorized email role.");
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    email: data.email,
    role: data.role,
    status: data.status as AuthorizedEmailStatus,
  };
}

export async function markAuthorizedEmailActive(input: {
  email: string;
  userId: string;
}): Promise<AuthorizedEmailRecord | null> {
  const existing = await getAuthorizedEmail(input.email);
  if (!existing || existing.status === "disabled") return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_authorized_emails")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      activated_user_id: input.userId,
    })
    .eq("id", existing.id)
    .select("id, workspace_id, email, role, status")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    email: data.email,
    role: data.role as WorkspaceRole,
    status: data.status as AuthorizedEmailStatus,
  };
}
