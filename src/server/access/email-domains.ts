/**
 * Corporate email domain allowlist. Server-side only.
 * Match is the full domain after "@" — never a suffix/prefix of the host.
 */

export function parseAllowedEmailDomains(raw: string | undefined | null): string[] {
  if (raw == null) return [];
  const domains = raw
    .split(",")
    .map((part) => normalizeDomain(part))
    .filter((part) => part.length > 0);
  return [...new Set(domains)];
}

export function getAllowedEmailDomains(): string[] {
  return parseAllowedEmailDomains(process.env.ALLOWED_EMAIL_DOMAINS);
}

export function extractEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const at = normalized.indexOf("@");
  if (at < 1) return null;
  if (normalized.indexOf("@", at + 1) !== -1) return null;
  const local = normalized.slice(0, at);
  const domain = normalizeDomain(normalized.slice(at + 1));
  if (!local || !domain) return null;
  if (local.includes(" ") || domain.includes(" ")) return null;
  if (!domain.includes(".")) return null;
  return domain;
}

export function isAllowedCorporateEmail(
  email: string,
  allowedDomains: readonly string[] = getAllowedEmailDomains(),
): boolean {
  if (allowedDomains.length === 0) return false;
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  const allowed = new Set(allowedDomains.map((item) => normalizeDomain(item)).filter(Boolean));
  return allowed.has(domain);
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}
