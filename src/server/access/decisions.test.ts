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
    authorization: { status: "active", role: "member" },
  });
  assert.equal(decision.kind, "unauthenticated");
});

test("auth + allowed domain + allowlist + membership is authorized", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "demo.member@efeso.com",
    allowedDomains: allowed,
    membershipRole: "member",
    authorization: { status: "active", role: "member" },
  });
  assert.equal(decision.kind, "authorized");
  if (decision.kind === "authorized") {
    assert.equal(decision.isAdmin, false);
    assert.equal(decision.role, "member");
  }
});

test("auth + EFESO domain without allowlist is not_authorized", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "desconhecido@efeso.com",
    allowedDomains: allowed,
    membershipRole: null,
    authorization: null,
  });
  assert.equal(decision.kind, "not_authorized");
});

test("auth + allowlist invited without membership needs activation", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "maria@efeso.com",
    allowedDomains: allowed,
    membershipRole: null,
    authorization: { status: "invited", role: "member" },
  });
  assert.equal(decision.kind, "needs_activation");
  if (decision.kind === "needs_activation") {
    assert.equal(decision.role, "member");
    assert.equal(decision.authorizationStatus, "invited");
  }
});

test("disabled allowlist entry is denied", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "maria@efeso.com",
    allowedDomains: allowed,
    membershipRole: null,
    authorization: { status: "disabled", role: "member" },
  });
  assert.equal(decision.kind, "disabled");
});

test("auth + blocked domain is denied and is not admin", () => {
  const decision = decideAccess({
    authenticated: true,
    email: "user@gmail.com",
    allowedDomains: allowed,
    membershipRole: "admin",
    authorization: { status: "active", role: "admin" },
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
    authorization: { status: "active", role: "admin" },
  });
  assert.equal(decision.kind, "config_missing");
});

test("member cannot access admin labs", () => {
  const member = decideAccess({
    authenticated: true,
    email: "demo.member@efeso.com",
    allowedDomains: allowed,
    membershipRole: "member",
    authorization: { status: "active", role: "member" },
  });
  const admin = decideAccess({
    authenticated: true,
    email: "demo.admin@efeso.com",
    allowedDomains: allowed,
    membershipRole: "admin",
    authorization: { status: "active", role: "admin" },
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

test("an exact approved external address still requires active allowlist and membership", () => {
  const input = { authenticated: true, emailConfirmed: true, email: "approved@gmail.com", allowedDomains: allowed, membershipRole: "member", authorization: { status: "active" as const, role: "member" as const, externalAccessApproved: true } };
  assert.equal(decideAccess(input).kind, "authorized");
  assert.equal(decideAccess({ ...input, authorization: { ...input.authorization, externalAccessApproved: false } }).kind, "domain_denied");
  assert.equal(decideAccess({ ...input, authorization: null }).kind, "domain_denied");
  assert.equal(decideAccess({ ...input, authorization: { ...input.authorization, status: "disabled" } }).kind, "disabled");
  assert.equal(decideAccess({ ...input, membershipRole: null }).kind, "needs_activation");
});

test("an unconfirmed identity or an empty boundary configuration cannot use an external exception", () => {
  const input = { authenticated: true, email: "approved@gmail.com", allowedDomains: allowed, membershipRole: "member", authorization: { status: "active" as const, role: "member" as const, externalAccessApproved: true } };
  assert.equal(decideAccess({ ...input, emailConfirmed: false }).kind, "unauthenticated");
  assert.equal(decideAccess({ ...input, allowedDomains: [] }).kind, "config_missing");
  assert.equal(decideAccess({ ...input, email: "another@gmail.com", authorization: null }).kind, "domain_denied");
});


test("an existing active membership without a confirmed activation binding must reactivate atomically", () => {
  assert.equal(decideAccess({ authenticated:true,emailConfirmed:true,email:"member@efeso.com",allowedDomains:allowed,membershipRole:"member",membershipUserBound:false,authorization:{status:"active",role:"member"} }).kind,"needs_activation");
});
