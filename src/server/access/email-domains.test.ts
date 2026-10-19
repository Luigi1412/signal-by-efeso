import assert from "node:assert/strict";
import test from "node:test";
import { extractEmailDomain, isAllowedCorporateEmail, parseAllowedEmailDomains } from "./email-domains";

const allowed = parseAllowedEmailDomains("efeso.com");

test("user@efeso.com is allowed", () => {
  assert.equal(isAllowedCorporateEmail("user@efeso.com", allowed), true);
});

test("USER@EFESO.COM is allowed after normalization", () => {
  assert.equal(isAllowedCorporateEmail("USER@EFESO.COM", allowed), true);
});

test("trimmed user@efeso.com is allowed", () => {
  assert.equal(isAllowedCorporateEmail(" user@efeso.com ", allowed), true);
});

test("gmail is denied", () => {
  assert.equal(isAllowedCorporateEmail("user@gmail.com", allowed), false);
});

test("suffix attacker domain is denied", () => {
  assert.equal(isAllowedCorporateEmail("user@efeso.com.attacker.com", allowed), false);
});

test("efeso.com as local-part of gmail is denied", () => {
  assert.equal(isAllowedCorporateEmail("efeso.com@gmail.com", allowed), false);
});

test("invalid emails are denied", () => {
  assert.equal(isAllowedCorporateEmail("", allowed), false);
  assert.equal(isAllowedCorporateEmail("not-an-email", allowed), false);
  assert.equal(isAllowedCorporateEmail("user@", allowed), false);
  assert.equal(isAllowedCorporateEmail("@efeso.com", allowed), false);
  assert.equal(isAllowedCorporateEmail("user@@efeso.com", allowed), false);
  assert.equal(extractEmailDomain("user@@efeso.com"), null);
});

test("empty allowlist denies every address", () => {
  assert.equal(isAllowedCorporateEmail("user@efeso.com", []), false);
  assert.equal(parseAllowedEmailDomains("").length, 0);
  assert.equal(parseAllowedEmailDomains(undefined).length, 0);
});

test("comma-separated domains are accepted without prefix matching", () => {
  const domains = parseAllowedEmailDomains("efeso.com, outrodominiofuturo.com");
  assert.deepEqual(domains, ["efeso.com", "outrodominiofuturo.com"]);
  assert.equal(isAllowedCorporateEmail("a@outrodominiofuturo.com", domains), true);
  assert.equal(isAllowedCorporateEmail("a@outrodominiofuturo.com.evil", domains), false);
});
