import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { recordAccessAudit } from "./audit";
import { decideAccess } from "./decisions";
import { getAllowedEmailDomains } from "./email-domains";
import { getActiveEfesoMembership, provisionEfesoMembership } from "./membership";
import { isAdminRole, type WorkspaceRole } from "./roles";

export class AccessDeniedError extends Error {
  constructor(public readonly reason: "unauthenticated" | "domain" | "forbidden" | "config") {
    super("ACCESS_DENIED");
    this.name = "AccessDeniedError";
  }
}

export interface EfesoAccess {
  userId: string;
  email: string;
  emailDomain: string;
  workspaceId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
}

async function loadAccess(): Promise<EfesoAccess | { redirectTo: string } | { deny: AccessDeniedError["reason"] }> {
  let user = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    user = error ? null : data.user;
  } catch {
    return { redirectTo: `${routes.login}?expired=1` };
  }
  const allowedDomains = getAllowedEmailDomains();
  const membership = user ? await getActiveEfesoMembership(user.id) : null;

  const decision = decideAccess({
    authenticated: Boolean(user),
    email: user?.email ?? null,
    allowedDomains,
    membershipRole: membership?.role ?? null,
  });

  if (decision.kind === "unauthenticated") {
    return { redirectTo: routes.login };
  }
  if (decision.kind === "config_missing") {
    console.error(
      "ALLOWED_EMAIL_DOMAINS is not configured. Protected access is denied (fail closed).",
    );
    await recordAccessAudit({
      eventType: "authorization_failure",
      outcome: "denied",
      actorUserId: user?.id ?? null,
    });
    return { redirectTo: `${routes.accessRestricted}?reason=config` };
  }
  if (decision.kind === "invalid_email" || decision.kind === "domain_denied") {
    await recordAccessAudit({
      eventType: "invalid_domain",
      outcome: "denied",
      actorUserId: user?.id ?? null,
      emailDomain: decision.kind === "domain_denied" ? decision.emailDomain : null,
    });
    return { redirectTo: routes.accessRestricted };
  }

  let role = decision.kind === "authorized" ? decision.role : null;
  let workspaceId = membership?.workspaceId ?? null;
  if (decision.kind === "needs_provision" && user) {
    try {
      const metadataName =
        typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
      const provisioned = await provisionEfesoMembership({
        userId: user.id,
        reason: "corporate_domain",
        fullName: metadataName || user.email?.split("@")[0]?.replace(/\./g, " "),
      });
      role = provisioned.role;
      workspaceId = provisioned.workspaceId;
    } catch {
      await recordAccessAudit({
        eventType: "authorization_failure",
        outcome: "denied",
        actorUserId: user.id,
        emailDomain: decision.emailDomain,
      });
      return { redirectTo: `${routes.accessRestricted}?reason=provision` };
    }
  }

  if (!user || !role || !workspaceId || !decision.emailDomain) {
    await recordAccessAudit({
      eventType: "authorization_failure",
      outcome: "denied",
      actorUserId: user?.id ?? null,
    });
    return { redirectTo: routes.accessRestricted };
  }

  return {
    userId: user.id,
    email: user.email?.trim().toLowerCase() ?? decision.email,
    emailDomain: decision.emailDomain,
    workspaceId,
    role,
    isAdmin: isAdminRole(role),
  };
}

export const requireEfesoAccess = cache(async (): Promise<EfesoAccess> => {
  const result = await loadAccess();
  if ("redirectTo" in result) redirect(result.redirectTo);
  if ("deny" in result) throw new AccessDeniedError(result.deny);
  return result;
});

export async function requireEfesoAdmin(): Promise<EfesoAccess> {
  const access = await requireEfesoAccess();
  if (!access.isAdmin) {
    await recordAccessAudit({
      eventType: "admin_route_denied",
      outcome: "denied",
      actorUserId: access.userId,
      emailDomain: access.emailDomain,
      workspaceId: access.workspaceId,
    });
    redirect(`${routes.accessRestricted}?reason=admin`);
  }
  return access;
}

export async function assertEfesoAccess(): Promise<EfesoAccess> {
  const result = await loadAccess();
  if ("redirectTo" in result) {
    if (result.redirectTo.split("?")[0] === routes.login) throw new AccessDeniedError("unauthenticated");
    if (result.redirectTo.includes("reason=admin")) throw new AccessDeniedError("forbidden");
    if (result.redirectTo.includes("reason=config")) throw new AccessDeniedError("config");
    throw new AccessDeniedError("domain");
  }
  if ("deny" in result) throw new AccessDeniedError(result.deny);
  return result;
}

export async function assertEfesoAdmin(): Promise<EfesoAccess> {
  const access = await assertEfesoAccess();
  if (!access.isAdmin) {
    await recordAccessAudit({
      eventType: "admin_route_denied",
      outcome: "denied",
      actorUserId: access.userId,
      emailDomain: access.emailDomain,
      workspaceId: access.workspaceId,
    });
    throw new AccessDeniedError("forbidden");
  }
  return access;
}

export function publicAccessErrorMessage(error: unknown): string {
  if (error instanceof AccessDeniedError) {
    if (error.reason === "unauthenticated") return "Entre com a sua conta EFESO para continuar.";
    if (error.reason === "forbidden") return "Você não tem permissão para esta ação.";
    return "Acesso restrito a usuários autorizados da EFESO.";
  }
  return "Não foi possível autorizar esta ação.";
}
