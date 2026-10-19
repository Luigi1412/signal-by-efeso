import assert from "node:assert/strict";
import test from "node:test";
import { rankSignalSearch } from "./search";
import type { SignalListItem } from "./types";

function item(overrides: Partial<SignalListItem>): SignalListItem {
  return {
    id: "s1",
    companyId: "co-1",
    companyName: "Natura",
    companySlug: "natura",
    signalType: "strategic_plan",
    signalNature: "event",
    title: "Strategic plan",
    summary: "A plan",
    status: "active",
    importance: "medium",
    confidenceTier: "supported",
    assertionMode: "announced",
    eventDate: "2026-01-01",
    geography: "Brazil",
    evidenceCount: 1,
    demoOrigin: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("default sort is recency then importance then evidence", () => {
  const ranked = rankSignalSearch(
    [
      item({ id: "old-high", eventDate: "2025-01-01", importance: "high", evidenceCount: 9 }),
      item({ id: "new-low", eventDate: "2026-06-01", importance: "low", evidenceCount: 1 }),
      item({ id: "new-high", eventDate: "2026-06-01", importance: "high", evidenceCount: 2 }),
      item({ id: "draft", status: "draft", eventDate: "2026-07-01" }),
    ],
    { status: "active" },
  );
  assert.deepEqual(
    ranked.map((row) => row.id),
    ["new-high", "new-low", "old-high"],
  );
});

test("filters by type, importance and assertion mode", () => {
  const ranked = rankSignalSearch(
    [
      item({ id: "a", signalType: "capex_investment", importance: "high", assertionMode: "announced" }),
      item({ id: "b", signalType: "capex_investment", importance: "low", assertionMode: "announced" }),
      item({ id: "c", signalType: "restructuring", importance: "high", assertionMode: "planned" }),
    ],
    { signalType: "capex_investment", importance: "high", assertionMode: "announced" },
  );
  assert.deepEqual(
    ranked.map((row) => row.id),
    ["a"],
  );
});
