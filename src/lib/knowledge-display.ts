import { ui } from "@/i18n";

export function knowledgeTypeLabel(type: string): string {
  return (ui.knowledgeObjectType as Record<string, string>)[type] ?? type;
}

export function knowledgeStatusLabel(status: string): string {
  return (ui.knowledgeStatus as Record<string, string>)[status] ?? status;
}

export function knowledgeTagCategoryLabel(category: string): string {
  return (ui.knowledgeTagCategory as Record<string, string>)[category] ?? category;
}

export const EXPERTISE_CATEGORIES = [
  "capability",
  "methodology",
  "service",
  "case",
  "industry_expertise",
  "result",
] as const;

export type ExpertiseCategory = (typeof EXPERTISE_CATEGORIES)[number];

export function expertiseCategoryLabel(type: ExpertiseCategory): string {
  return ui.efesoKnowledge.categories[type];
}
