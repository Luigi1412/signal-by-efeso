import assert from "node:assert/strict";
import test from "node:test";
import { canAccessAdminLabs, decideAccess, isAdminPath, isPublicPath } from "./decisions";

const allowed = ["efeso.com"];

test("no auth is denied", () => {
  const decision = decideAccess({
    authenticated: false,
    email: "user@efeso.com",
    allowedDomains: allowed,
    membershipRole: "member",
  });
  assert.equal(decision.kind, "unauthenticated");
});

test("auth + allowed domain + membership is authorized", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "demo.member@efeso.com",
    allowedDomains: allowed,
    membershipRole: "member",
  });
  assert.equal(decision.kind, "authorized");
  if (decision.kind === "authorized") {
    assert.equal(decision.isAdmin, false);
    assert.equal(decision.role, "member");
  }
});

test("auth + allowed domain + no membership needs provision", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "demo.member@efeso.com",
    allowedDomains: allowed,
    membershipRole: null,
  });
  assert.equal(decision.kind, "needs_provision");
});

test("auth + blocked domain is denied and is not admin", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "user@gmail.com",
    allowedDomains: allowed,
    membershipRole: "admin",
  });
  assert.equal(decision.kind, "domain_denied");
  assert.equal(canAccessAdminLabs(decision), false);
});

test("empty config fails closed", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "user@efeso.com",
    allowedDomains: [],
    membershipRole: "admin",
  });
  assert.equal(decision.kind, "config_missing");
});

test("member cannot access admin labs", () => {
  const member = decideAccess({
    authenticated: true,
    email: "demo.member@efeso.com",
    allowedDomains: allowed,
    membershipRole: "member",
  });
  const admin = decideAccess({
    authenticated: true,
    email: "demo.admin@efeso.com",
    allowedDomains: allowed,
    membershipRole: "admin",
  });
  assert.equal(canAccessAdminLabs(member), false);
  assert.equal(canAccessAdminLabs(admin), true);
});

test("public and admin path helpers", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/access-restricted"), true);
  assert.equal(isPublicPath("/knowledge/efeso"), false);
  assert.equal(isPublicPath("/companies/natura"), false);
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/extraction-lab"), true);
  assert.equal(isAdminPath("/admin/signal-lab"), true);
  assert.equal(isAdminPath("/knowledge/efeso"), false);
});
