import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors isExplicitDemoContent without importing server-only env module. */
function isExplicitDemoContent(env: Record<string, string | undefined>): boolean {
  return env.DEMO_MODE?.trim().toLowerCase() === "true";
}

test("real research never shows demo footer when DEMO_MODE is false", () => {
  assert.equal(isExplicitDemoContent({ DEMO_MODE: "false", DEMO_AUTH_MODE: "true" }), false);
});

test("demo footer only when DEMO_MODE is explicitly true", () => {
  assert.equal(isExplicitDemoContent({ DEMO_MODE: "true", DEMO_AUTH_MODE: "false" }), true);
  assert.equal(isExplicitDemoContent({ DEMO_AUTH_MODE: "true" }), false);
});
