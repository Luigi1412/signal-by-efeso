import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AccessAuditEventType =
  | "invalid_domain"
  | "membership_provisioned"
  | "admin_route_denied"
  | "authorization_failure"
  | "email_not_authorized"
  | "first_access_activated";

export async function recordAccessAudit(input: {
  eventType: AccessAuditEventType;
  outcome: "denied" | "provisioned" | "allowed";
  actorUserId?: string | null;
  emailDomain?: string | null;
  workspaceId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    await admin.from("access_audit_events").insert({
      event_type: input.eventType,
      outcome: input.outcome,
      actor_user_id: input.actorUserId ?? null,
      email_domain: input.emailDomain ?? null,
      workspace_id: input.workspaceId ?? null,
    });
  } catch {
    // Audit must never block the access decision path.
  }
}
