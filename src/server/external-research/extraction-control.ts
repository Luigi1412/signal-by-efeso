/**
 * Bounded, progressive claim-extraction control plane.
 * Hierarchical budgets: research → phase → document → model call.
 * Never lets a single document monopolize the phase.
 */

import { classifyDocumentClass, type DocumentClass } from "./document-classes";

export type DocumentExtractionOutcome =
  | "extracted"
  | "no_claims"
  | "skipped_low_value"
  | "timed_out"
  | "parse_failed"
  | "capture_failed"
  | "model_failed"
  | "circuit_open"
  | "budget_exhausted";

export interface ExtractionBudgets {
  /** Wall-clock budget for the entire extracting_claims phase. */
  phaseBudgetMs: number;
  /** Wall-clock budget for one source snapshot (all windows + validation). */
  documentBudgetMs: number;
  /** Hard deadline for a single Ollama/HTTP model call. */
  callBudgetMs: number;
  /** Max snapshots to attempt in one phase. */
  maxDocuments: number;
  /** Consecutive model failures before opening the circuit. */
  maxConsecutiveModelFailures: number;
}

/** Defaults sized for local llama3.1:8b — tens of seconds per call, not minutes. */
export const DEFAULT_EXTRACTION_BUDGETS: ExtractionBudgets = {
  phaseBudgetMs: readMs("RESEARCH_EXTRACT_PHASE_BUDGET_MS", 10 * 60_000),
  documentBudgetMs: readMs("RESEARCH_EXTRACT_DOCUMENT_BUDGET_MS", 55_000),
  callBudgetMs: readMs("RESEARCH_EXTRACT_CALL_BUDGET_MS", 45_000),
  maxDocuments: readInt("RESEARCH_EXTRACT_MAX_DOCUMENTS", 6),
  maxConsecutiveModelFailures: readInt("RESEARCH_EXTRACT_CIRCUIT_FAILURES", 2),
};

export interface ExtractionDocumentReport {
  snapshotId: string;
  url: string;
  title: string | null;
  sourceQuality: string | null;
  documentClass: DocumentClass;
  textLen: number;
  blockCount: number;
  outcome: DocumentExtractionOutcome;
  ms: number;
  modelCalls: number;
  detail?: string | null;
}

export interface ExtractionCoverage {
  documentsEligible: number;
  documentsAttempted: number;
  documentsExtracted: number;
  documentsTimedOut: number;
  documentsSkipped: number;
  documentsFailed: number;
  documentsCircuitOpen: number;
  claimsExtracted: number;
  claimsValidated: number;
  phaseBudgetMs: number;
  phaseUsedMs: number;
  circuitOpened: boolean;
  documents: ExtractionDocumentReport[];
}

export function emptyExtractionCoverage(budgets: ExtractionBudgets = DEFAULT_EXTRACTION_BUDGETS): ExtractionCoverage {
  return {
    documentsEligible: 0,
    documentsAttempted: 0,
    documentsExtracted: 0,
    documentsTimedOut: 0,
    documentsSkipped: 0,
    documentsFailed: 0,
    documentsCircuitOpen: 0,
    claimsExtracted: 0,
    claimsValidated: 0,
    phaseBudgetMs: budgets.phaseBudgetMs,
    phaseUsedMs: 0,
    circuitOpened: false,
    documents: [],
  };
}

export function summarizeExtractionCoverage(
  reports: ExtractionDocumentReport[],
  input: { claimsExtracted: number; claimsValidated: number; phaseUsedMs: number; budgets: ExtractionBudgets; circuitOpened: boolean },
): ExtractionCoverage {
  const coverage = emptyExtractionCoverage(input.budgets);
  coverage.documentsEligible = reports.length;
  coverage.documents = reports;
  coverage.claimsExtracted = input.claimsExtracted;
  coverage.claimsValidated = input.claimsValidated;
  coverage.phaseUsedMs = input.phaseUsedMs;
  coverage.circuitOpened = input.circuitOpened;
  for (const row of reports) {
    if (row.outcome === "skipped_low_value" || row.outcome === "budget_exhausted") {
      coverage.documentsSkipped += 1;
      continue;
    }
    if (row.outcome === "circuit_open") {
      coverage.documentsCircuitOpen += 1;
      continue;
    }
    coverage.documentsAttempted += 1;
    if (row.outcome === "extracted" || row.outcome === "no_claims") coverage.documentsExtracted += 1;
    else if (row.outcome === "timed_out") coverage.documentsTimedOut += 1;
    else coverage.documentsFailed += 1;
  }
  return coverage;
}

