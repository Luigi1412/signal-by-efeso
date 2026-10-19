import assert from "node:assert/strict";
import test from "node:test";
import {
  daysAgoIso,
  formatSignalDate,
  formatSignalGeography,
  formatSignalSummaryForDisplay,
  formatSignalTitleForDisplay,
  groupSignalsByMovement,
  pickFeaturedSignals,
  signalMovementCategory,
  summarizeSignals,
} from "./signal-display";
import type { SignalListItem } from "@/server/signals/types";

function item(partial: Partial<SignalListItem>): SignalListItem {
  return {
    id: "id",
    companyId: "co",
    companyName: "Empresa",
    companySlug: "empresa",
    signalType: "expansion",
    signalNature: "event",
    title: "Title",
    summary: "Summary",
    status: "active",
    importance: "medium",
    confidenceTier: "supported",
    assertionMode: "announced",
    eventDate: "2026-10-15",
    geography: "Brazil",
    evidenceCount: 1,
    demoOrigin: true,
    createdAt: "2026-10-15T00:00:00.000Z",
    ...partial,
  };
}

test("formatSignalTitleForDisplay uses Portuguese presentation titles without changing unknown copy", () => {
  assert.equal(
    formatSignalTitleForDisplay("Company announces capex investment in Brazil capacity"),
    "Novo investimento de CAPEX anunciado no Brasil",
  );
  assert.equal(formatSignalTitleForDisplay("Plano já em português"), "Plano já em português");
});

test("formatSignalSummaryForDisplay strips demo prefix", () => {
  assert.equal(
    formatSignalSummaryForDisplay("Dataset de demonstração: a empresa anuncia investimento."),
    "a empresa anuncia investimento.",
  );
});

test("dates and geography are formatted for pt-BR presentation", () => {
  assert.equal(formatSignalDate("2026-10-15"), "15 out 2026");
  assert.equal(formatSignalGeography("Brazil"), "Brasil");
});

test("featured signals prefer high importance, then recency, then evidence", () => {
  const featured = pickFeaturedSignals([
    item({ id: "low-new", importance: "low", eventDate: "2026-10-15", evidenceCount: 9 }),
    item({ id: "high-old", importance: "high", eventDate: "2026-09-01", evidenceCount: 1 }),
    item({ id: "high-new-weak", importance: "high", eventDate: "2026-10-15", evidenceCount: 1 }),
    item({ id: "high-new-strong", importance: "high", eventDate: "2026-10-15", evidenceCount: 4 }),
  ]);
  assert.deepEqual(
    featured.map((row) => row.id),
    ["high-new-strong", "high-new-weak", "high-old", "low-new"],
  );
});

test("summary and grouping stay on the UI category layer", () => {
  const items = [
    item({ id: "1", companyId: "vale", signalType: "capex_investment", importance: "high" }),
    item({ id: "2", companyId: "vale", signalType: "capacity_increase" }),
    item({ id: "3", companyId: "raizen", signalType: "restructuring", importance: "high" }),
  ];
  const summary = summarizeSignals(items);
  assert.equal(summary.activeCount, 3);
  assert.equal(summary.highImportanceCount, 2);
  assert.equal(summary.companiesMoving, 2);
  assert.equal(signalMovementCategory("capex_investment"), "expansion");
  assert.equal(groupSignalsByMovement(items)[0]?.category, "expansion");
  assert.equal(daysAgoIso("2026-10-15", 30), "2026-09-15");
});
