import { extractEmailDomain, isAllowedCorporateEmail } from "./email-domains";
import { isAdminRole, type WorkspaceRole } from "./roles";

export type AccessDecision =
  | { kind: "unauthenticated" }
  | { kind: "config_missing" }
  | { kind: "invalid_email" }
  | { kind: "domain_denied"; emailDomain: string | null }
  | { kind: "needs_provision"; email: string; emailDomain: string }
  | {
      kind: "authorized";
      email: string;
      emailDomain: string;
      role: WorkspaceRole;
      isAdmin: boolean;
    };

export function decideAccess(input: {
  authenticated: boolean;
  email: string | null | undefined;
  allowedDomains: readonly string[];
  membershipRole: string | null;
}): AccessDecision {
  if (!input.authenticated) return { kind: "unauthenticated" };
  if (input.allowedDomains.length === 0) return { kind: "config_missing" };

  const email = input.email?.trim() ?? "";
  if (!email) return { kind: "invalid_email" };

  const emailDomain = extractEmailDomain(email);
  if (!emailDomain || !isAllowedCorporateEmail(email, input.allowedDomains)) {
    return { kind: "domain_denied", emailDomain };
  }

  if (!input.membershipRole) {
    return { kind: "needs_provision", email: email.trim().toLowerCase(), emailDomain };
  }

  return {
    kind: "authorized",
    email: email.trim().toLowerCase(),
    emailDomain,
    role: input.membershipRole as WorkspaceRole,
    isAdmin: isAdminRole(input.membershipRole),
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
