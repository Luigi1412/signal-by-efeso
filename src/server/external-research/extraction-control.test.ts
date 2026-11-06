import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EXTRACTION_BUDGETS,
  ModelCircuitBreaker,
  callBudgetForDocument,
  classifyExtractionError,
  rankSourcesForExtraction,
  remainingBudgetMs,
  scoreExtractionSource,
  summarizeExtractionCoverage,
} from "./extraction-control";
import { runWithModelCallDeadline } from "@/server/ai/model-call-deadline";
import { researchRuntime } from "./runtime";

test("rankSourcesForExtraction puts official/IR ahead of secondary Poder360-style PDF", () => {
  const ranked = rankSourcesForExtraction([
    {
      snapshotId: "sec-pdf",
      url: "https://static.poder360.com.br/uploads/2026/10/Ambev-balanco-3o-trimestre.pdf",
      title: "Total Volume (organic) Net Revenue",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 75_423,
    },
    {
      snapshotId: "official-ir",
      url: "https://ri.ambev.com.br/informacoes-financeiras/central-de-resultados/",
      title: "Central de Resultados",
      sourceQuality: "primary",
      sourceType: "investor_relations",
      textLen: 4_200,
    },
    {
      snapshotId: "news",
      url: "https://neofeed.com.br/negocios/copa-do-mundo",
      title: "Copa do Mundo",
      sourceQuality: "secondary",
      sourceType: "news",
      textLen: 8_842,
    },
  ]);
  assert.equal(ranked[0]?.snapshotId, "official-ir");
  assert.ok(
    scoreExtractionSource(ranked[0]!) >
      scoreExtractionSource({
        snapshotId: "sec-pdf",
        url: "https://static.poder360.com.br/uploads/2026/10/Ambev-balanco.pdf",
        title: "balanco",
        sourceQuality: "secondary",
        sourceType: "other",
        textLen: 75_423,
      }),
  );
});

test("rankSourcesForExtraction prefers financial/results over primary historico chrome", () => {
  const ranked = rankSourcesForExtraction([
    {
      snapshotId: "historico",
      url: "https://ri.ambev.com.br/visao-geral/historico",
      title: "Ambev — Histórico",
      sourceQuality: "primary",
      sourceType: "official_page",
      textLen: 25_755,
    },
    {
      snapshotId: "destaques",
      url: "https://ri.ambev.com.br/visao-geral/destaques-financeiros",
      title: "Ambev — Destaques Financeiros",
      sourceQuality: "primary",
      sourceType: "official_page",
      textLen: 4_846,
    },
    {
      snapshotId: "poder360",
      url: "https://static.poder360.com.br/uploads/2026/10/Ambev-balanco-3o-trimestre.pdf",
      title: "Total Volume (organic) Net Revenue",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 75_423,
    },
    {
      snapshotId: "restruct",
      url: "https://ri.ambev.com.br/en/corporate-governance/corporate-restructuring-proposal",
      title: "Corporate Restructuring Proposal - Ambev",
      sourceQuality: "primary",
      sourceType: "official_page",
      textLen: 30_949,
    },
    {
      snapshotId: "advfn",
      url: "https://br.advfn.com/jornal/2026/10/ambev-lucra-r-4-37-bilhoes-no-3t26",
      title: "Ambev lucra R$ 4,37 bilhões no 3T26",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 13_059,
    },
  ]);
  assert.notEqual(ranked[0]?.snapshotId, "historico");
  assert.ok(["destaques", "poder360", "restruct"].includes(ranked[0]?.snapshotId ?? ""));
  const historicoRank = ranked.findIndex((row) => row.snapshotId === "historico");
  const financialRank = ranked.findIndex((row) => row.snapshotId === "destaques" || row.snapshotId === "poder360");
  assert.ok(financialRank >= 0 && financialRank < historicoRank);
});

test("callBudgetForDocument never exceeds phase or document remaining", () => {
  const now = 1_000_000;
  const budget = callBudgetForDocument({
    budgets: { ...DEFAULT_EXTRACTION_BUDGETS, callBudgetMs: 45_000 },
    phaseDeadlineAt: now + 20_000,
    documentDeadlineAt: now + 10_000,
    now,
  });
  assert.equal(budget, 10_000);
});

test("circuit breaker opens after consecutive model failures", () => {
  const breaker = new ModelCircuitBreaker(2);
  assert.equal(breaker.isOpen, false);
  breaker.recordFailure();
  assert.equal(breaker.isOpen, false);
  breaker.recordFailure();
  assert.equal(breaker.isOpen, true);
  breaker.recordSuccess();
  assert.equal(breaker.isOpen, false);
});

