import assert from "node:assert/strict";
import test from "node:test";
import { isAdminPath, isPublicPath } from "./decisions";

const protectedPaths = [
  "/",
  "/companies",
  "/companies/natura",
  "/companies/natura/evidence",
  "/knowledge/efeso",
  "/knowledge-base",
  "/admin",
  "/admin/extraction-lab",
  "/admin/knowledge-lab",
  "/admin/signal-lab",
  "/admin/account-intelligence-lab",
  "/admin/efeso-fit-lab",
  "/admin/opportunity-lab",
  "/admin/relationship-lab",
  "/admin/action-lab",
  "/admin/release-health",
  "/signals",
  "/actions",
  "/accounts/intelligence",
  "/opportunities",
  "/radar",
  "/expertise",
  "/analysis/new",
];

test("login, callback and access-restricted are public", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/access-restricted"), true);
  assert.equal(isPublicPath("/auth/callback"), true);
});

test("internal routes are not public", () => {
  for (const path of protectedPaths) {
    assert.equal(isPublicPath(path), false, path);
  }
});

test("admin labs are admin paths; knowledge is not", () => {
  assert.equal(isAdminPath("/admin/extraction-lab"), true);
  assert.equal(isAdminPath("/admin/knowledge-lab"), true);
  assert.equal(isAdminPath("/admin/signal-lab"), true);
  assert.equal(isAdminPath("/admin/account-intelligence-lab"), true);
  assert.equal(isAdminPath("/admin/efeso-fit-lab"), true);
  assert.equal(isAdminPath("/admin/opportunity-lab"), true);
  assert.equal(isAdminPath("/admin/relationship-lab"), true);
  assert.equal(isAdminPath("/admin/action-lab"), true);
  assert.equal(isAdminPath("/admin/release-health"), true);
  assert.equal(isAdminPath("/signals"), false);
  assert.equal(isAdminPath("/actions"), false);
  assert.equal(isAdminPath("/accounts/intelligence"), false);
  assert.equal(isAdminPath("/knowledge/efeso"), false);
  assert.equal(isAdminPath("/expertise"), false);
  assert.equal(isAdminPath("/radar"), false);
  assert.equal(isAdminPath("/companies/natura"), false);
});

test("logout destination is the public login route", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/"), false);
});
