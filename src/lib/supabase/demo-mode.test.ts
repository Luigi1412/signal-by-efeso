import assert from "node:assert/strict";
import test from "node:test";
import { demoModeEnabled } from "./demo-mode";
test("production never enables demo provisioning, even with legacy or explicit flags",()=>{
  assert.equal(demoModeEnabled("production","true","true"),false);
  assert.equal(demoModeEnabled("production",undefined,"true"),false);
  assert.equal(demoModeEnabled("development","false","true"),false);
  assert.equal(demoModeEnabled("development","true","true"),true);
});
