import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROVISIONED_ROLE, isAdminRole, isWorkspaceRole } from "./roles";

test("domain is not admin: member role is not administrative", () => {
  assert.equal(isAdminRole("member"), false);
  assert.equal(isAdminRole("consultant"), false);
  assert.equal(DEFAULT_PROVISIONED_ROLE, "member");
});

test("only admin role is administrative", () => {
  assert.equal(isAdminRole("admin"), true);
  assert.equal(isWorkspaceRole("admin"), true);
  assert.equal(isWorkspaceRole("member"), true);
  assert.equal(isWorkspaceRole("owner"), false);
});
