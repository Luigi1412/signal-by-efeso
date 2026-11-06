import assert from "node:assert/strict";
import test from "node:test";
import {
  authCallbackDecision,
  authCallbackFailureRecord,
  callbackRedirectUrl,
  classifyMagicLinkFailure,
  magicLinkFailureMessage,
  magicLinkFailureRecord,
  sanitizeAuthMessage,
} from "./magic-link-diagnostics";

const fixedAt = new Date("2026-10-28T15:20:00.000Z");

test("rate limit keeps its own message and a safe server record", () => {
  const error = {
    name: "AuthApiError",
    status: 429,
    code: "over_email_send_rate_limit",
    message: "email rate limit exceeded",
  };
  assert.equal(classifyMagicLinkFailure(error), "rate_limit");
  assert.match(magicLinkFailureMessage(error), /temporariamente limitado/);
  assert.doesNotMatch(magicLinkFailureMessage(error), /Não foi possível enviar/);
  const record = magicLinkFailureRecord(error, fixedAt);
  assert.deepEqual(record, {
    event: "auth.magic_link_failed",
    at: "2026-10-28T15:20:00.000Z",
    httpStatus: 429,
    errorCode: "over_email_send_rate_limit",
    errorName: "AuthApiError",
    message: "email rate limit exceeded",
  });
});

test("unauthorized, mailer and unexpected failures stay distinct", () => {
  assert.equal(classifyMagicLinkFailure({ code: "signup_disabled", message: "Signups not allowed for this instance" }), "unauthorized");
  assert.match(magicLinkFailureMessage({ status: 400, code: "user_banned", message: "User is banned" }), /não está autorizado/);
  assert.equal(classifyMagicLinkFailure({ status: 500, message: "Error sending magic link email" }), "email_provider");
  assert.match(magicLinkFailureMessage({ message: "smtp timeout" }), /provedor de e-mail/);
  const unexpected = magicLinkFailureMessage({ status: 500, code: "unexpected_failure", message: "database unavailable" });
  assert.match(unexpected, /Código: unexpected_failure/);
  assert.equal(magicLinkFailureMessage({ message: "something else" }), "Não foi possível enviar o link de acesso.");
});

test("diagnostic records drop links, tokens and secrets", () => {
  const record = magicLinkFailureRecord({
    name: "AuthApiError",
    status: 500,
    code: "unexpected_failure",
    message: "failed https://example.test/auth/v1/verify?token=abc&code=secret sb_secret_abcdefghijklmnopqrstuvwxyz eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature",
  }, fixedAt);
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes("https://"), false);
  assert.equal(serialized.includes("sb_secret_"), false);
  assert.equal(serialized.includes("eyJ"), false);
  assert.equal(serialized.includes("token="), false);
  assert.equal(String(record.message ?? "").includes("[url]"), true);
  assert.equal(String(record.message ?? "").includes("[redacted]"), true);
  assert.equal(sanitizeAuthMessage("line\none"), "line one");
});

test("callback errors do not continue to companies", () => {
  const expired = new URLSearchParams("error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  assert.deepEqual(authCallbackDecision(expired), { kind: "provider_error", path: "/login?link=expired" });
  const other = new URLSearchParams("error=server_error&error_code=unexpected_failure&error_description=temporary");
  assert.deepEqual(authCallbackDecision(other), { kind: "provider_error", path: "/login?link=rejected" });
  const both = new URLSearchParams("error=access_denied&error_code=otp_expired&code=should-not-exchange");
  assert.equal(authCallbackDecision(both).kind, "provider_error");
  assert.equal(authCallbackDecision(new URLSearchParams()).kind, "missing_code");
  const exchange = authCallbackDecision(new URLSearchParams("code=auth-code&next=/companies"));
  assert.equal(exchange.kind, "exchange");
  if (exchange.kind === "exchange") assert.equal(exchange.destination, "/companies");
});

test("callback log keeps only safe provider fields", () => {
  const params = new URLSearchParams("error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired+https://evil.test/token/abcdefghijklmnopqrstuvwxyz0123456789&code=secret-code");
  const record = authCallbackFailureRecord(params, fixedAt);
  const serialized = JSON.stringify(record);
  assert.equal(record.error, "access_denied");
  assert.equal(record.errorCode, "otp_expired");
  assert.equal(serialized.includes("secret-code"), false);
  assert.equal(serialized.includes("https://"), false);
});

test("callback redirects stay on the configured loopback host", () => {
  assert.equal(
    callbackRedirectUrl("/login?link=expired", "http://localhost:3000", "http://127.0.0.1:3000"),
    "http://127.0.0.1:3000/login?link=expired",
  );
  assert.equal(
    callbackRedirectUrl("/companies", "http://127.0.0.1:3000", "not a url"),
    "http://127.0.0.1:3000/companies",
  );
});
