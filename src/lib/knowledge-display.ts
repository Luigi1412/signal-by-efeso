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

export const EXPERTISE_SECTIONS = [
  { id: "what_we_do", objectTypes: ["service", "capability"] },
  { id: "problems_we_solve", objectTypes: ["concept"] },
  { id: "how_we_work", objectTypes: ["methodology"] },
  { id: "industries", objectTypes: ["industry_expertise"] },
  { id: "cases_and_results", objectTypes: ["case", "result"] },
  { id: "credentials", objectTypes: ["credential", "testimonial"] },
] as const;

export type ExpertiseSectionId = (typeof EXPERTISE_SECTIONS)[number]["id"];

export function isExpertiseSectionId(value: string): value is ExpertiseSectionId {
  return EXPERTISE_SECTIONS.some((section) => section.id === value);
}

export function matchesExpertiseSection(
  item: { catalogSection: string | null; objectType: string },
  sectionId: string,
): boolean {
  const section = EXPERTISE_SECTIONS.find((row) => row.id === sectionId);
  if (!section) return false;
  if (item.catalogSection) return item.catalogSection === sectionId;
  return section.objectTypes.includes(item.objectType as never);
}
