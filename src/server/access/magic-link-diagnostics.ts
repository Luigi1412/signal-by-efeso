import { ui } from "@/i18n";
import { routes } from "@/lib/routes";
import { safeLocalRedirect } from "./redirect";

const SAFE_TOKEN = /^[a-z0-9_]{1,80}$/i;

export type MagicLinkFailureKind = "rate_limit" | "unauthorized" | "email_provider" | "unexpected";

export interface AuthErrorDetails {
  httpStatus: number | null;
  errorCode: string | null;
  errorName: string | null;
  message: string;
}

export type AuthCallbackDecision =
  | { kind: "provider_error"; path: string }
  | { kind: "missing_code"; path: string }
  | { kind: "exchange"; code: string; destination: string };

export function readAuthError(error: unknown): AuthErrorDetails {
  if (!error || typeof error !== "object") {
    return { httpStatus: null, errorCode: null, errorName: null, message: "" };
  }
  const value = error as { status?: unknown; code?: unknown; error_code?: unknown; name?: unknown; message?: unknown };
  const code = firstSafeToken(value.code, value.error_code);
  return {
    httpStatus: typeof value.status === "number" && Number.isFinite(value.status) ? value.status : null,
    errorCode: code,
    errorName: typeof value.name === "string" && SAFE_TOKEN.test(value.name) ? value.name : null,
    message: typeof value.message === "string" ? value.message : "",
  };
}

export function sanitizeAuthMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b(?:eyJ|sb_secret_|sb_publishable_)[A-Za-z0-9_\-.]+\b/g, "[redacted]")
    .replace(/\b[A-Za-z0-9_\-]{32,}\b/g, "[redacted]")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 240);
}

export function classifyMagicLinkFailure(error: unknown): MagicLinkFailureKind {
  const details = readAuthError(error);
  const haystack = `${details.errorCode ?? ""} ${details.message}`.toLowerCase();
  if (details.httpStatus === 429 || haystack.includes("rate limit") || haystack.includes("over_request_rate_limit")) {
    return "rate_limit";
  }
  if (
    details.errorCode === "user_not_found" ||
    details.errorCode === "signup_disabled" ||
    details.errorCode === "user_banned" ||
    details.errorCode === "email_address_invalid" ||
    /not authorized|user not found|signups not allowed|user is banned/i.test(details.message)
  ) {
    return "unauthorized";
  }
  if (
    details.errorCode === "email_send_failed" ||
    /error sending|smtp|mailer|email provider|unable to send/i.test(details.message)
  ) {
    return "email_provider";
  }
  return "unexpected";
}

export function magicLinkFailureMessage(error: unknown): string {
  const kind = classifyMagicLinkFailure(error);
  if (kind === "rate_limit") return ui.login.magicLinkRateLimit;
  if (kind === "unauthorized") return ui.login.magicLinkUnauthorized;
  if (kind === "email_provider") return ui.login.magicLinkProvider;
  const code = readAuthError(error).errorCode;
  return code ? `${ui.login.magicLinkUnexpected} Código: ${code}.` : ui.login.magicLinkUnexpected;
}

export function magicLinkFailureRecord(error: unknown, at = new Date()): Record<string, string | number | null> {
  const details = readAuthError(error);
  return {
    event: "auth.magic_link_failed",
    at: at.toISOString(),
    httpStatus: details.httpStatus,
    errorCode: details.errorCode,
    errorName: details.errorName,
    message: sanitizeAuthMessage(details.message),
  };
}

export function logMagicLinkFailure(error: unknown, at = new Date()): void {
  console.error(JSON.stringify(magicLinkFailureRecord(error, at)));
}

/** Provider errors never continue into the app. A missing code does not mean success. */
export function authCallbackDecision(params: URLSearchParams): AuthCallbackDecision {
  const error = params.get("error");
  const errorCode = params.get("error_code");
  const description = params.get("error_description");
  if (error || errorCode || description) {
    const expired = errorCode === "otp_expired" || /invalid or has expired|otp expired/i.test(description ?? "");
    return { kind: "provider_error", path: `${routes.login}?link=${expired ? "expired" : "rejected"}` };
  }
  const code = params.get("code")?.trim();
  if (!code) return { kind: "missing_code", path: `${routes.login}?link=missing` };
  return { kind: "exchange", code, destination: safeLocalRedirect(params.get("next"), routes.companies) };
}

export function authCallbackFailureRecord(params: URLSearchParams, at = new Date()): Record<string, string | null> {
  return {
    event: "auth.callback_failed",
    at: at.toISOString(),
    error: firstSafeToken(params.get("error")),
    errorCode: firstSafeToken(params.get("error_code")),
    description: sanitizeAuthMessage(params.get("error_description") ?? ""),
  };
}

export function logAuthCallbackFailure(params: URLSearchParams, at = new Date()): void {
  console.error(JSON.stringify(authCallbackFailureRecord(params, at)));
}

/** Keep the browser on the configured app host. localhost and 127.0.0.1 do not share cookies. */
export function callbackRedirectUrl(path: string, requestOrigin: string, configuredAppUrl: string | null | undefined): string {
  let origin = requestOrigin;
  if (configuredAppUrl?.trim()) {
    try {
      const configured = new URL(configuredAppUrl);
      if (configured.protocol === "http:" || configured.protocol === "https:") origin = configured.origin;
    } catch {
      origin = requestOrigin;
    }
  }
  const target = new URL(path, origin);
  return target.toString();
}

function firstSafeToken(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && SAFE_TOKEN.test(value)) return value;
  }
  return null;
}
