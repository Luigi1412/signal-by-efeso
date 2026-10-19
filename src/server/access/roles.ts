export const WORKSPACE_ROLES = ["member", "consultant", "manager", "partner", "admin"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const DEFAULT_PROVISIONED_ROLE: WorkspaceRole = "member";

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

export function isAdminRole(role: string): boolean {
  return role === "admin";
}
