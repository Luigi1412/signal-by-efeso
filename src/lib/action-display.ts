import { ui } from "@/i18n";

export function actionTypeLabel(type: string): string {
  return (ui.actionType as Record<string, string>)[type] ?? type;
}

export function actionPriorityLabel(value: string): string {
  return (ui.actionPriority as Record<string, string>)[value] ?? value;
}

export function relationshipStatusLabel(value: string): string {
  return (ui.relationshipStatus as Record<string, string>)[value] ?? value;
}

export function relationshipStrengthLabel(value: string): string {
  return (ui.relationshipStrength as Record<string, string>)[value] ?? value;
}

export function dataQualityLabel(value: string): string {
  return (ui.dataQuality as Record<string, string>)[value] ?? value;
}

export function actionQuadrantLabel(value: string): string {
  return (ui.actionQuadrant as Record<string, string>)[value] ?? value;
}

export function contactRoleLabel(value: string): string {
  return (ui.contactRole as Record<string, string>)[value] ?? value;
}

export function relationshipSourceLabel(value: string): string {
  return (ui.relationshipSource as Record<string, string>)[value] ?? "Registro interno";
}

export function priorityTone(value: string): "strong" | "brand" | "neutral" {
  if (value === "high") return "strong";
  if (value === "medium") return "brand";
  return "neutral";
}
