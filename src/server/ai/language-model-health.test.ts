import assert from "node:assert/strict";
import test from "node:test";
import { probeLocalModelOperationalState } from "./language-model-health";

test("probeLocalModelOperationalState marks unreachable host as unavailable", async () => {
  const result = await probeLocalModelOperationalState({
    baseUrl: "http://127.0.0.1:9",
    smokeTimeoutMs: 500,
  });
  assert.equal(result.state, "unavailable");
});

test("probeLocalModelOperationalState distinguishes healthy smoke from slow document deadline", async () => {
  // Requires local Ollama with configured model; skip soft if unavailable.
  const healthy = await probeLocalModelOperationalState({ smokeTimeoutMs: 25_000 });
  if (healthy.state !== "healthy") {
    assert.equal(healthy.state, "unavailable");
    return;
  }
  const slow = await probeLocalModelOperationalState({
    smokeTimeoutMs: 25_000,
    simulateSlowDocument: true,
    documentDeadlineMs: 1200,
  });
  assert.equal(slow.state, "healthy_slow_document");
  assert.ok((slow.documentMs ?? 0) >= 1000);
});