export class ModelCircuitBreaker {
  private consecutiveFailures = 0;
  private open = false;
  constructor(private readonly maxConsecutive: number) {}
  get isOpen(): boolean {
    return this.open;
  }
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.open = false;
  }
  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.maxConsecutive) this.open = true;
  }
}

export interface RankableExtractionSource {
  snapshotId: string;
  url: string;
  title: string | null;
  sourceQuality: string | null;
  sourceType: string | null;
  textLen: number;
}

/**
 * Deterministic extraction order: official dense / IR / filings / financial first,
 * then official releases, then reputable secondary with material leads, then other.
 */
export function rankSourcesForExtraction(
  items: RankableExtractionSource[],
  options?: { movementLeadUrls?: Set<string> },
): RankableExtractionSource[] {
  const leadUrls = options?.movementLeadUrls ?? new Set<string>();
  return [...items].sort((left, right) => scoreExtractionSource(right, leadUrls) - scoreExtractionSource(left, leadUrls));
}

export function scoreExtractionSource(item: RankableExtractionSource, leadUrls: Set<string> = new Set()): number {
  const cls = classifyDocumentClass({
    url: item.url,
    title: item.title,
    sourceType: item.sourceType,
    sourceQuality: item.sourceQuality,
  });
  let score = 0;
  const primary = item.sourceQuality === "primary";
  const dense = item.textLen >= 2500;
  const hay = `${item.url} ${item.title ?? ""}`.toLowerCase();
  const chromeIr = isLowYieldOfficialChrome(hay);
  const financialish =
    cls === "financial_results" ||
    /destaques.?financeir|dividend|jcp|earnings|resultado|balan[cç]o|trimestr|interim|sec.?cvm.?filing|publica[cç][oõ]es.?cvm/.test(
      hay,
    );
  const materialMovement =
    cls === "operations_capex" ||
    cls === "official_release" ||
    /restructur|reestrutur|aquisi|acquisition|fatos? relevantes|material.?fact|capex|f[aá]brica/.test(hay);

  if (primary) score += chromeIr ? 40 : 100;
  if (dense) score += chromeIr ? 10 : 40;
  if (cls === "financial_results" || financialish) score += 90;
  else if (cls === "annual_report" || cls === "regulatory_filing") score += 75;
  else if (cls === "official_release" || materialMovement) score += 70;
  else if (cls === "investor_relations") score += chromeIr ? 15 : 50;
  else if (cls === "presentation") score += 30;
  else if (cls === "news_secondary") score += 10;
  if (leadUrls.has(item.url)) score += 25;
  // Dense secondary financial/results beat primary IR chrome (FAQ/history/culture).
  if (!primary && (cls === "financial_results" || financialish)) {
    score += chromeIr ? 0 : -10;
    if (dense) score += 35;
  }
  if (chromeIr) score -= 60;
  score += Math.min(30, Math.floor(item.textLen / 5000));
  return score;
}

/** Official IR shells that rarely yield fresh extractable financial facts. */
export function isLowYieldOfficialChrome(hay: string): boolean {
  return /historico|hist[oó]rico|faq|perguntas.?frequentes|dream.?people.?culture|sonho.?gente.?cultura|diretoria|conselho.?de.?administra|overview\/dream|visao-geral\/historico|visao-geral\/sonho|en\/faqs/.test(
    hay,
  );
}

export function remainingBudgetMs(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, deadlineAt - now);
}

export function callBudgetForDocument(input: {
  budgets: ExtractionBudgets;
  phaseDeadlineAt: number;
  documentDeadlineAt: number;
  now?: number;
}): number {
  const now = input.now ?? Date.now();
  return Math.max(
    1_000,
    Math.min(
      input.budgets.callBudgetMs,
      remainingBudgetMs(input.phaseDeadlineAt, now),
      remainingBudgetMs(input.documentDeadlineAt, now),
    ),
  );
}

export function classifyExtractionError(error: unknown): DocumentExtractionOutcome {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timed out|OLLAMA_CALL_DEADLINE|DOCUMENT_EXTRACT_DEADLINE|TimeoutError|AbortError|aborted/i.test(message)) {
    return "timed_out";
  }
  if (/Zod|schema|JSON|parse/i.test(message)) return "parse_failed";
  if (/UNAVAILABLE|ECONN|fetch failed|network/i.test(message)) return "model_failed";
  return "model_failed";
}

function readMs(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

function readInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}
