import type { SignalListItem } from "@/server/signals/types";

export const SIGNAL_MOVEMENT_CATEGORIES = [
  "expansion",
  "restructuring",
  "operations",
  "leadership",
  "sustainability",
  "strategy",
  "financial",
  "other",
] as const;

export type SignalMovementCategory = (typeof SIGNAL_MOVEMENT_CATEGORIES)[number];

const TITLE_DISPLAY: Record<string, string> = {
  "Company announces capex investment in Brazil capacity": "Novo investimento de CAPEX anunciado no Brasil",
  "Company announces an operational capacity increase": "Aumento operacional de capacidade anunciado",
  "Company announces a restructuring program": "Programa de reestruturação anunciado",
  "Company reports financial pressure in this demo preview": "Pressão financeira reportada",
  "Company describes a strategic growth plan in Brazil": "Plano estratégico de crescimento no Brasil",
  "Company announces a sustainability program": "Programa de sustentabilidade anunciado",
};

const MOVEMENT_BY_TYPE: Record<string, SignalMovementCategory> = {
  capex_investment: "expansion",
  expansion: "expansion",
  new_facility: "expansion",
  capacity_increase: "expansion",
  new_market_entry: "expansion",
  partnership: "expansion",
  restructuring: "restructuring",
  cost_reduction_program: "restructuring",
  workforce_change: "restructuring",
  plant_closure: "restructuring",
  divestment: "restructuring",
  operational_issue: "operations",
  quality_issue: "operations",
  production_ramp_up: "operations",
  maintenance_shutdown: "operations",
  supply_chain_change: "operations",
  automation_program: "operations",
  digital_transformation: "operations",
  capacity_reduction: "operations",
  performance_improvement: "operations",
  performance_decline: "operations",
  leadership_change: "leadership",
  sustainability_program: "sustainability",
  decarbonization: "sustainability",
  strategic_plan: "strategy",
  acquisition: "strategy",
  merger: "strategy",
  financial_pressure: "financial",
  regulatory_change: "other",
  other: "other",
};

const IMPORTANCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

/** Presentation-only title. Never mutates the persisted provenance title. */
export function formatSignalTitleForDisplay(title: string): string {
  const trimmed = title.trim();
  return TITLE_DISPLAY[trimmed] ?? trimmed;
}

export function formatSignalSummaryForDisplay(summary: string): string {
  return summary.replace(/^Dataset de demonstração:\s*/i, "").trim();
}

export { formatDate as formatSignalDate } from "@/lib/labels";

export function formatSignalGeography(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^(brazil|brasil)$/i.test(value.trim())) return "Brasil";
  return value;
}

export function signalMovementCategory(signalType: string): SignalMovementCategory {
  return MOVEMENT_BY_TYPE[signalType] ?? "other";
}

export function daysAgoIso(asOfDate: string, days: number): string {
  const stamp = new Date(`${asOfDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(stamp.getTime())) return asOfDate.slice(0, 10);
  stamp.setUTCDate(stamp.getUTCDate() - days);
  return stamp.toISOString().slice(0, 10);
}

export function pickFeaturedSignals(items: SignalListItem[], limit = 5): SignalListItem[] {
  const size = Math.min(Math.max(limit, 3), 5);
  return [...items]
    .sort((left, right) => {
      const importance =
        (IMPORTANCE_RANK[right.importance] ?? 0) - (IMPORTANCE_RANK[left.importance] ?? 0);
      if (importance !== 0) return importance;
      const leftDate = left.eventDate ?? left.createdAt;
      const rightDate = right.eventDate ?? right.createdAt;
      if (leftDate !== rightDate) return leftDate < rightDate ? 1 : -1;
      return right.evidenceCount - left.evidenceCount;
    })
    .slice(0, Math.min(size, items.length));
}

export function summarizeSignals(items: SignalListItem[]): {
  activeCount: number;
  highImportanceCount: number;
  companiesMoving: number;
  frequentMovements: SignalMovementCategory[];
} {
  const companies = new Set(items.map((item) => item.companyId));
  const counts = new Map<SignalMovementCategory, number>();
  for (const item of items) {
    const category = signalMovementCategory(item.signalType);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const frequentMovements = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([category]) => category);
  return {
    activeCount: items.length,
    highImportanceCount: items.filter((item) => item.importance === "high").length,
    companiesMoving: companies.size,
    frequentMovements,
  };
}

export function groupSignalsByMovement(items: SignalListItem[]): {
  category: SignalMovementCategory;
  items: SignalListItem[];
}[] {
  const grouped = new Map<SignalMovementCategory, SignalListItem[]>();
  for (const item of items) {
    const category = signalMovementCategory(item.signalType);
    const bucket = grouped.get(category) ?? [];
    bucket.push(item);
    grouped.set(category, bucket);
  }
  return SIGNAL_MOVEMENT_CATEGORIES.flatMap((category) => {
    const bucket = grouped.get(category);
    return bucket?.length ? [{ category, items: bucket }] : [];
  });
}

export function hasActiveSignalFilters(filters: {
  query: string;
  companyId: string;
  signalType: string;
  importance: string;
  geography: string;
  assertionMode: string;
  dateFrom: string;
  dateTo: string;
}): boolean {
  return Boolean(
    filters.query ||
      filters.companyId ||
      filters.signalType ||
      filters.importance ||
      filters.geography ||
      filters.assertionMode ||
      filters.dateFrom ||
      filters.dateTo,
  );
}
