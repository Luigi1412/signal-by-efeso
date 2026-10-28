import assert from "node:assert/strict";
import test from "node:test";
import { SUPABASE_PAGE_FETCH_TIMEOUT_MS, SUPABASE_PIPELINE_FETCH_TIMEOUT_MS } from "./fetch";

test("pipeline Supabase calls keep a longer timeout than page-load fail-fast", () => {
  assert.equal(SUPABASE_PAGE_FETCH_TIMEOUT_MS, 2500);
  assert.ok(SUPABASE_PIPELINE_FETCH_TIMEOUT_MS >= 10_000);
  assert.ok(SUPABASE_PIPELINE_FETCH_TIMEOUT_MS > SUPABASE_PAGE_FETCH_TIMEOUT_MS);
});