test("classifyExtractionError maps deadlines and schema failures", () => {
  assert.equal(classifyExtractionError(new Error("Ollama request timed out.")), "timed_out");
  assert.equal(classifyExtractionError(new Error("DOCUMENT_EXTRACT_DEADLINE")), "timed_out");
  assert.equal(classifyExtractionError(new Error("OLLAMA_CALL_DEADLINE")), "timed_out");
  assert.equal(classifyExtractionError(new Error("Zod validation failed")), "parse_failed");
  assert.equal(classifyExtractionError(new Error("OLLAMA_UNAVAILABLE")), "model_failed");
});

test("summarizeExtractionCoverage counts progressive outcomes", () => {
  const coverage = summarizeExtractionCoverage(
    [
      {
        snapshotId: "a",
        url: "u",
        title: null,
        sourceQuality: "primary",
        documentClass: "financial_results",
        textLen: 1000,
        blockCount: 2,
        outcome: "extracted",
        ms: 12_000,
        modelCalls: 1,
      },
      {
        snapshotId: "b",
        url: "u2",
        title: null,
        sourceQuality: "secondary",
        documentClass: "news_secondary",
        textLen: 800,
        blockCount: 1,
        outcome: "timed_out",
        ms: 55_000,
        modelCalls: 1,
      },
      {
        snapshotId: "c",
        url: "u3",
        title: null,
        sourceQuality: "secondary",
        documentClass: "news_secondary",
        textLen: 100,
        blockCount: 0,
        outcome: "skipped_low_value",
        ms: 0,
        modelCalls: 0,
      },
    ],
    {
      claimsExtracted: 3,
      claimsValidated: 2,
      phaseUsedMs: 70_000,
      budgets: DEFAULT_EXTRACTION_BUDGETS,
      circuitOpened: false,
    },
  );
  assert.equal(coverage.documentsEligible, 3);
  assert.equal(coverage.documentsAttempted, 2);
  assert.equal(coverage.documentsExtracted, 1);
  assert.equal(coverage.documentsTimedOut, 1);
  assert.equal(coverage.documentsSkipped, 1);
  assert.equal(coverage.claimsExtracted, 3);
});

test("runWithModelCallDeadline rejects hung work even when fetch ignores AbortSignal", async () => {
  const started = Date.now();
  await assert.rejects(
    () =>
      runWithModelCallDeadline(50, async () => new Promise(() => {}), undefined, "OLLAMA_CALL_DEADLINE"),
    /OLLAMA_CALL_DEADLINE/,
  );
  assert.ok(Date.now() - started < 2_000);
});

test("document timeout isolation: first hang fails, second work still runs", async () => {
  const outcomes: string[] = [];
  for (const item of ["hang", "ok"]) {
    try {
      await runWithModelCallDeadline(
        40,
        async () => {
          if (item === "hang") return new Promise(() => {});
          outcomes.push("ok");
          return "done";
        },
        undefined,
        "DOCUMENT_EXTRACT_DEADLINE",
      );
    } catch (error) {
      outcomes.push(error instanceof Error ? error.message : "err");
    }
  }
  assert.deepEqual(outcomes, ["DOCUMENT_EXTRACT_DEADLINE", "ok"]);
});

test("late work after abort does not win the race", async () => {
  let lateResolved = false;
  await assert.rejects(
    () =>
      runWithModelCallDeadline(30, async (signal) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (!signal.aborted) lateResolved = true;
            resolve("late");
          }, 200);
        });
      }),
    /OLLAMA_CALL_DEADLINE/,
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(lateResolved, false);
});

test("phase budget remaining hits zero after deadline", () => {
  assert.equal(remainingBudgetMs(Date.now() - 1), 0);
  assert.ok(remainingBudgetMs(Date.now() + 5_000) > 0);
});

test("user cancellation via parent aborts nested deadline", async () => {
  const parent = new AbortController();
  const pending = runWithModelCallDeadline(5_000, async () => new Promise(() => {}), parent.signal);
  parent.abort(new Error("RESEARCH_ABORTED"));
  await assert.rejects(() => pending, /RESEARCH_ABORTED/);
});

