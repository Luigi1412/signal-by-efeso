import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { isLocalPreviewRequest, localPreviewHref } from "./local-preview";
import { createPreviewSession, previewScenario, scenarioSlugs } from "@/components/local-preview/fixtures";

test("preview is fail-closed in production, test, default development and non-loopback requests", () => {
  for (const env of ["production", "test", undefined]) assert.equal(isLocalPreviewRequest(env, "1", "localhost:3000"), false);
  for (const flag of [undefined, "true", "0"]) assert.equal(isLocalPreviewRequest("development", flag, "localhost:3000"), false);
  for (const host of [null, "signal.example", "localhost.attacker.example", "localhost:3000@attacker.example", "127.0.0.1/other", "0.0.0.0:3000"]) assert.equal(isLocalPreviewRequest("development", "1", host), false);
  for (const host of ["localhost:3000", "127.0.0.1:3102", "[::1]:3000"]) assert.equal(isLocalPreviewRequest("development", "1", host), true);
  assert.equal(isLocalPreviewRequest("development", "1", "localhost:3000", "public.example"), false);
  assert.equal(isLocalPreviewRequest("development", "1", "localhost:3000", null, "203.0.113.8"), false);
});

test("preview runner refuses production before starting any server", () => {
  const result = spawnSync(process.execPath, ["scripts/local-preview.mjs"], { env: { ...process.env, NODE_ENV: "production", SIGNAL_LOCAL_PREVIEW: "1" }, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unavailable when NODE_ENV=production/);
});

test("fixture navigation stays in preview without corrupting fragments or external links", () => {
  assert.equal(localPreviewHref("/companies/horizonte-industrial"), "/preview/companies/horizonte-industrial");
  assert.equal(localPreviewHref("/research/new"), "/preview/research/new");
  assert.equal(localPreviewHref("/preview/account"), "/preview/account");
  assert.equal(localPreviewHref("#report-fontes"), "#report-fontes");
  assert.equal(localPreviewHref("https://example.org"), "https://example.org");
});

test("three isolated fixture reports expose their intended honest UI states", () => {
  const [positive, facts, insufficient] = scenarioSlugs.map(previewScenario);
  assert.equal(positive!.briefing.outcome, "signal_found");
  assert.ok(positive!.briefing.signals.length > 0);
  assert.ok(positive!.briefing.fits[0]?.operationalChain?.clientValidation);
  assert.ok(positive!.briefing.opportunities[0]?.uncertaintyStatement);
  assert.equal(facts!.briefing.outcome, "facts_only");
  assert.ok(facts!.briefing.validatedFacts.length > 0);
  assert.equal(facts!.briefing.signals.length + facts!.briefing.opportunities.length, 0);
  assert.equal(insufficient!.briefing.outcome, "insufficient_evidence");
  assert.equal(insufficient!.briefing.publishFullReport, false);
  assert.equal(insufficient!.briefing.validatedFacts.length + insufficient!.briefing.signals.length + insufficient!.briefing.opportunities.length, 0);
  for (const scenario of [positive!, facts!, insufficient!]) {
    assert.equal(scenario.origin, "local_preview");
    assert.match(scenario.company.name, /PREVIEW LOCAL/);
    assert.match(scenario.company.website, /\.invalid$/);
    assert.match(scenario.run.id, /^preview-local-/);
    assert.equal(scenario.run.created_by, null);
    for (const source of scenario.sources) assert.ok(source.url.startsWith("/preview/sources/"));
  }
});

test("identification, resolution, progress and cancellation are local memory operations", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("A preview fixture must never access the network"); };
  try {
    const session = createPreviewSession("horizonte-industrial", "needs_user_resolution");
    for (const [query, kind] of [["Orion", "resolved"], ["Horizonte", "existing"], ["Atlas", "ambiguous"], ["No public match", "unresolved"]]) {
      const result = await session.actions.identify({ query });
      assert.ok(result.ok);
      assert.equal(result.kind, kind);
    }
    const started = await session.actions.start({ query: "Not an actual company" });
    assert.ok(started.ok && started.runId.startsWith("preview-local-"));
    await session.actions.resolve({ runId: session.initial.id, domain: "atlas-industria.invalid" });
    const resolved = await session.actions.tick(session.initial.id);
    assert.ok(resolved.ok && resolved.run.status === "discovering_sources");
    await session.actions.cancel(session.initial.id);
    const cancelled = await session.actions.tick(session.initial.id);
    assert.ok(cancelled.ok && cancelled.run.status === "cancelled");
  } finally { globalThis.fetch = originalFetch; }
});
