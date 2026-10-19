import type { AccountSignalInput, AccountTensionDraft } from "./types";
import type { TensionType } from "./taxonomy";

const RULES: { typeA: string[]; typeB: string[]; tension: TensionType; explanation: string }[] = [
  {
    typeA: ["expansion", "new_facility", "capacity_increase", "capex_investment", "production_ramp_up"],
    typeB: ["cost_reduction_program", "financial_pressure"],
    tension: "growth_vs_cost_pressure",
    explanation: "Growth or capacity signals coexist with cost or financial pressure signals.",
  },
  {
    typeA: ["expansion", "new_facility", "capacity_increase"],
    typeB: ["restructuring", "workforce_change", "plant_closure"],
    tension: "expansion_vs_restructuring",
    explanation: "Expansion or capacity signals coexist with restructuring or closure signals.",
  },
  {
    typeA: ["capacity_increase", "production_ramp_up", "new_facility"],
    typeB: ["capacity_reduction", "performance_decline", "operational_issue"],
    tension: "capacity_vs_demand_pressure",
    explanation: "Capacity increase signals coexist with demand, reduction, or operating pressure signals.",
  },
  {
    typeA: ["capex_investment", "expansion", "new_facility", "acquisition"],
    typeB: ["financial_pressure", "cost_reduction_program", "divestment"],
    tension: "investment_vs_financial_constraint",
    explanation: "Investment signals coexist with financial constraint or cost signals.",
  },
  {
    typeA: ["sustainability_program", "decarbonization"],
    typeB: ["cost_reduction_program", "capex_investment", "plant_closure", "financial_pressure"],
    tension: "sustainability_vs_operational_constraint",
    explanation: "Sustainability targets coexist with operational or financial constraint signals.",
  },
  {
    typeA: ["leadership_change"],
    typeB: ["digital_transformation", "automation_program", "restructuring", "performance_improvement", "strategic_plan"],
    tension: "leadership_change_during_transformation",
    explanation: "Leadership change coexists with a transformation or strategic-plan signal.",
  },
  {
    typeA: ["restructuring"],
    typeB: ["financial_pressure"],
    tension: "investment_vs_financial_constraint",
    explanation: "Restructuring coexists with reported financial pressure.",
  },
];

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function detectAccountTensions(signals: AccountSignalInput[]): AccountTensionDraft[] {
  const active = signals.filter((signal) => signal.status === "active");
  const seen = new Set<string>();
  const out: AccountTensionDraft[] = [];

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      for (const rule of RULES) {
        const matches =
          (rule.typeA.includes(a.signalType) && rule.typeB.includes(b.signalType)) ||
          (rule.typeA.includes(b.signalType) && rule.typeB.includes(a.signalType));
        if (!matches) continue;
        const [left, right] = orderedPair(a.id, b.id);
        const key = `${left}:${right}:${rule.tension}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          signalAId: left === a.id ? a.id : b.id,
          signalBId: left === a.id ? b.id : a.id,
          tensionType: rule.tension,
          explanation: rule.explanation,
        });
      }
    }
  }
  return out;
}