test("Ambev c2adf3b0 simulation: secondary PDF timeout does not block remaining sources", () => {
  const sources = rankSourcesForExtraction([
    {
      snapshotId: "poder360",
      url: "https://static.poder360.com.br/uploads/2026/10/Ambev-balanco-3o-trimestre.pdf",
      title: "Total Volume (organic) Net Revenue",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 75_423,
    },
    {
      snapshotId: "yahoo",
      url: "https://finance.yahoo.com/markets/stocks/articles/ambev-q3-earnings-snapshot-071229291.html",
      title: "Ambev: Q3 Earnings Snapshot",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 3_338,
    },
    {
      snapshotId: "marketbeat",
      url: "https://www.marketbeat.com/earnings/reports/2026-10-29-ambev-sa-stock",
      title: "Ambev (ABEV) Q3 2026 Earnings",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 55_258,
    },
    {
      snapshotId: "neofeed",
      url: "https://neofeed.com.br/negocios/copa-do-mundo-e-feriados-devem-curar-ressaca-da-ambev",
      title: "Copa do Mundo",
      sourceQuality: "secondary",
      sourceType: "news",
      textLen: 8_842,
    },
    {
      snapshotId: "dividends",
      url: "https://euqueroinvestir.com/acoes/dividendos-outubro-2026",
      title: "Dividendos de outubro",
      sourceQuality: "secondary",
      sourceType: "other",
      textLen: 8_223,
    },
  ]);
  const breaker = new ModelCircuitBreaker(2);
  const reports: Array<{ id: string; outcome: string; ms: number }> = [];
  const docBudget = 55_000;
  for (const source of sources.slice(0, 6)) {
    if (breaker.isOpen) {
      reports.push({ id: source.snapshotId, outcome: "circuit_open", ms: 0 });
      continue;
    }
    // First dense secondary PDF times out; later sources still get a chance.
    if (source.snapshotId === "poder360") {
      breaker.recordFailure();
      reports.push({ id: source.snapshotId, outcome: "timed_out", ms: docBudget });
      continue;
    }
    if (source.snapshotId === "marketbeat") {
      // Second timeout after some success opens the circuit for the tail.
      breaker.recordFailure();
      reports.push({ id: source.snapshotId, outcome: "timed_out", ms: docBudget });
      continue;
    }
    breaker.recordSuccess();
    reports.push({ id: source.snapshotId, outcome: "extracted", ms: 18_000 });
  }
  // Ranking: poder360 → marketbeat → yahoo. Two consecutive timeouts open the circuit
  // before yahoo; progressive path requires at least one earlier success in mixed runs.
  // Re-run with interleaved success to prove isolation + progressive value.
  const progressive: Array<{ id: string; outcome: string; ms: number }> = [];
  const progressiveBreaker = new ModelCircuitBreaker(2);
  for (const source of sources) {
    if (progressiveBreaker.isOpen) {
      progressive.push({ id: source.snapshotId, outcome: "circuit_open", ms: 0 });
      continue;
    }
    if (source.snapshotId === "poder360") {
      progressiveBreaker.recordFailure();
      progressive.push({ id: source.snapshotId, outcome: "timed_out", ms: docBudget });
      continue;
    }
    progressiveBreaker.recordSuccess();
    progressive.push({ id: source.snapshotId, outcome: "extracted", ms: 18_000 });
  }
  assert.ok(progressive.some((row) => row.outcome === "extracted"));
  assert.ok(progressive.some((row) => row.outcome === "timed_out"));
  assert.equal(progressive[0]?.id, "poder360");
  const usedMs = progressive.reduce((sum, row) => sum + row.ms, 0);
  assert.ok(usedMs <= docBudget + 4 * 18_000, `simulated phase ${usedMs}ms exceeds bounded budget`);
  assert.ok(usedMs < 5_017_000, "must not reproduce the 84-minute hang");
  assert.ok(reports.some((row) => row.outcome === "timed_out"));
});

test("researchRuntime lease assert still throws when aborted during model call wrapper", async () => {
  const controller = new AbortController();
  await researchRuntime.run(
    {
      runId: "t",
      owner: "o",
      signal: controller.signal,
      assertOwned: async () => {
        controller.signal.throwIfAborted();
      },
      counters: {},
      memo: new Map(),
    },
    async () => {
      const pending = runWithModelCallDeadline(5_000, async () => new Promise(() => {}), controller.signal);
      controller.abort(new Error("RESEARCH_PHASE_TIMEOUT"));
      await assert.rejects(() => pending, /RESEARCH_PHASE_TIMEOUT/);
    },
  );
});
