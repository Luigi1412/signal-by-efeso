import { ui } from "@/i18n";

export function opportunityTypeLabel(type: string): string {
  return (ui.opportunityType as Record<string, string>)[type] ?? type;
}

export function opportunityMaturityLabel(value: string): string {
  return (ui.opportunityMaturity as Record<string, string>)[value] ?? value;
}

export function opportunityLevelLabel(value: string): string {
  return (ui.opportunityLevel as Record<string, string>)[value] ?? value;
}

export function opportunityConfidenceLabel(value: string): string {
  return (ui.opportunityConfidence as Record<string, string>)[value] ?? value;
}

export function levelTone(value: string): "strong" | "brand" | "neutral" {
  if (value === "high") return "strong";
  if (value === "medium") return "brand";
  return "neutral";
}
