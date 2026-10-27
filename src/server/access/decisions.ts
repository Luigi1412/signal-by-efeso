import { extractEmailDomain, isEligibleAccessEmail } from "./email-domains";
import { isAdminRole, type WorkspaceRole } from "./roles";
import type { AuthorizedEmailStatus } from "./authorized-emails";

export type AccessDecision =
  | { kind: "unauthenticated" }
  | { kind: "config_missing" }
  | { kind: "invalid_email" }
  | { kind: "domain_denied"; emailDomain: string | null }
  /** EFESO domain but email was never pre-authorized. */
  | { kind: "not_authorized"; email: string; emailDomain: string }
  | { kind: "disabled"; email: string; emailDomain: string }
  /** Pre-authorized (invited/active) but membership not yet active — first access. */
  | {
      kind: "needs_activation";
      email: string;
      emailDomain: string;
      role: WorkspaceRole;
      authorizationStatus: AuthorizedEmailStatus;
    }
  | {
      kind: "authorized";
      email: string;
      emailDomain: string;
      role: WorkspaceRole;
      isAdmin: boolean;
    };

export function decideAccess(input: {
  authenticated: boolean;
  emailConfirmed?: boolean;
  email: string | null | undefined;
  allowedDomains: readonly string[];
  membershipRole: string | null;
  /** null = email not on allowlist */
  authorization: { status: AuthorizedEmailStatus; role: WorkspaceRole; externalAccessApproved?: boolean } | null;
}): AccessDecision {
  if (!input.authenticated || input.emailConfirmed === false) return { kind: "unauthenticated" };
  if (input.allowedDomains.length === 0) return { kind: "config_missing" };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email) return { kind: "invalid_email" };

  const emailDomain = extractEmailDomain(email);
  if (!emailDomain || !isEligibleAccessEmail(email, input.allowedDomains, input.authorization?.externalAccessApproved)) {
    return { kind: "domain_denied", emailDomain };
  }

  if (!input.authorization) {
    return { kind: "not_authorized", email, emailDomain };
  }

  if (input.authorization.status === "disabled") {
    return { kind: "disabled", email, emailDomain };
  }

  if (input.membershipRole && input.authorization.status === "active" && input.membershipRole === input.authorization.role) {
    return {
      kind: "authorized",
      email,
      emailDomain,
      role: input.membershipRole as WorkspaceRole,
      isAdmin: isAdminRole(input.membershipRole),
    };
  }

  return {
    kind: "needs_activation",
    email,
    emailDomain,
    role: input.authorization.role,
    authorizationStatus: input.authorization.status,
  };
}

export function canAccessAdminLabs(decision: AccessDecision): boolean {
  return decision.kind === "authorized" && decision.isAdmin;
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/access-restricted" ||
    pathname.startsWith("/auth/")
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
