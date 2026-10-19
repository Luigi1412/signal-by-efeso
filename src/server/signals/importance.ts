import {
  HIGH_IMPORTANCE_TYPES,
  MEDIUM_IMPORTANCE_TYPES,
  type SignalImportance,
  type SignalType,
} from "./taxonomy";

const C_LEVEL = /\b(ceo|cfo|coo|chairman|chairwoman|chief executive|chief financial|chief operating)\b/i;

function magnitudeIsMaterial(input: {
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
}): boolean {
  if (input.numericValue == null || !Number.isFinite(input.numericValue)) return false;
  const unit = (input.unit ?? "").toLowerCase();
  const abs = Math.abs(input.numericValue);
  if (unit.includes("%") || unit.includes("percent") || unit.includes("pp")) return abs >= 10;
  if (unit.includes("bn") || unit.includes("billion")) return abs >= 0.5;
  if (unit.includes("mn") || unit.includes("million") || unit === "m") return abs >= 100;
  if ((input.currencyCode ?? "").length === 3) return abs >= 100_000_000;
  return abs >= 100;
}

export function deriveSignalImportance(input: {
  signalType: string;
  numericValue: number | null;
  unit: string | null;
  currencyCode: string | null;
  title: string;
  summary: string;
}): SignalImportance {
  const type = input.signalType as SignalType;
  const text = `${input.title} ${input.summary}`;
  const material = magnitudeIsMaterial(input);
  const cLevel = type === "leadership_change" && C_LEVEL.test(text);

  if (type === "plant_closure" || type === "acquisition" || type === "divestment" || type === "merger") {
    return "high";
  }
  if (type === "new_facility" || type === "restructuring") return "high";
  if (type === "capex_investment" && (material || input.numericValue != null)) return "high";
  if (type === "financial_pressure" && material) return "high";
  if (cLevel) return "high";
  if (HIGH_IMPORTANCE_TYPES.has(type) && material) return "high";
  if (HIGH_IMPORTANCE_TYPES.has(type) || MEDIUM_IMPORTANCE_TYPES.has(type) || material) return "medium";
  return "low";
}
